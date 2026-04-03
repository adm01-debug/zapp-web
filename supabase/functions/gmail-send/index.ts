import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, errorResponse, jsonResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function encodeBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Sanitize a header value to prevent MIME header injection via \r\n */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

/** Sanitize filename for MIME Content-Disposition */
function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n"]/g, "").replace(/[^\x20-\x7E]/g, "_").trim() || "attachment";
}

/** Validate email address format */
function isValidEmail(email: string): boolean {
  const cleaned = email.replace(/.*</, "").replace(/>.*/, "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}

/** Validate Gmail message ID format */
function isValidGmailId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

const MAX_RECIPIENTS = 100;
const MAX_ATTACHMENTS = 25;
const MAX_ATTACHMENT_TOTAL_SIZE = 35 * 1024 * 1024; // 35MB

function buildMimeMessage(options: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{ filename: string; mimeType: string; content: string }>;
}): string {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const hasAttachments = options.attachments && options.attachments.length > 0;
  const hasHtml = !!options.htmlBody;

  const headers = [
    `From: ${sanitizeHeaderValue(options.from)}`,
    `To: ${options.to.map(sanitizeHeaderValue).join(", ")}`,
  ];

  if (options.cc?.length) headers.push(`Cc: ${options.cc.map(sanitizeHeaderValue).join(", ")}`);
  if (options.bcc?.length) headers.push(`Bcc: ${options.bcc.map(sanitizeHeaderValue).join(", ")}`);
  headers.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`);
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push("MIME-Version: 1.0");

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }
  if (options.references) {
    headers.push(`References: ${options.references}`);
  }

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

    let body = headers.join("\r\n") + "\r\n\r\n";
    body += `--${boundary}\r\n`;

    if (hasHtml) {
      const altBoundary = `alt_${crypto.randomUUID().replace(/-/g, "")}`;
      body += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;

      if (options.textBody) {
        body += `--${altBoundary}\r\n`;
        body += "Content-Type: text/plain; charset=UTF-8\r\n";
        body += "Content-Transfer-Encoding: base64\r\n\r\n";
        body += btoa(unescape(encodeURIComponent(options.textBody))) + "\r\n";
      }

      body += `--${altBoundary}\r\n`;
      body += "Content-Type: text/html; charset=UTF-8\r\n";
      body += "Content-Transfer-Encoding: base64\r\n\r\n";
      body += btoa(unescape(encodeURIComponent(options.htmlBody!))) + "\r\n";
      body += `--${altBoundary}--\r\n`;
    } else {
      body += "Content-Type: text/plain; charset=UTF-8\r\n";
      body += "Content-Transfer-Encoding: base64\r\n\r\n";
      body += btoa(unescape(encodeURIComponent(options.textBody || ""))) + "\r\n";
    }

    for (const att of options.attachments!) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: ${sanitizeHeaderValue(att.mimeType)}; name="${sanitizeFilename(att.filename)}"\r\n`;
      body += `Content-Disposition: attachment; filename="${sanitizeFilename(att.filename)}"\r\n`;
      body += "Content-Transfer-Encoding: base64\r\n\r\n";
      body += att.content + "\r\n";
    }

    body += `--${boundary}--`;
    return body;
  } else if (hasHtml) {
    const altBoundary = `alt_${crypto.randomUUID().replace(/-/g, "")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);

    let body = headers.join("\r\n") + "\r\n\r\n";

    if (options.textBody) {
      body += `--${altBoundary}\r\n`;
      body += "Content-Type: text/plain; charset=UTF-8\r\n";
      body += "Content-Transfer-Encoding: base64\r\n\r\n";
      body += btoa(unescape(encodeURIComponent(options.textBody))) + "\r\n";
    }

    body += `--${altBoundary}\r\n`;
    body += "Content-Type: text/html; charset=UTF-8\r\n";
    body += "Content-Transfer-Encoding: base64\r\n\r\n";
    body += btoa(unescape(encodeURIComponent(options.htmlBody!))) + "\r\n";
    body += `--${altBoundary}--`;

    return body;
  } else {
    headers.push("Content-Type: text/plain; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: base64");
    return headers.join("\r\n") + "\r\n\r\n" + btoa(unescape(encodeURIComponent(options.textBody || "")));
  }
}

async function ensureValidToken(supabase: any, account: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(account.token_expires_at);

  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    return account.access_token;
  }

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

  await supabase.from("gmail_accounts").update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq("id", account.id);

  return tokens.access_token;
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
      case "send": {
        const { to, cc, bcc, subject, text_body, html_body, attachments } = body;
        if (!to || !subject) throw new Error("Missing required fields: to, subject");

        // Validate recipients
        const allRecipients = [
          ...(Array.isArray(to) ? to : [to]),
          ...(cc || []),
          ...(bcc || []),
        ];
        if (allRecipients.length > MAX_RECIPIENTS) {
          throw new Error(`Too many recipients (max ${MAX_RECIPIENTS})`);
        }
        for (const email of allRecipients) {
          if (!isValidEmail(email)) throw new Error(`Invalid email address: ${email}`);
        }

        // Validate attachments
        if (attachments?.length > MAX_ATTACHMENTS) {
          throw new Error(`Too many attachments (max ${MAX_ATTACHMENTS})`);
        }

        const raw = buildMimeMessage({
          from: account.email_address,
          to: Array.isArray(to) ? to : [to],
          cc: cc || [],
          bcc: bcc || [],
          subject,
          textBody: text_body,
          htmlBody: html_body,
          attachments,
        });

        const response = await fetch(`${GMAIL_API}/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodeBase64Url(raw) }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send email: ${error}`);
        }

        const sentMessage = await response.json();

        // Save to email_messages
        await supabase.from("email_messages").insert({
          gmail_message_id: sentMessage.id,
          gmail_account_id: account.id,
          thread_id: null, // Will be linked on next sync
          from_address: account.email_address,
          to_addresses: Array.isArray(to) ? to : [to],
          cc_addresses: cc || [],
          bcc_addresses: bcc || [],
          subject,
          body_text: text_body || "",
          body_html: html_body || "",
          direction: "outbound",
          is_read: true,
          internal_date: new Date().toISOString(),
        });

        return new Response(JSON.stringify({
          success: true,
          message_id: sentMessage.id,
          thread_id: sentMessage.threadId,
        }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "reply": {
        const { thread_id, message_id, to, cc, bcc, subject, text_body, html_body, attachments } = body;
        if (!thread_id || !to) throw new Error("Missing required fields: thread_id, to");

        // Get original message for threading headers
        const { data: originalMsg } = await supabase
          .from("email_messages")
          .select("gmail_message_id, subject, from_address, references_header")
          .eq("gmail_message_id", message_id)
          .single();

        const replySubject = subject || (originalMsg?.subject?.startsWith("Re:") ? originalMsg.subject : `Re: ${originalMsg?.subject || ""}`);
        const inReplyTo = `<${message_id}>`;
        const references = originalMsg?.references_header
          ? `${originalMsg.references_header} <${message_id}>`
          : `<${message_id}>`;

        const raw = buildMimeMessage({
          from: account.email_address,
          to: Array.isArray(to) ? to : [to],
          cc: cc || [],
          bcc: bcc || [],
          subject: replySubject,
          textBody: text_body,
          htmlBody: html_body,
          inReplyTo,
          references,
          attachments,
        });

        const response = await fetch(`${GMAIL_API}/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: encodeBase64Url(raw),
            threadId: thread_id,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send reply: ${error}`);
        }

        const sentMessage = await response.json();

        // Save reply to local DB (was missing — inconsistent with send action)
        await supabase.from("email_messages").insert({
          gmail_message_id: sentMessage.id,
          gmail_account_id: account.id,
          thread_id: null, // Will be linked on next sync
          from_address: account.email_address,
          to_addresses: Array.isArray(to) ? to : [to],
          cc_addresses: cc || [],
          subject: replySubject,
          body_text: text_body || "",
          direction: "outbound",
          is_read: true,
          internal_date: new Date().toISOString(),
        }).then(() => {}).catch((err: any) => console.warn("Failed to save reply locally:", err.message));

        return new Response(JSON.stringify({
          success: true,
          message_id: sentMessage.id,
          thread_id: sentMessage.threadId,
        }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "create-draft": {
        const { to, cc, bcc, subject, text_body, html_body, thread_id } = body;

        const raw = buildMimeMessage({
          from: account.email_address,
          to: Array.isArray(to) ? to : [to || ""],
          cc: cc || [],
          bcc: bcc || [],
          subject: subject || "",
          textBody: text_body,
          htmlBody: html_body,
        });

        const draftBody: any = { message: { raw: encodeBase64Url(raw) } };
        if (thread_id) draftBody.message.threadId = thread_id;

        const response = await fetch(`${GMAIL_API}/drafts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draftBody),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to create draft: ${error}`);
        }

        const draft = await response.json();

        return new Response(JSON.stringify({
          success: true,
          draft_id: draft.id,
          message_id: draft.message?.id,
        }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "modify-labels": {
        const { message_id: gmailMsgId, add_labels, remove_labels } = body;
        if (!gmailMsgId) throw new Error("Missing message_id");
        if (!isValidGmailId(gmailMsgId)) throw new Error("Invalid message_id format");

        const response = await fetch(`${GMAIL_API}/messages/${gmailMsgId}/modify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            addLabelIds: add_labels || [],
            removeLabelIds: remove_labels || [],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to modify labels: ${error}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "mark-read": {
        const { message_ids } = body;
        if (!message_ids?.length) throw new Error("Missing message_ids");

        // Validate message ID format to prevent path traversal
        for (const msgId of message_ids) {
          if (!isValidGmailId(msgId)) throw new Error(`Invalid message ID format: ${msgId}`);
        }

        for (const msgId of message_ids) {
          await fetch(`${GMAIL_API}/messages/${msgId}/modify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
          });
        }

        // Update local DB — scoped to this account to prevent cross-user modification
        await supabase.from("email_messages")
          .update({ is_read: true })
          .eq("gmail_account_id", account.id)
          .in("gmail_message_id", message_ids);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "trash": {
        const { message_id: trashMsgId } = body;
        if (!trashMsgId) throw new Error("Missing message_id");
        if (!isValidGmailId(trashMsgId)) throw new Error("Invalid message_id format");

        const response = await fetch(`${GMAIL_API}/messages/${trashMsgId}/trash`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) throw new Error("Failed to trash message");

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Gmail Send error:", msg);
    const safeMsg = msg.includes("Missing") || msg.includes("Invalid") || msg.includes("Too many")
      ? msg
      : "Failed to process email operation";
    return new Response(JSON.stringify({ error: safeMsg }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
