import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { serverError } from '../_shared/errorResponse.ts';
import { checkIdempotency, completeIdempotency, failIdempotency, generateIdempotencyKey } from '../_shared/idempotency.ts';
import { enqueueToDeadLetter } from '../_shared/deadLetterQueue.ts';
import { ValidationError, validationErrorResponse } from '../_shared/validation.ts';

interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{ code: number; title: string }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: WhatsAppStatus[];
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

const logger = createStructuredLogger('whatsapp-webhook');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'whatsapp-webhook', getCorsHeaders(req));
  }

  // Handle webhook verification (GET request from WhatsApp)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    if (!verifyToken) {
      logger.error('WHATSAPP_VERIFY_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook verification not configured' }),
        { status: 503, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Webhook verified successfully');
      requestTimer.end({ verification: 'success' });
      return new Response(challenge, {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'text/plain' }
      });
    }

    logger.warn('Webhook verification failed', { mode });
    return new Response('Forbidden', { status: 403, headers: getCorsHeaders(req) });
  }

  // Handle webhook events (POST request)
  if (req.method === 'POST') {
    let idempotencyKey: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      supabase = createClient(supabaseUrl, supabaseServiceKey);

      const payload: WhatsAppWebhookPayload = await req.json();

      // Validate webhook payload structure
      if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Invalid webhook payload: expected object');
      }
      if (!Array.isArray(payload.entry)) {
        throw new ValidationError('Invalid webhook payload: missing entry array');
      }

      logger.info('Webhook payload received', { entries: payload.entry.length });

      // Generate idempotency key from message IDs or status IDs in the payload
      const keyParts: string[] = [];
      for (const entry of payload.entry || []) {
        keyParts.push(entry.id);
        for (const change of entry.changes || []) {
          for (const status of change.value.statuses || []) {
            keyParts.push(status.id, status.status);
          }
          for (const message of change.value.messages || []) {
            keyParts.push(message.id);
          }
        }
      }
      idempotencyKey = await generateIdempotencyKey(...keyParts);

      const { isDuplicate, cachedResponse } = await checkIdempotency(supabase, idempotencyKey, 'whatsapp-webhook');
      if (isDuplicate && cachedResponse) {
        logger.info('Duplicate WhatsApp webhook detected, returning cached response');
        return new Response(JSON.stringify(cachedResponse.body), {
          status: cachedResponse.status,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      // Process status updates
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Handle status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              logger.info('Processing status update', { messageId: status.id, status: status.status });

              const { error } = await supabase
                .from('messages')
                .update({
                  status: status.status,
                  status_updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString(),
                })
                .eq('external_id', status.id);

              if (error) {
                logger.error('Error updating message status', { messageId: status.id, error: error.message });
              } else {
                logger.info('Status updated', { messageId: status.id });
              }
            }
          }

          // Handle incoming messages (optional - can be extended)
          if (value.messages) {
            for (const message of value.messages) {
              logger.info('Message received', { from: message.from, type: message.type });
              // Messages can be processed here if needed
            }
          }
        }
      }

      const responseBody = { success: true };
      if (supabase && idempotencyKey) {
        await completeIdempotency(supabase, idempotencyKey, 200, responseBody);
      }

      requestTimer.end({ status: 'success' });
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Webhook validation failed', { error: error.message });
        return validationErrorResponse(error, getCorsHeaders(req));
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack || '' : '';
      logger.error('Webhook processing error', { error: errorMsg });
      requestTimer.end({ error: true });

      // Mark idempotency as failed so it can be retried
      if (supabase && idempotencyKey) {
        await failIdempotency(supabase, idempotencyKey);
      }

      // Enqueue to dead letter queue for retry
      if (supabase) {
        try {
          await enqueueToDeadLetter(supabase, {
            sourceFunction: 'whatsapp-webhook',
            payload: { error: errorMsg },
            errorMessage: errorMsg,
            errorStack: errorStack,
          });
        } catch (dlqError) {
          logger.error('Failed to enqueue to DLQ', { error: String(dlqError) });
        }
      }

      return serverError('Internal server error', getCorsHeaders(req));
    }
  }

  return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
});
