import { log } from '@/lib/logger';

/**
 * Lightweight performance monitoring for critical operations.
 * Uses the Performance API when available, falls back to Date.now().
 */

const SLOW_THRESHOLD_MS = 3000;

interface PerfEntry {
  name: string;
  duration: number;
  timestamp: number;
}

const recentEntries: PerfEntry[] = [];
const MAX_ENTRIES = 100;

function getTime(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Measure the duration of an async operation.
 */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = getTime();
  try {
    return await fn();
  } finally {
    const duration = Math.round(getTime() - start);
    recordEntry(name, duration);
  }
}

/**
 * Create a manual timer for measuring durations.
 */
export function startTimer(name: string) {
  const start = getTime();
  return {
    stop(): number {
      const duration = Math.round(getTime() - start);
      recordEntry(name, duration);
      return duration;
    },
  };
}

function recordEntry(name: string, duration: number): void {
  const entry: PerfEntry = { name, duration, timestamp: Date.now() };

  if (recentEntries.length >= MAX_ENTRIES) {
    recentEntries.shift();
  }
  recentEntries.push(entry);

  if (duration > SLOW_THRESHOLD_MS) {
    log.warn(`Slow operation: ${name} took ${duration}ms`);
  }
}

/**
 * Get recent performance entries for debugging.
 */
export function getRecentEntries(): readonly PerfEntry[] {
  return recentEntries;
}

/**
 * Report Web Vitals (LCP, FID, CLS) when available.
 * Should be called once on app init.
 */
export function reportWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      log.info(`[WebVitals] LCP: ${Math.round(lastEntry.startTime)}ms`);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const processingStart = (entry as PerformanceEventTiming).processingStart;
        if (processingStart) {
          log.info(`[WebVitals] FID: ${Math.round(processingStart - entry.startTime)}ms`);
        }
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as LayoutShiftEntry).hadRecentInput) {
          clsValue += (entry as LayoutShiftEntry).value;
        }
      }
      if (clsValue > 0) {
        log.info(`[WebVitals] CLS: ${clsValue.toFixed(4)}`);
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // PerformanceObserver not fully supported
  }
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}
