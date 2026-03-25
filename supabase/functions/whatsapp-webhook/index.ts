import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { checkIdempotency, completeIdempotency, failIdempotency, generateIdempotencyKey } from '../_shared/idempotency.ts';
import { enqueueToDeadLetter } from '../_shared/deadLetterQueue.ts';

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
    return new Response(null, { headers: getCorsHeaders(req) });
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
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const payload: WhatsAppWebhookPayload = await req.json();
      logger.info('Webhook payload received', { entries: payload.entry?.length ?? 0 });

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

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
});
