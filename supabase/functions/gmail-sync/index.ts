import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { handleCors, getCorsHeaders, errorResponse, jsonResponse, Logger, requireEnv } from "../_shared/validation.ts";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const GmailSyncActionSchema = z.object({
  action: z.enum(['sync-labels', 'sync-inbox', 'sync-incremental', 'get-thread', 'setup-watch']),
  account_id: z.string().uuid("account_id must be a valid UUID"),
  query: z.string().max(500).optional(),
  maxResults: z.number().int().min(1).max(200).optional(),
  thread_id: z.string().max(500).optional(),
  topic_name: z.string().max(500).optional(),
});

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size: number; attachmentId?: string };
    parts?: GmailMessagePart[];
  };
}

interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  body?: { data?: string; size: number; attachmentId?: string };
  parts?: GmailMessagePart[];
  headers?: { name: string; value: string }[];
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
  } catch {
    return atob(base64);
  }
}

function extractBody(payload: GmailMessage["payload"]): { text: string; html: string } {
  let text = "";
  let html = "";

  function processPart(part: GmailMessagePart) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      part.parts.forEach(processPart);
    }
  }

  if (payload.body?.data) {
    if (payload.mimeType === "text/html") {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  }

  if (payload.parts) {
    payload.parts.forEach(processPart);
  }

  return { text, html };
}

function extractAttachments(payload: GmailMessage["payload"]): Array<{
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
}> {
  const attachments: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> = [];

  function processPart(part: GmailMessagePart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
      });
    }
    if (part.parts) part.parts.forEach(processPart);
  }

  if (payload.parts) payload.parts.forEach(processPart);
  return attachments;
}

// deno-lint-ignore no-explicit-any
async function ensureValidToken(supabase: any, account: any, log: Logger): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(account.token_expires_at);

  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    return account.access_token;
  }

  log.info("Refreshing Gmail token");
  const GOOGLE_CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = requireEnv("GOOGLE_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("Failed to refresh token");
  const tokens = await response.json();

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from("gmail_accounts").update({
    access_token: tokens.access_token,
    token_expires_at: newExpiresAt,
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
  }).eq("id", account.id);

  return tokens.access_token;
}

