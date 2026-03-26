/**
 * Real User Monitoring (RUM) — collects frontend performance metrics
 * and Core Web Vitals. Metrics are flushed periodically via console.warn
 * so they can be picked up by any log aggregator or swapped to an endpoint.
 */

interface RUMMetric {
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const metrics: RUMMetric[] = [];
let flushIntervalId: ReturnType<typeof setInterval> | null = null;
let initialized = false;

// ─── Helpers ───────────────────────────────────────────────

function push(name: string, value: number, metadata?: Record<string, unknown>) {
  metrics.push({
    name,
    value,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata }),
  });
}

function flush() {
  if (metrics.length === 0) return;
  const batch = metrics.splice(0);
  console.warn('[RUM]', JSON.stringify(batch));
}

// ─── Core Web Vitals & Observers ───────────────────────────

function observeLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        push('LCP', last.startTime, { element: (last as unknown as { element?: Element }).element?.tagName });
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Not supported
  }
}

function observeFID() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        push('FID', fidEntry.processingStart - fidEntry.startTime, {
          eventType: fidEntry.name,
        });
      }
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // Not supported
  }
}

function observeCLS() {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as unknown as { hadRecentInput: boolean; value: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value ?? 0;
        }
      }
      push('CLS', clsValue);
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Not supported
  }
}

function observeLongTasks() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        push('long-task', entry.duration, {
          startTime: entry.startTime,
        });
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // Not supported
  }
}

function collectNavigationTiming() {
  // Defer to ensure navigation timing is populated
  setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;

    push('page-load', nav.loadEventEnd - nav.startTime, {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      domInteractive: nav.domInteractive - nav.startTime,
      transferSize: nav.transferSize,
    });
  }, 0);
}

function trackErrors() {
  window.addEventListener('error', (event) => {
    push('unhandled-error', 1, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    push('unhandled-rejection', 1, {
      reason: String(event.reason),
    });
  });
}

// ─── Public API ────────────────────────────────────────────

/**
 * Initialize RUM collection. Safe to call multiple times; only runs once.
 */
export function initRUM() {
  if (initialized) return;
  initialized = true;

  collectNavigationTiming();
  observeLCP();
  observeFID();
  observeCLS();
  observeLongTasks();
  trackErrors();

  // Periodic flush every 30 seconds
  flushIntervalId = setInterval(flush, 30_000);

  // Flush on page unload
  const onUnload = () => flush();
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onUnload();
    }
  });
  window.addEventListener('pagehide', onUnload);
}

/**
 * Track a route change manually (e.g. from React Router).
 */
export function trackRouteChange(route: string, duration: number) {
  push('route-change', duration, { route });
}

/**
 * Track an arbitrary custom metric.
 */
export function trackCustomMetric(name: string, value: number, metadata?: Record<string, unknown>) {
  push(name, value, metadata);
}
