// Centralized logging utility for development and production
// Logs are automatically stripped in production builds

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  module?: string;
  [key: string]: unknown;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!isDev && (level === 'debug' || level === 'info')) {
      return false;
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    console.debug(this.formatMessage('debug', message, context), context || '');
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.info(this.formatMessage('info', message, context), context || '');
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message, context), context || '');
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message, context), error, context || '');
  }
}

// Factory function to create module-specific loggers
export function createLogger(module: string): Logger {
  return new Logger(module);
}

// Default logger for quick usage
export const logger = new Logger('App');

// Specific module loggers (lazy-loaded)
const loggers: Record<string, Logger> = {};

export function getLogger(module: string): Logger {
  if (!loggers[module]) {
    loggers[module] = new Logger(module);
  }
  return loggers[module];
}

// Performance logging
export function logPerformance(label: string, fn: () => void): void {
  if (!isDev) {
    fn();
    return;
  }
  
  const start = performance.now();
  fn();
  const end = performance.now();
  console.debug(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
}

// Async performance logging
export async function logAsyncPerformance<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isDev) {
    return fn();
  }
  
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.debug(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}
