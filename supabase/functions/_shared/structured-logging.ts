/**
 * Structured Logging Module for Edge Functions
 * Provides consistent, JSON-formatted logging with context tracking
 * 
 * @module structured-logging
 */

// Log levels with numeric priority for filtering
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  requestId?: string;
  instanceId?: string;
  userId?: string;
  contactId?: string;
  messageId?: string;
  phone?: string;
  event?: string;
  action?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  duration_ms?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

// Environment-based log level (default: INFO)
const MIN_LOG_LEVEL = (() => {
  const envLevel = Deno.env.get('LOG_LEVEL')?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'FATAL': return LogLevel.FATAL;
    default: return LogLevel.INFO;
  }
})();

/**
 * StructuredLogger - A context-aware logger for edge functions
 */
export class StructuredLogger {
  private context: LogContext;
  private startTime: number;

  constructor(initialContext: LogContext = {}) {
    this.context = {
      requestId: crypto.randomUUID().substring(0, 8),
      ...initialContext,
    };
    this.startTime = Date.now();
  }

  /**
   * Add context that will be included in all subsequent logs
   */
  setContext(ctx: Partial<LogContext>): this {
    this.context = { ...this.context, ...ctx };
    return this;
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: Partial<LogContext>): StructuredLogger {
    const child = new StructuredLogger({ ...this.context, ...childContext });
    child.startTime = this.startTime;
    return child;
  }

  /**
   * Log a debug message (verbose, development only)
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an info message (normal operation)
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a warning (potential issue, non-fatal)
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an error (operation failed but recoverable)
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
        ? { name: 'UnknownError', message: String(error) }
        : undefined;
    
    this.log(LogLevel.ERROR, message, metadata, errorDetails);
  }

  /**
   * Log a fatal error (critical failure)
   */
  fatal(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
        ? { name: 'UnknownError', message: String(error) }
        : undefined;
    
    this.log(LogLevel.FATAL, message, metadata, errorDetails);
  }

  /**
   * Time an async operation and log its duration
   */
  async time<T>(
    label: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      this.info(`${label} completed`, { ...metadata, duration_ms: Date.now() - start });
      return result;
    } catch (error) {
      this.error(`${label} failed`, error, { ...metadata, duration_ms: Date.now() - start });
      throw error;
    }
  }

  /**
   * Log request completion with total duration
   */
  requestComplete(status: number, metadata?: Record<string, unknown>): void {
    const duration_ms = Date.now() - this.startTime;
    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, 'Request completed', { ...metadata, status, duration_ms });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: { name: string; message: string; stack?: string }
  ): void {
    if (level < MIN_LOG_LEVEL) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      duration_ms: metadata?.duration_ms as number | undefined,
      error,
      metadata: metadata && Object.keys(metadata).filter(k => k !== 'duration_ms').length > 0
        ? Object.fromEntries(Object.entries(metadata).filter(([k]) => k !== 'duration_ms'))
        : undefined,
    };

    // Clean undefined values
    const cleanEntry = JSON.parse(JSON.stringify(entry));

    // Output based on level
    const output = JSON.stringify(cleanEntry);
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }
}

/**
 * Create a logger for a specific function/module
 */
export function createLogger(moduleName: string, context?: LogContext): StructuredLogger {
  return new StructuredLogger({ module: moduleName, ...context });
}

/**
 * Quick metrics tracking helper
 */
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  record(metric: string, value: number): void {
    const existing = this.metrics.get(metric) || [];
    existing.push(value);
    this.metrics.set(metric, existing);
  }

  getSummary(): Record<string, { count: number; min: number; max: number; avg: number }> {
    const summary: Record<string, { count: number; min: number; max: number; avg: number }> = {};
    
    for (const [metric, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      summary[metric] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      };
    }
    
    return summary;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// ========================================
// Request Tracing
// ========================================

/**
 * Extract trace context from request headers (for distributed tracing)
 */
export function extractTraceContext(req: Request): LogContext {
  return {
    requestId: req.headers.get('x-request-id') || req.headers.get('x-trace-id') || crypto.randomUUID().substring(0, 8),
    userAgent: req.headers.get('user-agent')?.substring(0, 100),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip'),
  };
}

/**
 * Create a logger from a request with automatic context extraction
 */
export function loggerFromRequest(moduleName: string, req: Request): StructuredLogger {
  return createLogger(moduleName, extractTraceContext(req));
}
