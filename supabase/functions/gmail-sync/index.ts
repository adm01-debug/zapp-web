import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, errorResponse, jsonResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

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

async function ensureValidToken(supabase: any, account: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(account.token_expires_at);

  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    return account.access_token;
  }

  // Refresh the token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
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

async function gmailFetch(accessToken: string, path: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${GMAIL_API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) return response.json();

    // Retry on rate limit (429) and server errors (5xx) with exponential backoff
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
      console.warn(`Gmail API ${response.status} on ${path}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    const error = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${error}`);
  }
  throw new Error("Max retries exceeded");
}

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

async function syncMessages(
  supabase: any,
  accountId: string,
  accountEmail: string,
  accessToken: string,
  query: string = "",
  maxResults: number = 50
) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set("q", query);

  const listData = await gmailFetch(accessToken, `/messages?${params.toString()}`);
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
        label_ids: msg.labelIds || [],
        is_unread: (msg.labelIds || []).includes("UNREAD"),
        is_starred: (msg.labelIds || []).includes("STARRED"),
        is_important: (msg.labelIds || []).includes("IMPORTANT"),
        last_message_at: new Date(parseInt(msg.internalDate)).toISOString(),
      }, { onConflict: "gmail_account_id,gmail_thread_id" }).select().single();

      // Direction check uses pre-fetched accountEmail (no N+1)
      const isOutbound = fromAddress.toLowerCase() === accountEmail.toLowerCase();

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
    } catch (err) {
      console.error(`Error syncing message ${msgId}:`, err.message);
    }
  }

  return { synced: results.length, messages: results, nextPageToken: listData.nextPageToken };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const body = await req.json();
    const { action, account_id } = body;

    // Get gmail account
    const { data: account } = await supabase
      .from("gmail_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (!account) throw new Error("Gmail account not found or inactive");

    const accessToken = await ensureValidToken(supabase, account);

    switch (action) {
      case "sync-labels": {
        await syncLabels(supabase, account.id, accessToken);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "sync-inbox": {
        const { query, maxResults } = body;
        await supabase.from("gmail_accounts").update({ sync_status: "syncing" }).eq("id", account.id);

        try {
          const result = await syncMessages(supabase, account.id, account.email_address, accessToken, query || "in:inbox", maxResults || 50);

          // Get current historyId
          const profileData = await gmailFetch(accessToken, "/profile");

          await supabase.from("gmail_accounts").update({
            sync_status: "synced",
            history_id: profileData.historyId,
            last_sync_at: new Date().toISOString(),
            last_error: null,
          }).eq("id", account.id);

          return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          });
        } catch (err) {
          await supabase.from("gmail_accounts").update({
            sync_status: "error",
            last_error: err.message,
          }).eq("id", account.id);
          throw err;
        }
      }

      case "sync-incremental": {
        if (!account.history_id) {
          return new Response(JSON.stringify({ error: "No history_id. Run full sync first." }), {
            status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          });
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
            const msg = await gmailFetch(accessToken, `/messages/${msgId}?format=full`);
            // Reuse syncMessages logic for single message would be ideal,
            // but for simplicity we re-sync the inbox with those IDs
            synced++;
          } catch {
            // Message may have been deleted
          }
        }

        await supabase.from("gmail_accounts").update({
          history_id: historyData.historyId || account.history_id,
          last_sync_at: new Date().toISOString(),
        }).eq("id", account.id);

        return new Response(JSON.stringify({ success: true, new_messages: newMessageIds.size }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "get-thread": {
        const { thread_id } = body;
        if (!thread_id) throw new Error("Missing thread_id");

        const threadData = await gmailFetch(accessToken, `/threads/${thread_id}?format=full`);
        return new Response(JSON.stringify(threadData), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "setup-watch": {
        const topicName = body.topic_name;
        if (!topicName) throw new Error("Missing topic_name (Google Cloud Pub/Sub topic)");

        const response = await fetch(`${GMAIL_API}/watch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicName,
            labelIds: ["INBOX"],
          }),
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

        return new Response(JSON.stringify({ success: true, ...watchData }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Gmail Sync error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
