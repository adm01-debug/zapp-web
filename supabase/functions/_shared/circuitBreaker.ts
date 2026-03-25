/**
 * Circuit Breaker pattern for edge functions.
 * Prevents cascading failures by stopping calls to failing external services.
 *
 * Note: This is per-isolate (edge function instance) state.
 * For production, consider using shared state via database or Redis.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting recovery (default: 60000) */
  resetTimeout?: number;
  /** Max requests allowed in HALF_OPEN state (default: 2) */
  halfOpenMaxAttempts?: number;
}

interface CircuitBreakerEntry {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  halfOpenAttempts: number;
}

const store = new Map<string, CircuitBreakerEntry>();

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxAttempts: 2,
};

function getEntry(serviceName: string): CircuitBreakerEntry {
  let entry = store.get(serviceName);
  if (!entry) {
    entry = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureAt: 0,
      halfOpenAttempts: 0,
    };
    store.set(serviceName, entry);
  }
  return entry;
}

function resolveOptions(options?: CircuitBreakerOptions): Required<CircuitBreakerOptions> {
  return { ...DEFAULT_OPTIONS, ...options };
}

/**
 * Check if the circuit allows a request through.
 * Transitions OPEN -> HALF_OPEN when resetTimeout has elapsed.
 */
function canExecute(
  entry: CircuitBreakerEntry,
  opts: Required<CircuitBreakerOptions>,
): boolean {
  const now = Date.now();

  switch (entry.state) {
    case CircuitState.CLOSED:
      return true;

    case CircuitState.OPEN:
      if (now - entry.lastFailureAt >= opts.resetTimeout) {
        // Transition to HALF_OPEN
        entry.state = CircuitState.HALF_OPEN;
        entry.halfOpenAttempts = 0;
        return true;
      }
      return false;

    case CircuitState.HALF_OPEN:
      return entry.halfOpenAttempts < opts.halfOpenMaxAttempts;
  }
}

/**
 * Record a successful call. Resets the circuit to CLOSED.
 */
function recordSuccess(entry: CircuitBreakerEntry): void {
  entry.state = CircuitState.CLOSED;
  entry.failureCount = 0;
  entry.halfOpenAttempts = 0;
}

/**
 * Record a failed call. May transition to OPEN.
 */
function recordFailure(
  entry: CircuitBreakerEntry,
  opts: Required<CircuitBreakerOptions>,
): void {
  entry.failureCount++;
  entry.lastFailureAt = Date.now();

  if (entry.state === CircuitState.HALF_OPEN) {
    // Any failure in HALF_OPEN immediately opens the circuit
    entry.state = CircuitState.OPEN;
    entry.halfOpenAttempts = 0;
    return;
  }

  if (entry.failureCount >= opts.failureThreshold) {
    entry.state = CircuitState.OPEN;
  }
}

/**
 * Execute a function with circuit breaker protection.
 *
 * @param serviceName - Identifier for the external service (e.g. 'ai-gateway', 'resend')
 * @param fn - The async function to execute
 * @param options - Circuit breaker configuration
 * @returns The result of fn()
 * @throws Error if circuit is OPEN or fn throws
 */
export async function executeWithCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: CircuitBreakerOptions,
): Promise<T> {
  const opts = resolveOptions(options);
  const entry = getEntry(serviceName);

  if (!canExecute(entry, opts)) {
    throw new Error(`Circuit breaker OPEN for service: ${serviceName}`);
  }

  if (entry.state === CircuitState.HALF_OPEN) {
    entry.halfOpenAttempts++;
  }

  try {
    const result = await fn();
    recordSuccess(entry);
    return result;
  } catch (error) {
    recordFailure(entry, opts);
    throw error;
  }
}

/**
 * Get the current state of a circuit breaker (useful for health checks / debugging).
 */
export function getCircuitBreakerState(serviceName: string): {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
} {
  const entry = getEntry(serviceName);
  return {
    state: entry.state,
    failureCount: entry.failureCount,
    lastFailureAt: entry.lastFailureAt,
  };
}
