/**
 * Idempotency key utilities for deduplicating webhook and email requests.
 * Uses SHA-256 hashing to generate deterministic keys from request parts.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface CachedResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  cachedResponse?: CachedResponse;
}

/**
 * Check if a request with this idempotency key has already been processed.
 * If the key exists and is completed, returns the cached response.
 * If the key does not exist, inserts it with status 'processing'.
 */
export async function checkIdempotency(
  supabase: SupabaseClient,
  key: string,
  sourceFunction: string
): Promise<IdempotencyCheckResult> {
  // Check for existing key (not expired)
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('key, status, response_status, response_body, expires_at')
    .eq('key', key)
    .single();

  if (existing) {
    // Check if expired
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      // Expired — delete and treat as new
      await supabase.from('idempotency_keys').delete().eq('key', key);
    } else if (existing.status === 'completed' && existing.response_status != null) {
      return {
        isDuplicate: true,
        cachedResponse: {
          status: existing.response_status,
          body: existing.response_body || {},
        },
      };
    } else if (existing.status === 'processing') {
      // Another request is currently processing this — treat as duplicate to avoid double processing
      return {
        isDuplicate: true,
        cachedResponse: { status: 200, body: { deduplicated: true, status: 'processing' } },
      };
    }
    // If 'failed', allow reprocessing by falling through
  }

  // Insert new key with 'processing' status
  const { error } = await supabase
    .from('idempotency_keys')
    .upsert({
      key,
      source_function: sourceFunction,
      status: 'processing',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    console.error('Failed to insert idempotency key:', error);
    // On error, allow processing (don't block the request)
  }

  return { isDuplicate: false };
}

/**
 * Mark an idempotency key as completed with the cached response.
 */
export async function completeIdempotency(
  supabase: SupabaseClient,
  key: string,
  responseStatus: number,
  responseBody: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('idempotency_keys')
    .update({
      status: 'completed',
      response_status: responseStatus,
      response_body: responseBody,
    })
    .eq('key', key);

  if (error) {
    console.error('Failed to complete idempotency key:', error);
  }
}

/**
 * Mark an idempotency key as failed (allows future reprocessing).
 */
export async function failIdempotency(
  supabase: SupabaseClient,
  key: string
): Promise<void> {
  const { error } = await supabase
    .from('idempotency_keys')
    .update({ status: 'failed' })
    .eq('key', key);

  if (error) {
    console.error('Failed to mark idempotency key as failed:', error);
  }
}

/**
 * Generate a deterministic idempotency key from parts using SHA-256.
 */
export async function generateIdempotencyKey(...parts: string[]): Promise<string> {
  const input = parts.filter(Boolean).join(':');
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
