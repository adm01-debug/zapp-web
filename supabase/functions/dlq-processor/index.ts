/**
 * Dead Letter Queue Processor
 * Processes failed operations from the DLQ with exponential backoff.
 * Designed to be invoked by pg_cron or an external scheduler every 5 minutes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { unauthorized, serverError } from '../_shared/errorResponse.ts';
import { processDeadLetterQueue } from '../_shared/deadLetterQueue.ts';
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';

const logger = createStructuredLogger('dlq-processor');

/**
 * Registry of retry handlers per source function.
 * Each handler knows how to re-process a failed payload from that function.
 */
function getRetryHandler(
  sourceFunction: string,
  supabase: ReturnType<typeof createClient>
): ((payload: Record<string, unknown>, eventType?: string) => Promise<void>) | null {
  switch (sourceFunction) {
    case 'send-email':
      return async (payload) => {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
        const response = await fetchWithRetry('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
          maxRetries: 2,
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }
      };

    case 'sentiment-alert':
      return async (payload) => {
        // Re-invoke the sentiment-alert function
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase credentials");
        const response = await fetch(`${supabaseUrl}/functions/v1/sentiment-alert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`sentiment-alert retry failed: ${response.status}`);
        }
      };

    case 'evolution-webhook':
      return async (payload) => {
        // Re-invoke the webhook handler
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase credentials");
        const response = await fetch(`${supabaseUrl}/functions/v1/evolution-webhook`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('EVOLUTION_API_KEY') || '',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`evolution-webhook retry failed: ${response.status}`);
        }
      };

    default:
      // Generic handler: log and mark as resolved
      return async (payload, eventType) => {
        logger.warn('No specific retry handler for source function', {
          sourceFunction,
          eventType,
          payloadKeys: Object.keys(payload),
        });
        // Mark as resolved since we can't retry unknown functions
      };
  }
}

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'dlq-processor', getCorsHeaders(req));
  }

  // This function should only be called by cron/scheduler with service role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader?.includes(serviceKey || '__never_match__')) {
    return unauthorized('Unauthorized', getCorsHeaders(req));
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get distinct source functions with pending items
    const { data: sources } = await supabase
      .from('dead_letter_queue')
      .select('source_function')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', new Date().toISOString())
      .limit(50);

    if (!sources || sources.length === 0) {
      logger.info('No pending DLQ items');
      requestTimer.end({ status: 'empty' });
      return new Response(JSON.stringify({ processed: 0, message: 'No pending items' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const uniqueSources = [...new Set(sources.map(s => s.source_function))];
    logger.info('Processing DLQ for sources', { sources: uniqueSources });

    const results: Record<string, { processed: number; failed: number; resolved: number }> = {};

    for (const source of uniqueSources) {
      const handler = getRetryHandler(source, supabase);
      if (handler) {
        results[source] = await processDeadLetterQueue(supabase, source, handler);
      }
    }

    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalResolved = Object.values(results).reduce((sum, r) => sum + r.resolved, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

    logger.info('DLQ processing complete', { totalProcessed, totalResolved, totalFailed, results });
    requestTimer.end({ status: 'success', totalProcessed, totalResolved, totalFailed });

    return new Response(JSON.stringify({
      processed: totalProcessed,
      resolved: totalResolved,
      failed: totalFailed,
      details: results,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('DLQ processor error', { error: errorMessage });
    requestTimer.end({ error: true });
    return serverError('DLQ processor error', getCorsHeaders(req));
  }
});
