/**
 * Dead Letter Queue utilities for failed operation retry.
 * Provides exponential backoff and structured error tracking.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

export interface DeadLetterEntry {
  sourceFunction: string;
  eventType?: string;
  payload: Record<string, unknown>;
  errorMessage?: string;
  errorStack?: string;
  maxRetries?: number;
}

/**
 * Enqueue a failed operation to the dead letter queue.
 * Calculates next_retry_at with exponential backoff: now + (2^retry_count * 60) seconds.
 */
export async function enqueueToDeadLetter(
  supabase: SupabaseClient,
  entry: DeadLetterEntry
): Promise<{ id: string } | null> {
  const maxRetries = entry.maxRetries ?? 3;
  // First retry in 60 seconds (2^0 * 60)
  const nextRetryAt = new Date(Date.now() + 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('dead_letter_queue')
    .insert({
      source_function: entry.sourceFunction,
      event_type: entry.eventType || null,
      payload: entry.payload,
      error_message: entry.errorMessage || null,
      error_stack: entry.errorStack || null,
      max_retries: maxRetries,
      retry_count: 0,
      next_retry_at: nextRetryAt,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to enqueue to DLQ:', error);
    return null;
  }

  console.log(`Enqueued to DLQ: ${data.id} (${entry.sourceFunction}/${entry.eventType})`);
  return { id: data.id };
}

/**
 * Process pending dead letter queue items for a specific source function.
 * Fetches items where next_retry_at <= now(), calls processFn, updates status.
 */
export async function processDeadLetterQueue(
  supabase: SupabaseClient,
  sourceFunction: string,
  processFn: (payload: Record<string, unknown>, eventType?: string) => Promise<void>
): Promise<{ processed: number; failed: number; resolved: number }> {
  const now = new Date().toISOString();

  const { data: items, error } = await supabase
    .from('dead_letter_queue')
    .select('*')
    .eq('source_function', sourceFunction)
    .in('status', ['pending', 'retrying'])
    .lte('next_retry_at', now)
    .order('next_retry_at', { ascending: true })
    .limit(10);

  if (error || !items) {
    console.error('Failed to fetch DLQ items:', error);
    return { processed: 0, failed: 0, resolved: 0 };
  }

  let resolved = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // Mark as retrying
      await supabase
        .from('dead_letter_queue')
        .update({ status: 'retrying' })
        .eq('id', item.id);

      await processFn(item.payload, item.event_type);

      // Success — mark resolved
      await supabase
        .from('dead_letter_queue')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      resolved++;
    } catch (retryError) {
      const newRetryCount = (item.retry_count || 0) + 1;
      const errMsg = retryError instanceof Error ? retryError.message : String(retryError);
      const errStack = retryError instanceof Error ? retryError.stack || '' : '';

      if (newRetryCount >= (item.max_retries || 3)) {
        // Exhausted retries
        await supabase
          .from('dead_letter_queue')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            error_message: errMsg,
            error_stack: errStack,
          })
          .eq('id', item.id);
        failed++;
      } else {
        // Schedule next retry with exponential backoff: 2^retry_count * 60 seconds
        const backoffSeconds = Math.pow(2, newRetryCount) * 60;
        const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        await supabase
          .from('dead_letter_queue')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt,
            error_message: errMsg,
            error_stack: errStack,
          })
          .eq('id', item.id);
      }
    }
  }

  console.log(`DLQ processed for ${sourceFunction}: ${resolved} resolved, ${failed} failed, ${items.length} total`);
  return { processed: items.length, failed, resolved };
}

/**
 * Manually resolve a dead letter queue item.
 */
export async function resolveDeadLetterItem(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase
    .from('dead_letter_queue')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to resolve DLQ item:', error);
    return false;
  }
  return true;
}
