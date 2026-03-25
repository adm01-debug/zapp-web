import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface RateLimitAlertRequest {
  ip_address: string;
  endpoint: string;
  request_count: number;
  blocked: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { ip_address, endpoint, request_count, blocked }: RateLimitAlertRequest = await req.json();

    console.log(`Rate limit alert: IP ${ip_address} hit ${endpoint} ${request_count} times. Blocked: ${blocked}`);

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
      console.error("Error creating alert:", alertError);
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
        console.error("Error blocking IP:", blockError);
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
    console.error("Error in send-rate-limit-alert:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } 
      }
    );
  }
});
