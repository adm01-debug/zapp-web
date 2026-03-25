import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { cleanupExpiredCache, getCacheStats } from '../_shared/aiCache.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting AI cache cleanup...");

    // Clean up expired AI cache entries
    const deletedCacheEntries = await cleanupExpiredCache(supabaseClient);
    console.log(`Deleted ${deletedCacheEntries} expired AI cache entries`);

    // Clean up expired idempotency keys if the table exists
    let deletedIdempotencyKeys = 0;
    try {
      const { data, error } = await supabaseClient
        .from('idempotency_keys')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('key');

      if (!error) {
        deletedIdempotencyKeys = data?.length || 0;
        console.log(`Deleted ${deletedIdempotencyKeys} expired idempotency keys`);
      }
    } catch (e) {
      console.log("Idempotency keys table not found or error, skipping:", e);
    }

    // Get current cache stats
    const stats = await getCacheStats(supabaseClient);

    const summary = {
      success: true,
      deleted_cache_entries: deletedCacheEntries,
      deleted_idempotency_keys: deletedIdempotencyKeys,
      cache_stats: stats,
      timestamp: new Date().toISOString(),
    };

    console.log("Cleanup completed:", JSON.stringify(summary));

    return new Response(
      JSON.stringify(summary),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in cleanup-ai-cache:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      }
    );
  }
});
