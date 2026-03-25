/**
 * Shared health check utility for Supabase Edge Functions.
 * Provides lightweight health endpoints for monitoring.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const startTime = Date.now();

export interface CheckResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  usage_mb?: number;
  error?: string;
}

export interface DependencyCheck {
  name: string;
  check: () => Promise<CheckResult>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  uptime_ms: number;
  version: string;
  checks: Record<string, CheckResult>;
}

/**
 * Detects if the incoming request is a health check.
 * Matches URL path ending with `/health` or query param `?health=true`.
 */
export function isHealthCheck(req: Request): boolean {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health')) return true;
  if (url.searchParams.get('health') === 'true') return true;
  return false;
}

/**
 * Performs a basic Supabase connectivity check via `select 1`.
 */
async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return { status: 'error', error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('global_settings').select('key').limit(1);
    const latency_ms = Date.now() - start;
    if (error) {
      return { status: 'error', latency_ms, error: error.message };
    }
    return { status: 'ok', latency_ms };
  } catch (err) {
    return { status: 'error', latency_ms: Date.now() - start, error: String(err) };
  }
}

/**
 * Checks memory usage via Deno.memoryUsage() if available.
 */
function checkMemory(): CheckResult {
  try {
    // deno-lint-ignore no-explicit-any
    const memUsage = (Deno as any).memoryUsage?.();
    if (memUsage) {
      const usage_mb = Math.round((memUsage.rss / 1024 / 1024) * 100) / 100;
      return { status: 'ok', usage_mb };
    }
    return { status: 'ok' };
  } catch {
    return { status: 'ok' };
  }
}

/**
 * Handles a health check request and returns a structured JSON response.
 *
 * @param req - The incoming request
 * @param serviceName - Name of the edge function
 * @param corsHeaders - CORS headers to include in the response
 * @param additionalChecks - Optional array of dependency checks to run
 */
export async function handleHealthCheck(
  req: Request,
  serviceName: string,
  corsHeaders: Record<string, string>,
  additionalChecks?: DependencyCheck[],
): Promise<Response> {
  const checks: Record<string, CheckResult> = {};

  // Memory check (sync, fast)
  checks.memory = checkMemory();

  // Supabase connectivity check
  checks.supabase = await checkSupabase();

  // Run any additional dependency checks
  if (additionalChecks) {
    for (const dep of additionalChecks) {
      try {
        checks[dep.name] = await dep.check();
      } catch (err) {
        checks[dep.name] = { status: 'error', error: String(err) };
      }
    }
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

  const response: HealthResponse = {
    status,
    service: serviceName,
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
}
