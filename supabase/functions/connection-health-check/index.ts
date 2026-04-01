import { getCorsHeaders as _getCors } from "../_shared/validation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const baseUrl = evolutionUrl.replace(/\/+$/, '');

    // Get all connections
    const { data: connections, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id, status, phone_number');

    if (connError || !connections) {
      return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const alertsToCreate = [];

    for (const conn of connections) {
      const start = performance.now();
      let healthStatus = 'unknown';
      let errorMessage: string | null = null;
      let responseTime = 0;

      try {
        const resp = await fetch(`${baseUrl}/instance/connectionState/${conn.instance_id}`, {
          method: 'GET',
          headers: { 'apikey': evolutionKey },
          signal: AbortSignal.timeout(10000),
        });

        responseTime = Math.round(performance.now() - start);

        if (resp.ok) {
          const data = await resp.json();
          const state = data?.instance?.state || data?.state || 'unknown';
          healthStatus = state === 'open' ? 'healthy' : state === 'close' ? 'disconnected' : 'degraded';

          // Update connection status if it changed
          const dbStatus = state === 'open' ? 'connected' : 'disconnected';
          if (dbStatus !== conn.status) {
            await supabase
              .from('whatsapp_connections')
              .update({ status: dbStatus, updated_at: new Date().toISOString() })
              .eq('id', conn.id);

            // Create disconnection alert
            if (dbStatus === 'disconnected' && conn.status === 'connected') {
              alertsToCreate.push({
                connection_id: conn.id,
                instance_id: conn.instance_id,
                phone: conn.phone_number,
              });
            }
          }
        } else {
          const errText = await resp.text();
          healthStatus = 'error';
          errorMessage = `HTTP ${resp.status}: ${errText.slice(0, 200)}`;
        }
      } catch (err) {
        responseTime = Math.round(performance.now() - start);
        healthStatus = 'timeout';
        errorMessage = err instanceof Error ? err.message : 'Unknown error';
      }

      // Log health check
      await supabase.from('connection_health_logs').insert({
        connection_id: conn.id,
        instance_id: conn.instance_id,
        status: healthStatus,
        response_time_ms: responseTime,
        error_message: errorMessage,
      });

      // Update connection health fields
      await supabase
        .from('whatsapp_connections')
        .update({
          last_health_check: new Date().toISOString(),
          health_status: healthStatus,
          health_response_ms: responseTime,
        })
        .eq('id', conn.id);

      results.push({
        instance_id: conn.instance_id,
        status: healthStatus,
        response_time_ms: responseTime,
        error: errorMessage,
      });
    }

    // Create warroom alerts for disconnections
    for (const alert of alertsToCreate) {
      await supabase.from('warroom_alerts').insert({
        alert_type: 'connection_down',
        severity: 'critical',
        title: `Conexão ${alert.instance_id} desconectada`,
        description: `A instância ${alert.instance_id}${alert.phone ? ` (${alert.phone})` : ''} perdeu conexão com o WhatsApp.`,
        metadata: { connection_id: alert.connection_id, instance_id: alert.instance_id },
      }).then(({ error }) => {
        if (error) console.error('Failed to create warroom alert:', error);
      });
    }

    // Cleanup old health logs (keep last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('connection_health_logs').delete().lt('checked_at', sevenDaysAgo);

    console.log(`Health check completed: ${results.length} connections checked`);

    return new Response(JSON.stringify({
      success: true,
      checked_at: new Date().toISOString(),
      connections: results,
      alerts_created: alertsToCreate.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Health check error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
