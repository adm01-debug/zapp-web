import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';

const startTime = Date.now();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const checks: Record<string, { status: string; latency_ms?: number; error?: string; usage_mb?: number; missing?: string[] }> = {};

  // Check 1: Supabase database connectivity
  const dbStart = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      checks.supabase = { status: 'error', error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('global_settings').select('key').limit(1);
      const latency_ms = Date.now() - dbStart;
      if (error) {
        checks.supabase = { status: 'error', latency_ms, error: error.message };
      } else {
        checks.supabase = { status: 'ok', latency_ms };
      }
    }
  } catch (err) {
    checks.supabase = { status: 'error', latency_ms: Date.now() - dbStart, error: String(err) };
  }

  // Check 2: Environment variables configured
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
  ];
  const optionalEnvVars = [
    'EVOLUTION_API_URL',
    'EVOLUTION_API_KEY',
    'LOVABLE_API_KEY',
    'RESEND_API_KEY',
    'ALLOWED_ORIGINS',
  ];
  const missingRequired = requiredEnvVars.filter(v => !Deno.env.get(v));
  const missingOptional = optionalEnvVars.filter(v => !Deno.env.get(v));

  if (missingRequired.length > 0) {
    checks.env_vars = { status: 'error', missing: missingRequired };
  } else if (missingOptional.length > 0) {
    checks.env_vars = { status: 'ok', missing: missingOptional };
  } else {
    checks.env_vars = { status: 'ok' };
  }

  // Check 3: Memory
  try {
    // deno-lint-ignore no-explicit-any
    const memUsage = (Deno as any).memoryUsage?.();
    if (memUsage) {
      const usage_mb = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100;
      checks.memory = { status: 'ok', usage_mb };
    } else {
      checks.memory = { status: 'ok' };
    }
  } catch {
    checks.memory = { status: 'ok' };
  }

  // Determine overall status
  const allResults = Object.values(checks);
  const hasError = allResults.some(c => c.status === 'error');
  const allError = allResults.every(c => c.status === 'error');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (allError) {
    status = 'unhealthy';
  } else if (hasError) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  const response = {
    status,
    service: 'zapp-system',
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    version: '1.0.0',
    checks,
  };

  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return new Response(JSON.stringify(response), {
    status: httpStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
