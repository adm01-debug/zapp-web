import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { checkIdempotency, completeIdempotency, failIdempotency, generateIdempotencyKey } from '../_shared/idempotency.ts';
import { enqueueToDeadLetter } from '../_shared/deadLetterQueue.ts';
import { validateEmail, validateRequired, validateStringLength, ValidationError, validationErrorResponse } from '../_shared/validation.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const logger = createStructuredLogger('send-email');

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
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
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

  // Verify JWT authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    logger.warn('Authentication failed', { error: authError });
    return new Response(JSON.stringify({ error: authError || 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let idempotencyKey: string | null = null;

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body: EmailRequest = await req.json();

    // Input validation
    try {
      validateRequired(body as unknown as Record<string, unknown>, ['to', 'subject']);
      const toAddress = Array.isArray(body.to) ? body.to[0] : body.to;
      if (toAddress) {
        validateEmail(toAddress, 'to');
      }
      validateStringLength(body.subject, 'subject', 1, 200);
      if (!body.html && !body.text) {
        throw new ValidationError('Missing required fields: html or text (at least one must be provided)');
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        return validationErrorResponse(e, getCorsHeaders(req));
      }
      throw e;
    }

    // Generate idempotency key from recipient + subject + timestamp (truncated to minute)
    const recipient = Array.isArray(body.to) ? body.to.sort().join(',') : body.to;
    const minuteTimestamp = new Date().toISOString().slice(0, 16); // truncate to minute
    idempotencyKey = await generateIdempotencyKey(recipient, body.subject, minuteTimestamp);

    const { isDuplicate, cachedResponse } = await checkIdempotency(supabase, idempotencyKey, 'send-email');
    if (isDuplicate && cachedResponse) {
      logger.info('Duplicate email request detected, returning cached response');
      return new Response(JSON.stringify(cachedResponse.body), {
        status: cachedResponse.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
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
      logger.error("Resend API error", { status: response.status, data });

      // Enqueue failed email to DLQ for retry
      await enqueueToDeadLetter(supabase, {
        sourceFunction: 'send-email',
        eventType: 'send_email',
        payload: { to: body.to, subject: body.subject, html: body.html, text: body.text },
        errorMessage: `Resend API error: ${response.status}`,
        errorStack: JSON.stringify(data),
      });

      if (idempotencyKey) {
        await failIdempotency(supabase, idempotencyKey);
      }

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: response.status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const responseBody = { success: true, id: data.id };
    if (idempotencyKey) {
      await completeIdempotency(supabase, idempotencyKey, 200, responseBody);
    }

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Error sending email", { error: error instanceof Error ? error.message : String(error) });

    // Mark idempotency as failed
    if (idempotencyKey) {
      await failIdempotency(supabase, idempotencyKey);
    }

    // Enqueue to DLQ for retry
    try {
      await enqueueToDeadLetter(supabase, {
        sourceFunction: 'send-email',
        eventType: 'send_email',
        payload: { error: error.message },
        errorMessage: error.message,
        errorStack: error.stack || '',
      });
    } catch (dlqError) {
      logger.error('Failed to enqueue to DLQ', { error: dlqError instanceof Error ? dlqError.message : String(dlqError) });
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
