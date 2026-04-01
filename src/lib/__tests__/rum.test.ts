import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Reset module state before each test
let initRUM: () => void;
let trackRouteChange: (route: string, duration: number) => void;
let trackCustomMetric: (name: string, value: number, metadata?: Record<string, unknown>) => void;

describe('rum', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock PerformanceObserver
    const mockObserve = vi.fn();
    vi.stubGlobal('PerformanceObserver', class {
      constructor(_cb: unknown) {}
      observe = mockObserve;
    });

    // Mock performance.getEntriesByType
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);

    const mod = await import('../rum');
    initRUM = mod.initRUM;
    trackRouteChange = mod.trackRouteChange;
    trackCustomMetric = mod.trackCustomMetric;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initRUM sets up observers without error', () => {
    expect(() => initRUM()).not.toThrow();
  });

  it('initRUM is idempotent — second call is a no-op', () => {
    initRUM();
    initRUM(); // should not throw or double-setup
  });

  it('trackCustomMetric pushes a metric that gets flushed', () => {
    initRUM();
    trackCustomMetric('test-metric', 42, { foo: 'bar' });
    // Trigger flush via interval (30s)
    vi.advanceTimersByTime(30_000);
    expect(warnSpy).toHaveBeenCalledWith(
      '[RUM]',
      expect.stringContaining('"test-metric"')
    );
    const flushedData = JSON.parse(warnSpy.mock.calls.find(c => c[0] === '[RUM]')![1] as string);
    const metric = flushedData.find((m: { name: string }) => m.name === 'test-metric');
    expect(metric).toBeDefined();
    expect(metric.value).toBe(42);
    expect(metric.metadata).toEqual({ foo: 'bar' });
  });

  it('trackRouteChange pushes route-change metric', () => {
    initRUM();
    trackRouteChange('/dashboard', 150);
    vi.advanceTimersByTime(30_000);
    expect(warnSpy).toHaveBeenCalledWith(
      '[RUM]',
      expect.stringContaining('"route-change"')
    );
    const flushedData = JSON.parse(warnSpy.mock.calls.find(c => c[0] === '[RUM]')![1] as string);
    const metric = flushedData.find((m: { name: string }) => m.name === 'route-change');
    expect(metric.value).toBe(150);
    expect(metric.metadata.route).toBe('/dashboard');
  });

  it('flush is a no-op when there are no metrics', () => {
    initRUM();
    vi.advanceTimersByTime(30_000);
    // Should not call console.warn when no metrics
    expect(warnSpy).not.toHaveBeenCalledWith('[RUM]', expect.any(String));
  });

  it('metrics include timestamp', () => {
    initRUM();
    trackCustomMetric('ts-test', 1);
    vi.advanceTimersByTime(30_000);
    const flushedData = JSON.parse(warnSpy.mock.calls.find(c => c[0] === '[RUM]')![1] as string);
    expect(flushedData[0].timestamp).toBeDefined();
    expect(typeof flushedData[0].timestamp).toBe('string');
  });
});
