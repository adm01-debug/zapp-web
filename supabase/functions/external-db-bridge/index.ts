import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Telemetry helper ─────────────────────────────────────────
interface TelemetryPayload {
  operation: string;
  table_name?: string | null;
  rpc_name?: string | null;
  duration_ms: number;
  record_count?: number | null;
  query_limit?: number | null;
  query_offset?: number | null;
  count_mode?: string | null;
  severity: string;
  error_message?: string | null;
  user_id?: string | null;
}

const SLOW_QUERY_THRESHOLD_MS = 3000;
const VERY_SLOW_QUERY_THRESHOLD_MS = 8000;

export function classifySeverity(durationMs: number, hasError: boolean): string {
  if (hasError) return "error";
  if (durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) return "very_slow";
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) return "slow";
  return "ok";
}

function emitStructuredLog(payload: TelemetryPayload) {
  const icon = payload.severity === "very_slow" ? "🔴"
    : payload.severity === "slow" ? "🟡"
    : payload.severity === "error" ? "❌"
    : "✅";
  const target = payload.rpc_name || payload.table_name || "unknown";
  const line = `${icon} [telemetry] ${payload.operation}:${target} ${Math.round(payload.duration_ms)}ms`
    + ` | records=${payload.record_count ?? "-"}`
    + ` limit=${payload.query_limit ?? "-"}`
    + ` offset=${payload.query_offset ?? "-"}`
    + ` count=${payload.count_mode ?? "-"}`;

  if (payload.severity === "very_slow") {
    console.warn(`⚠️ VERY SLOW QUERY: ${line}`);
  } else if (payload.severity === "slow") {
    console.warn(`⚠️ SLOW QUERY: ${line}`);
  } else if (payload.severity === "error") {
    console.error(`${line} error=${payload.error_message}`);
  } else {
    console.info(line);
  }
}

export async function emitTelemetry(
  supabaseAdmin: any, // deno-lint-ignore no-explicit-any
  payload: TelemetryPayload,
): Promise<{ success: boolean; error?: string }> {
  // Always emit structured log
  emitStructuredLog(payload);

  try {
    const { error } = await supabaseAdmin
      .from("query_telemetry")
      .insert({
        operation: payload.operation,
        table_name: payload.table_name ?? null,
        rpc_name: payload.rpc_name ?? null,
        duration_ms: Math.round(payload.duration_ms),
        record_count: payload.record_count ?? null,
        query_limit: payload.query_limit ?? null,
        query_offset: payload.query_offset ?? null,
        count_mode: payload.count_mode ?? null,
        severity: payload.severity,
        error_message: payload.error_message ?? null,
        user_id: payload.user_id ?? null,
      });

    if (error) {
      console.error("[emitTelemetry] insert error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[emitTelemetry] exception:", msg);
    return { success: false, error: msg };
  }
}

// ─── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse body
    const body = await req.json();
    const { action, table, rpc, params, limit, offset, countMode } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = performance.now();
    let result: unknown = null;
    let queryError: string | null = null;
    let recordCount: number | null = null;

    try {
      // Route by action
      if (action === "select" && table) {
        let query = supabaseAdmin.from(table).select(params?.select || "*", {
          count: countMode || undefined,
        });
        if (params?.filters) {
          for (const f of params.filters) {
            query = query.filter(f.column, f.operator, f.value);
          }
        }
        if (params?.order) {
          query = query.order(params.order.column, {
            ascending: params.order.ascending ?? true,
          });
        }
        if (limit) query = query.limit(limit);
        if (offset) query = query.range(offset, offset + (limit || 50) - 1);

        const { data, error, count } = await query;
        if (error) throw error;
        result = data;
        recordCount = count ?? (Array.isArray(data) ? data.length : null);
      } else if (action === "rpc" && rpc) {
        const { data, error } = await supabaseAdmin.rpc(rpc, params || {});
        if (error) throw error;
        result = data;
        recordCount = Array.isArray(data) ? data.length : 1;
      } else if (action === "insert" && table) {
        const { data, error } = await supabaseAdmin.from(table).insert(params?.rows || params).select();
        if (error) throw error;
        result = data;
        recordCount = Array.isArray(data) ? data.length : 1;
      } else if (action === "update" && table) {
        let query = supabaseAdmin.from(table).update(params?.values || {});
        if (params?.match) {
          for (const [k, v] of Object.entries(params.match)) {
            query = query.eq(k, v as string);
          }
        }
        const { data, error } = await query.select();
        if (error) throw error;
        result = data;
        recordCount = Array.isArray(data) ? data.length : 0;
      } else if (action === "delete" && table) {
        let query = supabaseAdmin.from(table).delete();
        if (params?.match) {
          for (const [k, v] of Object.entries(params.match)) {
            query = query.eq(k, v as string);
          }
        }
        const { data, error } = await query.select();
        if (error) throw error;
        result = data;
        recordCount = Array.isArray(data) ? data.length : 0;
      } else {
        return new Response(JSON.stringify({ error: "Invalid action or missing table/rpc" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (err) {
      queryError = err instanceof Error ? err.message : String(err);
    }

    const durationMs = performance.now() - startTime;
    const severity = classifySeverity(durationMs, !!queryError);

    // Emit telemetry (fire-and-forget for non-normal queries)
    if (severity !== "ok") {
      emitTelemetry(supabaseAdmin, {
        operation: action,
        table_name: table || null,
        rpc_name: rpc || null,
        duration_ms: durationMs,
        record_count: recordCount,
        query_limit: limit || null,
        query_offset: offset || null,
        count_mode: countMode || null,
        severity,
        error_message: queryError,
        user_id: userId,
      }).catch((e) => console.error("[telemetry] fire-and-forget failed:", e));
    }

    if (queryError) {
      return new Response(
        JSON.stringify({ error: queryError, telemetry: { severity, duration_ms: Math.round(durationMs) } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        data: result,
        meta: { record_count: recordCount, duration_ms: Math.round(durationMs), severity },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[external-db-bridge] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
