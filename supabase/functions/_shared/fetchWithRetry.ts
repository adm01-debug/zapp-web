/**
 * Fetch with timeout and exponential backoff retry.
 * Used by all edge functions that call external APIs.
 */

import { executeWithCircuitBreaker, type CircuitBreakerOptions } from './circuitBreaker.ts';

export interface FetchOptions extends RequestInit {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** When set, wraps the fetch call with a circuit breaker for this service */
  circuitBreakerService?: string;
  /** Circuit breaker configuration (only used when circuitBreakerService is set) */
  circuitBreakerOptions?: CircuitBreakerOptions;
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    maxRetries = 3,
    baseDelay = 1000,
    circuitBreakerService,
    circuitBreakerOptions,
    ...fetchOptions
  } = options;

  const doFetch = async (): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Retry on server errors or rate limiting
        if (response.status >= 500 || response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.min(baseDelay * Math.pow(2, attempt), 10000);

          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms: ${url}`);
        }

        // Retry on network errors
        if (attempt < maxRetries - 1) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${maxRetries} attempts: ${url}`);
  };

  if (circuitBreakerService) {
    return executeWithCircuitBreaker(circuitBreakerService, doFetch, circuitBreakerOptions);
  }

  return doFetch();
}
