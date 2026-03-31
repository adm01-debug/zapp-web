import { useCallback, useRef } from 'react';
import { getLogger, generateCorrelationId } from '@/lib/logger';

const log = getLogger('ErrorReporter');

interface ErrorReport {
  message: string;
  source: string;
  correlationId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

/**
 * Hook for structured error reporting with correlation IDs.
 * Captures error context, deduplicates rapid-fire errors, and logs structured reports.
 */
export function useErrorReporter(source: string) {
  const recentErrors = useRef<Map<string, number>>(new Map());
  const DEDUP_WINDOW_MS = 5000;

  const reportError = useCallback(
    (error: unknown, metadata?: Record<string, unknown>) => {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      // Deduplicate: skip if same error reported within window
      const errorKey = `${source}:${message}`;
      const lastReported = recentErrors.current.get(errorKey);
      const now = Date.now();

      if (lastReported && now - lastReported < DEDUP_WINDOW_MS) {
        return null;
      }
      recentErrors.current.set(errorKey, now);

      // Clean old entries
      if (recentErrors.current.size > 50) {
        const cutoff = now - DEDUP_WINDOW_MS;
        for (const [key, time] of recentErrors.current.entries()) {
          if (time < cutoff) recentErrors.current.delete(key);
        }
      }

      const report: ErrorReport = {
        message,
        source,
        correlationId: generateCorrelationId('err'),
        timestamp: new Date().toISOString(),
        metadata,
        stack,
      };

      log.error(
        `[${report.correlationId}] ${report.source}: ${report.message}`,
        report.metadata
      );

      return report;
    },
    [source]
  );

  const reportWarning = useCallback(
    (message: string, metadata?: Record<string, unknown>) => {
      const correlationId = generateCorrelationId('warn');
      log.warn(`[${correlationId}] ${source}: ${message}`, metadata);
      return correlationId;
    },
    [source]
  );

  return { reportError, reportWarning };
}
