import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';

const logger = createStructuredLogger('send-rate-limit-alert');

interface RateLimitAlertRequest {
  ip_address: string;
  endpoint: string;
  request_count: number;
  blocked: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'send-rate-limit-alert', getCorsHeaders(req));
  }

  // Verify authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: authError || 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { ip_address, endpoint, request_count, blocked }: RateLimitAlertRequest = await req.json();

    logger.info(`Rate limit alert: IP ${ip_address} hit ${endpoint} ${request_count} times. Blocked: ${blocked}`);

    // Create security alert
    const { error: alertError } = await supabaseClient
      .from("security_alerts")
      .insert({
        alert_type: blocked ? "rate_limit_blocked" : "rate_limit_warning",
        severity: blocked ? "high" : "medium",
        title: blocked 
          ? `IP ${ip_address} bloqueado por Rate Limit` 
          : `Alerta de Rate Limit para IP ${ip_address}`,
        description: `O IP ${ip_address} fez ${request_count} requisições para ${endpoint}. ${blocked ? "O IP foi bloqueado." : "Limite próximo."}`,
        ip_address,
        metadata: {
          endpoint,
          request_count,
          blocked,
          timestamp: new Date().toISOString(),
        },
      });

    if (alertError) {
      logger.error("Error creating alert", { error: alertError });
      throw alertError;
    }

    // If blocked, add to blocked_ips table
    if (blocked) {
      const blockDuration = 15; // 15 minutes default
      const expiresAt = new Date(Date.now() + blockDuration * 60 * 1000);

      const { error: blockError } = await supabaseClient
        .from("blocked_ips")
        .upsert({
          ip_address,
          reason: `Rate limit exceeded: ${request_count} requests to ${endpoint}`,
          blocked_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_permanent: false,
          request_count,
          last_attempt_at: new Date().toISOString(),
        }, {
          onConflict: "ip_address",
        });

      if (blockError) {
        logger.error("Error blocking IP", { error: blockError });
      }
    }

    // Notify admin users
    const { data: admins } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        type: "security",
        title: blocked ? "IP Bloqueado" : "Alerta de Rate Limit",
        message: `IP ${ip_address} - ${request_count} requisições para ${endpoint}`,
        metadata: { ip_address, endpoint, request_count, blocked },
      }));

      await supabaseClient.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Alert processed" }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in send-rate-limit-alert", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } 
      }
    );
  }
});
