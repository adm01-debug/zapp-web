import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { cleanupExpiredCache, getCacheStats } from '../_shared/aiCache.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { serverError } from '../_shared/errorResponse.ts';

const logger = createStructuredLogger('cleanup-ai-cache');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'cleanup-ai-cache', getCorsHeaders(req));
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    logger.info("Starting AI cache cleanup...");

    // Clean up expired AI cache entries
    const deletedCacheEntries = await cleanupExpiredCache(supabaseClient);
    logger.info(`Deleted ${deletedCacheEntries} expired AI cache entries`);

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
        logger.info(`Deleted ${deletedIdempotencyKeys} expired idempotency keys`);
      }
    } catch (e) {
      logger.info("Idempotency keys table not found or error, skipping", { error: e });
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

    logger.info("Cleanup completed", summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in cleanup-ai-cache", { error: errorMessage });
    return serverError('AI cache cleanup failed', getCorsHeaders(req));
  }
});
