import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { errorResponse } from '../_shared/errorResponse.ts';

const logger = createStructuredLogger('auto-close-conversations');

interface AutoCloseConfig {
  id: string;
  inactivity_hours: number;
  is_enabled: boolean;
  close_message: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface InactiveContact {
  id: string;
  name: string;
  phone: string;
  whatsapp_connection_id: string | null;
  last_message_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  logger.setRequestContext(req);

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'auto-close-conversations', getCorsHeaders(req));
  }

  const timer = logger.startTimer('auto-close-conversations');
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      logger.error("Missing required environment variables");
      return errorResponse("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", {
        status: 500,
        code: "CONFIG_ERROR",
        corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch enabled auto-close configurations
    const { data: configs, error: configError } = await supabase
      .from('auto_close_config')
      .select('*')
      .eq('is_enabled', true);

    if (configError) {
      logger.error("Failed to fetch auto_close_config", { error: configError.message });
      return errorResponse("Failed to fetch auto-close configuration", {
        status: 500,
        code: "CONFIG_FETCH_ERROR",
        corsHeaders,
      });
    }

    if (!configs || configs.length === 0) {
      logger.info("No enabled auto-close configurations found, skipping");
      timer.end({ skipped: true });
      return new Response(
        JSON.stringify({
          success: true,
          message: "No enabled auto-close configurations",
          closed_count: 0,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalClosed = 0;
    let totalErrors = 0;
    const results: Array<{
      config_id: string;
      inactivity_hours: number;
      closed_count: number;
      error?: string;
    }> = [];

    // Step 2: Process each configuration independently
    for (const config of configs as AutoCloseConfig[]) {
      try {
        const closedCount = await processConfig(supabase, config);
        totalClosed += closedCount;
        results.push({
          config_id: config.id,
          inactivity_hours: config.inactivity_hours,
          closed_count: closedCount,
        });
      } catch (err: unknown) {
        // Don't fail all configs if one fails
        totalErrors++;
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("Failed to process auto-close config", {
          config_id: config.id,
          error: errMsg,
        });
        results.push({
          config_id: config.id,
          inactivity_hours: config.inactivity_hours,
          closed_count: 0,
          error: errMsg,
        });
      }
    }

    const summary = {
      success: totalErrors === 0,
      total_closed: totalClosed,
      total_errors: totalErrors,
      configs_processed: configs.length,
      results,
      timestamp: new Date().toISOString(),
    };

    logger.info("Auto-close run completed", summary);
    timer.end({ total_closed: totalClosed, total_errors: totalErrors });

    return new Response(JSON.stringify(summary), {
      status: totalErrors > 0 && totalClosed === 0 ? 207 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Unhandled error in auto-close-conversations", { error: errorMessage });
    timer.end({ error: errorMessage });
    return errorResponse(errorMessage, { status: 500, code: "INTERNAL_ERROR", corsHeaders });
  }
});

/**
 * Process a single auto-close configuration:
 * 1. Find contacts with no messages within the inactivity window
 * 2. Insert a system close message for each inactive contact
 * 3. Insert audit trail entries
 *
 * Returns the number of conversations closed.
 */
async function processConfig(
  supabase: ReturnType<typeof createClient>,
  config: AutoCloseConfig
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - config.inactivity_hours);
  const cutoffISO = cutoffDate.toISOString();

  logger.info("Processing auto-close config", {
    config_id: config.id,
    inactivity_hours: config.inactivity_hours,
    cutoff: cutoffISO,
  });

  // Find contacts whose most recent message is older than the cutoff.
  // We use an RPC-style raw query via .rpc or build it with the query builder.
  // Since Supabase JS doesn't support subquery filters natively, we use a two-step approach:
  //
  // Step A: Get all contact IDs with their latest message timestamp
  // Step B: Filter those that are inactive

  // Get contacts that have at least one message and whose latest message is before the cutoff
  const { data: inactiveContacts, error: queryError } = await supabase
    .rpc('get_inactive_contacts', {
      cutoff_timestamp: cutoffISO,
    })
    .returns<InactiveContact[]>();

  // If the RPC doesn't exist, fall back to a manual approach
  let contactsToClose: InactiveContact[];

  if (queryError) {
    logger.warn("RPC get_inactive_contacts not found, using fallback query", {
      error: queryError.message,
    });
    contactsToClose = await findInactiveContactsFallback(supabase, cutoffISO);
  } else {
    contactsToClose = inactiveContacts || [];
  }

  if (contactsToClose.length === 0) {
    logger.info("No inactive conversations found for config", {
      config_id: config.id,
    });
    return 0;
  }

  logger.info(`Found ${contactsToClose.length} inactive conversations to close`, {
    config_id: config.id,
    contact_count: contactsToClose.length,
  });

  let closedCount = 0;

  // Step C: Close each conversation
  for (const contact of contactsToClose) {
    try {
      await closeConversation(supabase, contact, config);
      closedCount++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn("Failed to close conversation for contact", {
        contact_id: contact.id,
        error: errMsg,
      });
      // Continue with other contacts
    }
  }

  logger.info(`Closed ${closedCount} conversations for config`, {
    config_id: config.id,
    closed_count: closedCount,
    attempted: contactsToClose.length,
  });

  return closedCount;
}

/**
 * Fallback approach when the RPC function is not available.
 * Fetches contacts that have messages, then filters by latest message date.
 */
async function findInactiveContactsFallback(
  supabase: ReturnType<typeof createClient>,
  cutoffISO: string
): Promise<InactiveContact[]> {
  // Fetch contacts that have at least one message
  // We fetch contacts along with their most recent message created_at
  // Process in batches to avoid memory issues
  const PAGE_SIZE = 500;
  let offset = 0;
  const inactiveContacts: InactiveContact[] = [];

  while (true) {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, phone, whatsapp_connection_id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      logger.error("Failed to fetch contacts", { error: error.message });
      throw error;
    }

    if (!contacts || contacts.length === 0) break;

    // For each batch, check the latest message
    for (const contact of contacts) {
      const { data: latestMsg, error: msgError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (msgError || !latestMsg) continue;

      // Check if the latest message is before the cutoff
      if (latestMsg.created_at < cutoffISO) {
        inactiveContacts.push({
          ...contact,
          last_message_at: latestMsg.created_at,
        });
      }
    }

    if (contacts.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return inactiveContacts;
}

/**
 * Close a single conversation:
 * 1. Optionally send a close message
 * 2. Insert an audit trail entry
 */
async function closeConversation(
  supabase: ReturnType<typeof createClient>,
  contact: InactiveContact,
  config: AutoCloseConfig
): Promise<void> {
  const now = new Date().toISOString();

  // Insert a system close message if configured
  if (config.close_message) {
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        contact_id: contact.id,
        content: config.close_message,
        sender: 'system',
        message_type: 'system',
        whatsapp_connection_id: contact.whatsapp_connection_id,
        created_at: now,
      });

    if (msgError) {
      logger.warn("Failed to insert close message", {
        contact_id: contact.id,
        error: msgError.message,
      });
      // Don't throw - still proceed with audit entry
    }
  }

  // Update the contact's updated_at to reflect the closure
  const { error: updateError } = await supabase
    .from('contacts')
    .update({ updated_at: now })
    .eq('id', contact.id);

  if (updateError) {
    logger.warn("Failed to update contact updated_at", {
      contact_id: contact.id,
      error: updateError.message,
    });
  }

  // Insert audit trail entry
  const { error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      action: 'auto_close_conversation',
      entity_type: 'contact',
      entity_id: contact.id,
      user_id: null, // System action, no user
      details: {
        config_id: config.id,
        contact_name: contact.name,
        contact_phone: contact.phone,
        inactivity_hours: config.inactivity_hours,
        last_message_at: contact.last_message_at,
        close_message_sent: !!config.close_message,
        closed_at: now,
      },
    });

  if (auditError) {
    logger.warn("Failed to insert audit log", {
      contact_id: contact.id,
      error: auditError.message,
    });
    // Non-fatal: don't throw for audit failures
  }
}
