import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { errorResponse, serverError } from '../_shared/errorResponse.ts';
import { getCircuitBreakerState, CircuitState } from '../_shared/circuitBreaker.ts';
import { requireEnv, SUPABASE_ENV, EVOLUTION_ENV } from '../_shared/envValidator.ts';

requireEnv({ required: [...SUPABASE_ENV.required, ...EVOLUTION_ENV.required] });

// ============================================================
// CAMPAIGN WORKER — Processes scheduled campaigns via Evolution API
// ============================================================
// This is a cron/scheduler function (no JWT required).
// It picks up campaigns with status='scheduled' whose scheduled_at <= now(),
// sends messages to each campaign contact via Evolution API,
// and tracks sent/failed counts.
// ============================================================

const logger = createStructuredLogger('campaign-worker');

/** Max messages per second per WhatsApp connection to avoid rate limits. */
const MAX_MESSAGES_PER_SECOND = 20;

/** Batch size when fetching campaign contacts to avoid loading everything at once. */
const CONTACT_BATCH_SIZE = 500;

/** Circuit breaker service name for Evolution API calls. */
const CIRCUIT_BREAKER_SERVICE = 'campaign-worker-evolution';

/**
 * Sleep helper for rate limiting between messages.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a single message via the Evolution API directly.
 * Returns true on success, or an error message string on failure.
 */