// deno-lint-ignore no-explicit-any
async function gmailFetch(accessToken: string, path: string): Promise<any> {
  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${error}`);
  }
  return response.json();
}

// deno-lint-ignore no-explicit-any
async function syncLabels(supabase: any, accountId: string, accessToken: string) {
  const data = await gmailFetch(accessToken, "/labels");

  for (const label of data.labels || []) {
    await supabase.from("email_labels").upsert({
      gmail_account_id: accountId,
      gmail_label_id: label.id,
      name: label.name,
      label_type: label.type === "system" ? "system" : "user",
      color: label.color?.backgroundColor || null,
      message_count: label.messagesTotal || 0,
      unread_count: label.messagesUnread || 0,
    }, { onConflict: "gmail_account_id,gmail_label_id" });
  }
}

// deno-lint-ignore no-explicit-any
async function syncMessages(
  supabase: any,
  accountId: string,
  accessToken: string,
  log: Logger,
  query: string = "",
  maxResults: number = 50
) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set("q", query);

  const listData = await gmailFetch(accessToken, `/messages?${params.toString()}`);
  // deno-lint-ignore no-explicit-any
  const messageIds = (listData.messages || []).map((m: any) => m.id);

  const results = [];

  for (const msgId of messageIds) {
    try {
      const msg: GmailMessage = await gmailFetch(accessToken, `/messages/${msgId}?format=full`);
      const headers = msg.payload.headers;
      const { text, html } = extractBody(msg.payload);
      const attachments = extractAttachments(msg.payload);

      const fromRaw = getHeader(headers, "From");
      const fromMatch = fromRaw.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
      const fromName = fromMatch?.[1]?.trim() || "";
      const fromAddress = fromMatch?.[2]?.trim() || fromRaw;

      const toRaw = getHeader(headers, "To");
      const toAddresses = toRaw.split(",").map(t => t.trim()).filter(Boolean);
      const ccRaw = getHeader(headers, "Cc");
      const ccAddresses = ccRaw ? ccRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

      // Upsert thread
      const { data: thread } = await supabase.from("email_threads").upsert({
        gmail_account_id: accountId,
        gmail_thread_id: msg.threadId,
        subject: getHeader(headers, "Subject"),
        snippet: msg.snippet,
        label_ids: msg.labelIds,
        is_unread: msg.labelIds.includes("UNREAD"),
        is_starred: msg.labelIds.includes("STARRED"),
        is_important: msg.labelIds.includes("IMPORTANT"),
        last_message_at: new Date(parseInt(msg.internalDate)).toISOString(),
      }, { onConflict: "gmail_account_id,gmail_thread_id" }).select().single();

      // Determine direction
      const { data: gmailAccount } = await supabase
        .from("gmail_accounts")
        .select("email_address")
        .eq("id", accountId)
        .single();

      const isOutbound = fromAddress.toLowerCase() === gmailAccount?.email_address?.toLowerCase();

      // Upsert message
      const { data: emailMsg } = await supabase.from("email_messages").upsert({
        thread_id: thread?.id,
        gmail_message_id: msg.id,
        gmail_account_id: accountId,
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: toAddresses,
        cc_addresses: ccAddresses,
        reply_to_address: getHeader(headers, "Reply-To") || null,
        subject: getHeader(headers, "Subject"),
        body_text: text,
        body_html: html,
        snippet: msg.snippet,
        label_ids: msg.labelIds,
        is_read: !msg.labelIds.includes("UNREAD"),
        is_starred: msg.labelIds.includes("STARRED"),
        has_attachments: attachments.length > 0,
        in_reply_to: getHeader(headers, "In-Reply-To") || null,
        references_header: getHeader(headers, "References") || null,
        internal_date: new Date(parseInt(msg.internalDate)).toISOString(),
        direction: isOutbound ? "outbound" : "inbound",
      }, { onConflict: "gmail_message_id" }).select().single();

      // Save attachment metadata
      if (emailMsg && attachments.length > 0) {
        for (const att of attachments) {
          await supabase.from("email_attachments").upsert({
            email_message_id: emailMsg.id,
            gmail_attachment_id: att.attachmentId,
            filename: att.filename,
            mime_type: att.mimeType,
            size_bytes: att.size,
          }, { onConflict: "email_message_id" }).select();
        }
      }

      // Try to link to existing contact by email
      if (thread && !thread.contact_id) {
        const contactEmail = isOutbound ? toAddresses[0] : fromAddress;
        if (contactEmail) {
          const cleanEmail = contactEmail.replace(/<|>/g, "").trim().toLowerCase();
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .ilike("email", cleanEmail)
            .maybeSingle();

          if (contact) {
            await supabase.from("email_threads")
              .update({ contact_id: contact.id })
              .eq("id", thread.id);
          }
        }
      }

      // Update thread message count
      if (thread) {
        const { count } = await supabase
          .from("email_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id);

        await supabase.from("email_threads")
          .update({ message_count: count || 0 })
          .eq("id", thread.id);
      }

      results.push({ id: msg.id, threadId: msg.threadId, subject: getHeader(headers, "Subject") });
    } catch (err: unknown) {
      log.error(`Error syncing message ${msgId}`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { synced: results.length, messages: results, nextPageToken: listData.nextPageToken };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const log = new Logger("gmail-sync");

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      log.done(401);
      return errorResponse("Unauthorized", 401, req);
    }

    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const rawBody = await req.json();
    const parsed = GmailSyncActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const msg = Object.entries(errors.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ');
      log.warn("Validation failed", { errors: msg });
      log.done(400);
      return errorResponse(msg || "Invalid request", 400, req);
    }

    const body = parsed.data;
    log.info("Processing action", { action: body.action, accountId: body.account_id });

    // Get gmail account
    const { data: account } = await supabase
      .from("gmail_accounts")
      .select("*")
      .eq("id", body.account_id)
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (!account) throw new Error("Gmail account not found or inactive");

    const accessToken = await ensureValidToken(supabase, account, log);

    switch (body.action) {
      case "sync-labels": {
        await syncLabels(supabase, account.id, accessToken);
        log.done(200);
        return jsonResponse({ success: true }, 200, req);
      }

      case "sync-inbox": {
        await supabase.from("gmail_accounts").update({ sync_status: "syncing" }).eq("id", account.id);

        try {
          const result = await syncMessages(supabase, account.id, accessToken, log, body.query || "in:inbox", body.maxResults || 50);
          const profileData = await gmailFetch(accessToken, "/profile");

          await supabase.from("gmail_accounts").update({
            sync_status: "synced",
            history_id: profileData.historyId,
            last_sync_at: new Date().toISOString(),
            last_error: null,
          }).eq("id", account.id);

          log.done(200, { synced: result.synced });
          return jsonResponse({ success: true, ...result }, 200, req);
        } catch (err: unknown) {
          await supabase.from("gmail_accounts").update({
            sync_status: "error",
            last_error: err instanceof Error ? err.message : String(err),
          }).eq("id", account.id);
          throw err;
        }
      }

      case "sync-incremental": {
        if (!account.history_id) {
          log.done(400);
          return errorResponse("No history_id. Run full sync first.", 400, req);
        }

        const historyData = await gmailFetch(
          accessToken,
          `/history?startHistoryId=${account.history_id}&historyTypes=messageAdded&historyTypes=messageDeleted&historyTypes=labelAdded&historyTypes=labelRemoved`
        );

        const newMessageIds = new Set<string>();
        for (const record of historyData.history || []) {
          for (const added of record.messagesAdded || []) {
            newMessageIds.add(added.message.id);
          }
        }

        let synced = 0;
        for (const msgId of newMessageIds) {
          try {
            await gmailFetch(accessToken, `/messages/${msgId}?format=full`);
            synced++;
          } catch {
            // Message may have been deleted
          }
        }

        await supabase.from("gmail_accounts").update({
          history_id: historyData.historyId || account.history_id,
          last_sync_at: new Date().toISOString(),
        }).eq("id", account.id);

        log.done(200, { newMessages: newMessageIds.size });
        return jsonResponse({ success: true, new_messages: newMessageIds.size }, 200, req);
      }

      case "get-thread": {
        if (!body.thread_id) throw new Error("Missing thread_id");
        const threadData = await gmailFetch(accessToken, `/threads/${body.thread_id}?format=full`);
        log.done(200);
        return jsonResponse(threadData, 200, req);
      }

      case "setup-watch": {
        if (!body.topic_name) throw new Error("Missing topic_name");

        const response = await fetch(`${GMAIL_API}/watch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topicName: body.topic_name, labelIds: ["INBOX"] }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Watch setup failed: ${error}`);
        }

        const watchData = await response.json();

        await supabase.from("gmail_accounts").update({
          history_id: watchData.historyId,
          watch_expiration: new Date(parseInt(watchData.expiration)).toISOString(),
        }).eq("id", account.id);

        log.done(200);
        return jsonResponse({ success: true, ...watchData }, 200, req);
      }

      default:
        log.done(400);
        return errorResponse(`Unknown action: ${body.action}`, 400, req);
    }
  } catch (error) {
    log.error("Gmail Sync error", { error: error instanceof Error ? error.message : String(error) });
    log.done(500);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500, req);
  }
});
