/**
 * AI Response Cache utilities.
 * Provides transparent caching for AI API calls to reduce costs and latency.
 * Uses the public.ai_response_cache table in PostgreSQL.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

/**
 * Generate a deterministic SHA-256 cache key from function name and messages.
 * Normalizes messages by extracting only role+content and sorting to ensure
 * identical logical requests produce the same key regardless of field ordering.
 */
export async function generateCacheKey(
  functionName: string,
  messages: any[],
  options?: Record<string, any>
): Promise<string> {
  // Normalize messages: extract only role and content, ignore timestamps and metadata
  const normalizedMessages = (messages || []).map((msg: any) => ({
    role: String(msg.role || msg.sender || ''),
    content: String(msg.content || ''),
  }));

  const payload: Record<string, any> = {
    fn: functionName,
    msgs: normalizedMessages,
  };

  if (options) {
    payload.opts = options;
  }

  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a cached response exists and hasn't expired.
 * On hit, increments hit_count and updates last_hit_at.
 */
export async function getCachedResponse(
  supabaseClient: SupabaseClient,
  cacheKey: string
): Promise<{ hit: boolean; response?: any }> {
  try {
    const { data, error } = await supabaseClient
      .from('ai_response_cache')
      .select('id, response_body, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Cache lookup error:', error.message);
      return { hit: false };
    }

    if (!data) {
      return { hit: false };
    }

    // Increment hit count and update last_hit_at (fire-and-forget)
    supabaseClient
      .rpc('increment_ai_cache_hit', { p_cache_key: cacheKey })
      .then(() => {})
      .catch((err: any) => console.error('Cache hit_count update error:', err));

    return { hit: true, response: data.response_body };
  } catch (err) {
    console.error('Cache read error:', err);
    return { hit: false };
  }
}

interface SetCacheOptions {
  cacheKey: string;
  functionName: string;
  model?: string;
  requestHash: string;
  responseBody: any;
  tokenCount?: number;
  costEstimate?: number;
  ttlHours?: number;
}

/**
 * Upsert a cache entry with a configurable TTL.
 */
export async function setCachedResponse(
  supabaseClient: SupabaseClient,
  options: SetCacheOptions
): Promise<void> {
  const {
    cacheKey,
    functionName,
    model,
    requestHash,
    responseBody,
    tokenCount,
    costEstimate,
    ttlHours = 6,
  } = options;

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  try {
    const { error } = await supabaseClient
      .from('ai_response_cache')
      .upsert(
        {
          cache_key: cacheKey,
          function_name: functionName,
          model: model || null,
          request_hash: requestHash,
          response_body: responseBody,
          token_count: tokenCount || null,
          cost_estimate: costEstimate || null,
          hit_count: 0,
          expires_at: expiresAt,
          last_hit_at: null,
        },
        { onConflict: 'cache_key' }
      );

    if (error) {
      console.error('Cache write error:', error.message);
    }
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

/**
 * Delete expired cache entries. Returns the count of deleted entries.
 */
export async function cleanupExpiredCache(
  supabaseClient: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabaseClient
      .from('ai_response_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Cache cleanup error:', error.message);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error('Cache cleanup error:', err);
    return 0;
  }
}

/**
 * Get aggregate cache stats for monitoring.
 */
export async function getCacheStats(
  supabaseClient: SupabaseClient,
  functionName?: string
): Promise<{
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  estimatedSavings: number;
}> {
  try {
    let query = supabaseClient
      .from('ai_response_cache')
      .select('hit_count, cost_estimate');

    if (functionName) {
      query = query.eq('function_name', functionName);
    }

    const { data, error } = await query;

    if (error || !data) {
      return { totalEntries: 0, totalHits: 0, hitRate: 0, estimatedSavings: 0 };
    }

    const totalEntries = data.length;
    const totalHits = data.reduce((sum: number, row: any) => sum + (row.hit_count || 0), 0);
    const estimatedSavings = data.reduce(
      (sum: number, row: any) => sum + (row.hit_count || 0) * (row.cost_estimate || 0),
      0
    );

    // hitRate = total cache hits / (total hits + total entries created)
    const hitRate = totalEntries > 0 ? totalHits / (totalHits + totalEntries) : 0;

    return { totalEntries, totalHits, hitRate, estimatedSavings };
  } catch (err) {
    console.error('Cache stats error:', err);
    return { totalEntries: 0, totalHits: 0, hitRate: 0, estimatedSavings: 0 };
  }
}
