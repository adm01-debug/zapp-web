import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64
    content_type?: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'send-email', getCorsHeaders(req));
  }

  // Rate limit: 10 email requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`send-email:${clientIP}`, { maxRequests: 10, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body: EmailRequest = await req.json();

    if (!body.to || !body.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      from: body.from || "ZAPP System <noreply@zapp.com>",
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject: body.subject,
    };

    if (body.html) payload.html = body.html;
    if (body.text) payload.text = body.text;
    if (body.reply_to) payload.reply_to = body.reply_to;
    if (body.cc) payload.cc = body.cc;
    if (body.bcc) payload.bcc = body.bcc;
    if (body.attachments) payload.attachments = body.attachments;

    const response = await fetchWithRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
      maxRetries: 3,
      circuitBreakerService: 'resend',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: response.status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
