/**
 * Resilience Module for Evolution API Integration
 * Provides retry logic, circuit breaker, and dead letter queue support
 * 
 * @module resilience
 */

import { createLogger, StructuredLogger } from './structured-logging.ts';

// ========================================
// Types
// ========================================

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface DeadLetterEntry {
  id: string;
  operation: string;
  payload: unknown;
  error: string;
  attempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  metadata?: Record<string, unknown>;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

// ========================================
// Default Configuration
// ========================================

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'TIMEOUT',
    '429', // Too Many Requests
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
  ],
};

// ========================================
// Retry with Exponential Backoff
// ========================================

/**
 * Execute an async operation with exponential backoff retry
 * 
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: StructuredLogger
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const log = logger || createLogger('resilience');
  
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = isRetryableError(lastError, config.retryableErrors || []);
      
      if (!isRetryable || attempt >= config.maxRetries) {
        log.error(`Operation failed after ${attempt + 1} attempts`, lastError);
        throw lastError;
      }

      // Calculate delay with jitter
      const baseDelay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
      const jitter = Math.random() * 0.2 * baseDelay; // 0-20% jitter
      const delay = Math.round(baseDelay + jitter);

      log.warn(`Retry attempt ${attempt + 1}/${config.maxRetries}`, {
        error: lastError.message,
        delayMs: delay,
      });

      if (config.onRetry) {
        config.onRetry(attempt + 1, lastError, delay);
      }

      await sleep(delay);
      attempt++;
    }
  }

  throw lastError || new Error('Unknown error in retry loop');
}

/**
 * Check if an error is retryable based on configuration
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorString = `${error.name} ${error.message}`.toLowerCase();
  
  return retryableErrors.some(retryable => {
    const lower = retryable.toLowerCase();
    return errorString.includes(lower) || error.message.includes(retryable);
  });
}

/**
 * Simple sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// Circuit Breaker
// ========================================

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenRequests: 1,
};

/**
 * Execute operation with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceId: string,
  operation: () => Promise<T>,
  logger?: StructuredLogger
): Promise<T> {
  const log = logger || createLogger('circuit-breaker');
  let state = circuitBreakers.get(serviceId) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed' as const,
  };

  // Check if circuit should transition from open to half-open
  if (state.state === 'open') {
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeoutMs) {
      state.state = 'half-open';
      log.info(`Circuit ${serviceId} transitioned to half-open`);
    } else {
      log.warn(`Circuit ${serviceId} is OPEN - rejecting request`, {
        retryIn: Math.ceil((CIRCUIT_BREAKER_CONFIG.resetTimeoutMs - timeSinceLastFailure) / 1000),
      });
      throw new Error(`Circuit breaker OPEN for ${serviceId}`);
    }
  }

  try {
    const result = await operation();
    
    // Success - reset circuit
    if (state.state === 'half-open' || state.failures > 0) {
      state = { failures: 0, lastFailure: 0, state: 'closed' };
      circuitBreakers.set(serviceId, state);
      log.info(`Circuit ${serviceId} closed after successful request`);
    }
    
    return result;
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      state.state = 'open';
      log.error(`Circuit ${serviceId} OPENED after ${state.failures} failures`, error);
    }

    circuitBreakers.set(serviceId, state);
    throw error;
  }
}

/**
 * Get circuit breaker status for a service
 */
export function getCircuitBreakerStatus(serviceId: string): CircuitBreakerState | null {
  return circuitBreakers.get(serviceId) || null;
}

/**
 * Reset circuit breaker for a service
 */
export function resetCircuitBreaker(serviceId: string): void {
  circuitBreakers.delete(serviceId);
}

// ========================================
// Dead Letter Queue (Supabase-based)
// ========================================

/**
 * Store a failed operation in the dead letter queue
 */
