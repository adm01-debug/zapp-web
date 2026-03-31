import { useEffect, useRef } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('RenderPerf');

/**
 * Development-only hook that warns when a component re-renders excessively.
 * Tracks render count and logs warnings if renders exceed threshold in a time window.
 *
 * @param componentName - Name of the component for logging
 * @param threshold - Max renders allowed in the time window (default: 10)
 * @param windowMs - Time window in ms (default: 1000)
 */
export function useRenderTracker(
  componentName: string,
  threshold = 10,
  windowMs = 1000
): void {
  const renderTimestamps = useRef<number[]>([]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const now = Date.now();
    const cutoff = now - windowMs;

    // Keep only timestamps within the window
    renderTimestamps.current = renderTimestamps.current.filter(t => t > cutoff);
    renderTimestamps.current.push(now);

    if (renderTimestamps.current.length > threshold) {
      log.warn(
        `[PERF] ${componentName} rendered ${renderTimestamps.current.length} times in ${windowMs}ms — possible re-render loop`
      );
    }
  });
}
