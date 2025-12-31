import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting rate limit logs cleanup...");

    // Delete logs older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedLogs, error: logsError } = await supabaseClient
      .from("rate_limit_logs")
      .delete()
      .lt("created_at", sevenDaysAgo)
      .select("id");

    if (logsError) {
      console.error("Error deleting rate limit logs:", logsError);
      throw logsError;
    }

    console.log(`Deleted ${deletedLogs?.length || 0} old rate limit logs`);

    // Delete expired blocked IPs (non-permanent)
    const now = new Date().toISOString();
    
    const { data: unblockedIps, error: blockedError } = await supabaseClient
      .from("blocked_ips")
      .delete()
      .eq("is_permanent", false)
      .lt("expires_at", now)
      .select("ip_address");

    if (blockedError) {
      console.error("Error removing expired blocked IPs:", blockedError);
      throw blockedError;
    }

    console.log(`Removed ${unblockedIps?.length || 0} expired IP blocks`);

    // Delete old security alerts (older than 30 days, resolved only)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedAlerts, error: alertsError } = await supabaseClient
      .from("security_alerts")
      .delete()
      .eq("is_resolved", true)
      .lt("created_at", thirtyDaysAgo)
      .select("id");

    if (alertsError) {
      console.error("Error deleting old security alerts:", alertsError);
    } else {
      console.log(`Deleted ${deletedAlerts?.length || 0} old resolved security alerts`);
    }

    const summary = {
      deleted_logs: deletedLogs?.length || 0,
      unblocked_ips: unblockedIps?.length || 0,
      deleted_alerts: deletedAlerts?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log("Cleanup completed:", summary);

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in cleanup-rate-limit-logs:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