export async function storeInDeadLetter(
  supabase: any, // deno-lint-ignore no-explicit-any
  entry: Omit<DeadLetterEntry, 'id' | 'firstAttemptAt' | 'lastAttemptAt'>,
  logger?: StructuredLogger
): Promise<string | null> {
  const log = logger || createLogger('dead-letter');
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('dead_letter_queue')
      .insert({
        operation: entry.operation,
        payload: entry.payload,
        error_message: entry.error,
        attempts: entry.attempts,
        first_attempt_at: now,
        last_attempt_at: now,
        metadata: entry.metadata || {},
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      log.error('Failed to store in dead letter queue', error);
      return null;
    }

    log.info('Stored failed operation in dead letter queue', {
      id: data.id,
      operation: entry.operation,
    });

    return data.id;
  } catch (err) {
    log.error('Dead letter storage exception', err);
    return null;
  }
}

/**
 * Retry operations from the dead letter queue
 */
export async function processDeadLetterQueue(
  supabase: any, // deno-lint-ignore no-explicit-any
  processor: (entry: DeadLetterEntry) => Promise<boolean>,
  options: { limit?: number; maxAttempts?: number } = {},
  logger?: StructuredLogger
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const log = logger || createLogger('dead-letter-processor');
  const { limit = 10, maxAttempts = 5 } = options;

  const { data: entries, error } = await supabase
    .from('dead_letter_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', maxAttempts)
    .order('first_attempt_at', { ascending: true })
    .limit(limit);

  if (error) {
    log.error('Failed to fetch dead letter entries', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (!entries?.length) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const dlEntry: DeadLetterEntry = {
        id: entry.id,
        operation: entry.operation,
        payload: entry.payload,
        error: entry.error_message,
        attempts: entry.attempts,
        firstAttemptAt: entry.first_attempt_at,
        lastAttemptAt: entry.last_attempt_at,
        metadata: entry.metadata,
      };

      const success = await processor(dlEntry);

      if (success) {
        await supabase
          .from('dead_letter_queue')
          .update({
            status: 'completed',
            last_attempt_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq('id', entry.id);
        succeeded++;
      } else {
        const newAttempts = entry.attempts + 1;
        await supabase
          .from('dead_letter_queue')
          .update({
            attempts: newAttempts,
            last_attempt_at: new Date().toISOString(),
            status: newAttempts >= maxAttempts ? 'failed' : 'pending',
          })
          .eq('id', entry.id);
        failed++;
      }
    } catch (err) {
      log.error(`Failed to process dead letter entry ${entry.id}`, err);
      failed++;
    }
  }

  log.info('Dead letter queue processing complete', {
    processed: entries.length,
    succeeded,
    failed,
  });

  return { processed: entries.length, succeeded, failed };
}

// ========================================
// Timeout Wrapper
// ========================================

/**
 * Execute an operation with a timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutError || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ========================================
// Combined Resilience Wrapper
// ========================================

/**
 * Execute an operation with full resilience:
 * - Circuit breaker protection
 * - Retry with exponential backoff
 * - Timeout protection
 * - Dead letter queue on final failure
 */
export async function withResilience<T>(
  serviceId: string,
  operation: () => Promise<T>,
  options: {
    retry?: Partial<RetryOptions>;
    timeoutMs?: number;
    deadLetterPayload?: unknown;
    supabase?: any; // deno-lint-ignore no-explicit-any
  } = {},
  logger?: StructuredLogger
): Promise<T> {
  const log = logger || createLogger('resilience');

  try {
    return await withCircuitBreaker(
      serviceId,
      () => withRetry(
        () => options.timeoutMs
          ? withTimeout(operation, options.timeoutMs)
          : operation(),
        options.retry,
        log
      ),
      log
    );
  } catch (error) {
    // Store in dead letter queue if supabase and payload provided
    if (options.supabase && options.deadLetterPayload) {
      await storeInDeadLetter(
        options.supabase,
        {
          operation: serviceId,
          payload: options.deadLetterPayload,
          error: error instanceof Error ? error.message : String(error),
          attempts: (options.retry?.maxRetries || 3) + 1,
          metadata: { serviceId },
        },
        log
      );
    }
    throw error;
  }
}
