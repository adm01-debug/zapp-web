/**
 * Structured JSON logger for Supabase Edge Functions.
 * Outputs machine-readable logs with request context, timing, and trace IDs.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  traceId?: string;
  duration_ms?: number;
  status_code?: number;
  method?: string;
  path?: string;
  error?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface Timer {
  end: (metadata?: Record<string, unknown>) => void;
}

interface StructuredLogger {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  startTimer: (operation: string) => Timer;
  logRequest: (req: Request, res: Response, duration: number) => void;
  setRequestContext: (req: Request) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function createStructuredLogger(serviceName: string): StructuredLogger {
  let requestId: string | undefined;
  let traceId: string | undefined;
  let method: string | undefined;
  let path: string | undefined;

  function emit(level: LogLevel, message: string, extra?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...(requestId && { requestId }),
      ...(traceId && { traceId }),
      ...(method && { method }),
      ...(path && { path }),
      ...extra,
    };

    const line = JSON.stringify(entry);

    switch (level) {
      case 'ERROR':
        console.error(line);
        break;
      case 'WARN':
        console.warn(line);
        break;
      case 'DEBUG':
        console.debug(line);
        break;
      default:
        console.log(line);
    }
  }

  return {
    setRequestContext(req: Request) {
      requestId = req.headers.get('x-request-id') || generateId();
      traceId = req.headers.get('x-trace-id') || generateId();
      method = req.method;
      try {
        const url = new URL(req.url);
        path = url.pathname;
      } catch {
        path = req.url;
      }
    },

    info(message: string, metadata?: Record<string, unknown>) {
      emit('INFO', message, metadata ? { metadata } : undefined);
    },

    warn(message: string, metadata?: Record<string, unknown>) {
      emit('WARN', message, metadata ? { metadata } : undefined);
    },

    error(message: string, metadata?: Record<string, unknown>) {
      emit('ERROR', message, metadata ? { metadata } : undefined);
    },

    debug(message: string, metadata?: Record<string, unknown>) {
      emit('DEBUG', message, metadata ? { metadata } : undefined);
    },

    startTimer(operation: string): Timer {
      const start = performance.now();
      return {
        end(metadata?: Record<string, unknown>) {
          const duration_ms = Math.round((performance.now() - start) * 100) / 100;
          emit('INFO', `${operation} completed`, {
            duration_ms,
            metadata: { operation, ...metadata },
          });
        },
      };
    },

    logRequest(req: Request, res: Response, duration: number) {
      const level: LogLevel = res.status >= 500 ? 'ERROR' : res.status >= 400 ? 'WARN' : 'INFO';
      emit(level, `${req.method} ${path || req.url} ${res.status}`, {
        status_code: res.status,
        duration_ms: Math.round(duration * 100) / 100,
      });
    },
  };
}