async function sendMessageViaEvolutionApi(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phone: string,
  messageContent: string,
  messageType: string,
  mediaUrl: string | null,
): Promise<{ success: boolean; error?: string; externalId?: string }> {
  try {
    let endpoint: string;
    let body: Record<string, unknown>;

    if (messageType === 'media' && mediaUrl) {
      endpoint = `/message/sendMedia/${instanceName}`;
      body = {
        number: phone,
        mediatype: 'image',
        media: mediaUrl,
        caption: messageContent,
      };
    } else {
      endpoint = `/message/sendText/${instanceName}`;
      body = {
        number: phone,
        text: messageContent,
      };
    }

    const fullUrl = `${evolutionApiUrl}${endpoint}`;

    const response = await fetchWithRetry(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify(body),
      timeout: 30000,
      maxRetries: 2,
      circuitBreakerService: CIRCUIT_BREAKER_SERVICE,
      circuitBreakerOptions: {
        failureThreshold: 10,
        resetTimeout: 30000,
        halfOpenMaxAttempts: 3,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}`;
      return { success: false, error: errorMsg };
    }

    // Evolution API returns a key object with the message ID
    const externalId = data?.key?.id || data?.messageId || null;
    return { success: true, externalId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Process a single campaign: send messages to all pending contacts.
 */
async function processCampaign(
  campaign: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  evolutionApiUrl: string,
  evolutionApiKey: string,
): Promise<void> {
  const campaignId = campaign.id as string;
  const campaignName = campaign.name as string;
  const messageContent = campaign.message_content as string;
  const messageType = (campaign.message_type as string) || 'text';
  const mediaUrl = campaign.media_url as string | null;
  const connectionId = campaign.whatsapp_connection_id as string | null;

  const campaignTimer = logger.startTimer(`campaign-${campaignId}`);

  logger.info('Processing campaign', {
    campaignId,
    campaignName,
    messageType,
    connectionId,
  });

  // --- Resolve the WhatsApp instance name from the connection ---
  if (!connectionId) {
    logger.error('Campaign has no whatsapp_connection_id', { campaignId });
    await supabase
      .from('campaigns')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    return;
  }

  const { data: connection, error: connError } = await supabase
    .from('whatsapp_connections')
    .select('instance_id, status')
    .eq('id', connectionId)
    .single();

  if (connError || !connection) {
    logger.error('Failed to fetch WhatsApp connection', {
      campaignId,
      connectionId,
      error: connError?.message,
    });
    await supabase
      .from('campaigns')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    return;
  }

  const instanceName = connection.instance_id;
  if (!instanceName) {
    logger.error('WhatsApp connection has no instance_id', {
      campaignId,
      connectionId,
    });
    await supabase
      .from('campaigns')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    return;
  }

  if (connection.status !== 'connected') {
    logger.error('WhatsApp connection is not connected', {
      campaignId,
      connectionId,
      connectionStatus: connection.status,
    });
    await supabase
      .from('campaigns')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    return;
  }

  // --- Mark campaign as sending ---
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'sending',
      started_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (updateError) {
    logger.error('Failed to update campaign status to sending', {
      campaignId,
      error: updateError.message,
    });
    return;
  }

  // --- Fetch and process contacts in batches ---
  let sentCount = 0;
  let failedCount = 0;
  let offset = 0;
  let hasMore = true;
  let messagesSentThisSecond = 0;
  let secondStart = Date.now();

  while (hasMore) {
    // Check circuit breaker state before fetching next batch
    const cbState = getCircuitBreakerState(CIRCUIT_BREAKER_SERVICE);
    if (cbState.state === CircuitState.OPEN) {
      logger.warn('Circuit breaker is OPEN, pausing campaign', {
        campaignId,
        sentCount,
        failedCount,
      });
      // Wait for the reset timeout before continuing
      await sleep(30000);
      // Re-check; if still open, fail the campaign
      const cbStateRetry = getCircuitBreakerState(CIRCUIT_BREAKER_SERVICE);
      if (cbStateRetry.state === CircuitState.OPEN) {
        logger.error('Circuit breaker still OPEN after wait, failing campaign', {
          campaignId,
        });
        break;
      }
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('campaign_contacts')
      .select('id, contact_id, contacts(phone, name)')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + CONTACT_BATCH_SIZE - 1);

    if (contactsError) {
      logger.error('Failed to fetch campaign contacts', {
        campaignId,
        offset,
        error: contactsError.message,
      });
      break;
    }

    if (!contacts || contacts.length === 0) {
      hasMore = false;
      break;
    }

    logger.info('Processing contact batch', {
      campaignId,
      batchSize: contacts.length,
      offset,
      sentSoFar: sentCount,
      failedSoFar: failedCount,
    });

    for (const campaignContact of contacts) {
      // Rate limiting: max N messages per second per connection
      const now = Date.now();
      if (now - secondStart >= 1000) {
        // Reset counter for new second
        messagesSentThisSecond = 0;
        secondStart = now;
      }

      if (messagesSentThisSecond >= MAX_MESSAGES_PER_SECOND) {
        const waitMs = 1000 - (now - secondStart);
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        messagesSentThisSecond = 0;
        secondStart = Date.now();
      }

      // deno-lint-ignore no-explicit-any
      const contact = (campaignContact as any).contacts;
      const phone = contact?.phone;

      if (!phone) {
        logger.warn('Contact has no phone number, skipping', {
          campaignId,
          campaignContactId: campaignContact.id,
          contactId: campaignContact.contact_id,
        });

        await supabase
          .from('campaign_contacts')
          .update({
            status: 'failed',
            error_message: 'Contact has no phone number',
          })
          .eq('id', campaignContact.id);

        failedCount++;
        continue;
      }

      // Send the message
      const result = await sendMessageViaEvolutionApi(
        evolutionApiUrl,
        evolutionApiKey,
        instanceName,
        phone,
        messageContent,
        messageType,
        mediaUrl,
      );

      messagesSentThisSecond++;

      if (result.success) {
        sentCount++;

        await supabase
          .from('campaign_contacts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: result.externalId || null,
          })
          .eq('id', campaignContact.id);

        logger.debug('Message sent successfully', {
          campaignId,
          contactPhone: phone,
          externalId: result.externalId,
        });
      } else {
        failedCount++;

        await supabase
          .from('campaign_contacts')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
          })
          .eq('id', campaignContact.id);

        logger.warn('Failed to send message to contact', {
          campaignId,
          contactPhone: phone,
          error: result.error,
        });
      }

      // Update campaign progress periodically (every 50 messages)
      if ((sentCount + failedCount) % 50 === 0) {
        await supabase
          .from('campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq('id', campaignId);

        logger.info('Campaign progress update', {
          campaignId,
          sentCount,
          failedCount,
        });
      }
    }

    // Since we query by status='pending', we don't need to increase offset
    // as processed contacts are no longer 'pending'. But if updates fail,
    // we advance offset to avoid infinite loops.
    offset += CONTACT_BATCH_SIZE;
  }

  // --- Finalize campaign ---
  const totalProcessed = sentCount + failedCount;
  const finalStatus = failedCount > 0 && sentCount === 0 ? 'failed' : 'completed';

  const { error: finalizeError } = await supabase
    .from('campaigns')
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (finalizeError) {
    logger.error('Failed to finalize campaign', {
      campaignId,
      error: finalizeError.message,
    });
  }

  campaignTimer.end({
    campaignId,
    campaignName,
    finalStatus,
    sentCount,
    failedCount,
    totalProcessed,
  });
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  // --- Health check ---
  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'campaign-worker', corsHeaders);
  }

  // --- Only allow POST (from cron/scheduler triggers) ---
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', {
      status: 405,
      code: 'METHOD_NOT_ALLOWED',
      corsHeaders,
    });
  }

  try {
    // --- Validate environment ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('Missing Supabase configuration');
      return serverError('Supabase not configured', corsHeaders);
    }

    if (!evolutionApiUrl || !evolutionApiKey) {
      logger.error('Missing Evolution API configuration');
      return errorResponse('Evolution API not configured', {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Query campaigns ready to be sent ---
    const now = new Date().toISOString();

    const { data: campaigns, error: queryError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (queryError) {
      logger.error('Failed to query scheduled campaigns', {
        error: queryError.message,
      });
      return serverError('Failed to query campaigns', corsHeaders);
    }

    if (!campaigns || campaigns.length === 0) {
      logger.info('No scheduled campaigns to process');
      const response = new Response(
        JSON.stringify({
          success: true,
          message: 'No campaigns to process',
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
      requestTimer.end({ processed: 0 });
      return response;
    }

    logger.info('Found scheduled campaigns', {
      count: campaigns.length,
      campaignIds: campaigns.map((c: Record<string, unknown>) => c.id),
    });

    // --- Process each campaign sequentially ---
    const results: Array<{
      campaignId: string;
      name: string;
      status: string;
    }> = [];

    for (const campaign of campaigns) {
      try {
        await processCampaign(
          campaign,
          supabase,
          evolutionApiUrl,
          evolutionApiKey,
        );

        // Re-fetch the campaign to get its final status
        const { data: updated } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single();

        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          status: updated?.status || 'unknown',
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('Unhandled error processing campaign', {
          campaignId: campaign.id,
          error: errorMsg,
        });

        // Mark campaign as failed so it is not retried indefinitely
        await supabase
          .from('campaigns')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', campaign.id);

        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          status: 'failed',
        });
      }
    }

    const response = new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} campaign(s)`,
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

    requestTimer.end({
      processedCampaigns: results.length,
      results,
    });

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Campaign worker unhandled error', { error: errorMsg });
    requestTimer.end({ error: errorMsg });
    return serverError('Campaign worker failed: ' + errorMsg, corsHeaders);
  }
});
