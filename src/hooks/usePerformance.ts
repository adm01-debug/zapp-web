import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { log } from '@/lib/logger';

// ============================================
// PERFORMANCE HOOKS
// ============================================

/**
 * Debounce hook with cleanup
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for high-frequency updates
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersection(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Lazy load component when visible
 */
export function useLazyLoad(
  ref: React.RefObject<Element>,
  threshold = 0.1
): { isVisible: boolean; hasLoaded: boolean } {
  const [hasLoaded, setHasLoaded] = useState(false);
  const isVisible = useIntersection(ref, { threshold });

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isVisible, hasLoaded]);

  return { isVisible, hasLoaded };
}

/**
 * Measure component render performance
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      log.debug(`${componentName} rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
}

/**
 * Track memory usage (development only)
 */
export function useMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  const [memory, setMemory] = useState<{ usedJSHeapSize: number; totalJSHeapSize: number } | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD) return;
    
    // Chrome-specific Performance API extension
    interface PerformanceMemory {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }
    
    interface PerformanceWithMemory extends Performance {
      memory?: PerformanceMemory;
    }
    
    const checkMemory = () => {
      const perf = performance as PerformanceWithMemory;
      if (perf.memory) {
        setMemory({
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
        });
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 5000);

    return () => clearInterval(interval);
  }, []);

  return memory;
}

/**
 * Optimized event listener with passive support
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: WindowEventMap[K]) => savedHandler.current(event);
    
    window.addEventListener(eventName, eventListener, { passive: true, ...options });
    
    return () => {
      window.removeEventListener(eventName, eventListener);
    };
  }, [eventName, options]);
}

/**
 * RAF-based animation frame hook
 */
export function useAnimationFrame(callback: (deltaTime: number) => void, isRunning = true) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  useEffect(() => {
    if (!isRunning) return;

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, isRunning]);
}

/**
 * Memoized callback with stable reference
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Optimized list with windowing info
 */
export function useOptimizedList<T>(
  items: T[],
  options: {
    pageSize?: number;
    initialPage?: number;
  } = {}
) {
  const { pageSize = 20, initialPage = 1 } = options;
  const [page, setPage] = useState(initialPage);

  const paginatedItems = useMemo(() => {
    return items.slice(0, page * pageSize);
  }, [items, page, pageSize]);

  const hasMore = paginatedItems.length < items.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setPage(p => p + 1);
    }
  }, [hasMore]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    items: paginatedItems,
    hasMore,
    loadMore,
    reset,
    totalItems: items.length,
    loadedItems: paginatedItems.length,
  };
}

/**
 * Prefetch data on hover
 */
export function usePrefetch<T>(
  fetcher: () => Promise<T>,
  options: { delay?: number } = {}
) {
  const { delay = 150 } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef<T | null>(null);
  const [isPrefetched, setIsPrefetched] = useState(false);

  const prefetch = useCallback(() => {
    if (isPrefetched) return;

    timeoutRef.current = setTimeout(async () => {
      try {
        dataRef.current = await fetcher();
        setIsPrefetched(true);
      } catch (error) {
        log.error('Prefetch failed:', error);
      }
    }, delay);
  }, [fetcher, delay, isPrefetched]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const getData = useCallback(() => dataRef.current, []);

  return {
    prefetch,
    cancelPrefetch,
    getData,
    isPrefetched,
  };
}

/**
 * Idle callback for non-critical updates
 */
export function useIdleCallback(callback: () => void, options?: IdleRequestOptions) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, options);
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, 100);
      return () => clearTimeout(id);
    }
  }, [callback, options]);
}

/**
 * Track FPS
 */
export function useFPS(): number {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useAnimationFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta));
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return fps;
}

/**
 * Detect slow renders
 */
export function usePerformanceMonitor(
  componentName: string,
  threshold = 16 // 60fps = ~16ms per frame
) {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();
  });

  useEffect(() => {
    if (startTime.current && process.env.NODE_ENV === 'development') {
      const renderTime = performance.now() - startTime.current;
      if (renderTime > threshold) {
        log.warn(
          `⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    }
  });
}

/**
 * Resource preloading
 */
export function usePreloadResources(resources: Array<{ type: 'image' | 'script' | 'style'; url: string }>) {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    resources.forEach(({ type, url }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      switch (type) {
        case 'image':
          link.as = 'image';
          break;
        case 'script':
          link.as = 'script';
          break;
        case 'style':
          link.as = 'style';
          break;
      }

      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach(link => link.remove());
    };
  }, [resources]);
}
