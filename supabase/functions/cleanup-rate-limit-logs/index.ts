import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';

const logger = createStructuredLogger('cleanup-rate-limit-logs');

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'cleanup-rate-limit-logs', getCorsHeaders(req));
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    logger.info("Starting rate limit logs cleanup...");

    // Delete logs older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedLogs, error: logsError } = await supabaseClient
      .from("rate_limit_logs")
      .delete()
      .lt("created_at", sevenDaysAgo)
      .select("id");

    if (logsError) {
      logger.error("Error deleting rate limit logs", { error: logsError });
      throw logsError;
    }

    logger.info(`Deleted ${deletedLogs?.length || 0} old rate limit logs`);

    // Delete expired blocked IPs (non-permanent)
    const now = new Date().toISOString();
    
    const { data: unblockedIps, error: blockedError } = await supabaseClient
      .from("blocked_ips")
      .delete()
      .eq("is_permanent", false)
      .lt("expires_at", now)
      .select("ip_address");

    if (blockedError) {
      logger.error("Error removing expired blocked IPs", { error: blockedError });
      throw blockedError;
    }

    logger.info(`Removed ${unblockedIps?.length || 0} expired IP blocks`);

    // Delete old security alerts (older than 30 days, resolved only)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedAlerts, error: alertsError } = await supabaseClient
      .from("security_alerts")
      .delete()
      .eq("is_resolved", true)
      .lt("created_at", thirtyDaysAgo)
      .select("id");

    if (alertsError) {
      logger.error("Error deleting old security alerts", { error: alertsError });
    } else {
      logger.info(`Deleted ${deletedAlerts?.length || 0} old resolved security alerts`);
    }

    const summary = {
      deleted_logs: deletedLogs?.length || 0,
      unblocked_ips: unblockedIps?.length || 0,
      deleted_alerts: deletedAlerts?.length || 0,
      timestamp: new Date().toISOString(),
    };

    logger.info("Cleanup completed", summary);

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in cleanup-rate-limit-logs", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } 
      }
    );
  }
});
