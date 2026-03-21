import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('imports without error', async () => {
    const logger = await import('@/lib/logger');
    expect(logger).toBeDefined();
  });

  it('log object has error method', async () => {
    const { log } = await import('@/lib/logger');
    expect(typeof log.error).toBe('function');
  });

  it('log object has debug method', async () => {
    const { log } = await import('@/lib/logger');
    expect(typeof log.debug).toBe('function');
  });

  it('log object has info method', async () => {
    const { log } = await import('@/lib/logger');
    expect(typeof log.info).toBe('function');
  });

  it('log.error does not throw', async () => {
    const { log } = await import('@/lib/logger');
    expect(() => log.error('test error')).not.toThrow();
  });

  it('log.debug does not throw', async () => {
    const { log } = await import('@/lib/logger');
    expect(() => log.debug('test debug')).not.toThrow();
  });

  it('log.info does not throw', async () => {
    const { log } = await import('@/lib/logger');
    expect(() => log.info('test info')).not.toThrow();
  });

  it('getLogger creates named logger', async () => {
    const { getLogger } = await import('@/lib/logger');
    if (getLogger) {
      const namedLog = getLogger('TestModule');
      expect(namedLog).toBeDefined();
    }
  });

  it('log.warn does not throw', async () => {
    const { log } = await import('@/lib/logger');
    expect(() => log.warn('test warning')).not.toThrow();
  });

  it('log object has warn method', async () => {
    const { log } = await import('@/lib/logger');
    expect(typeof log.warn).toBe('function');
  });

  it('createLogger returns a logger', async () => {
    const { createLogger } = await import('@/lib/logger');
    const logger = createLogger('MyModule');
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('getLogger returns same instance for same module', async () => {
    const { getLogger } = await import('@/lib/logger');
    const a = getLogger('SameModule');
    const b = getLogger('SameModule');
    expect(a).toBe(b);
  });

  it('logPerformance exists and is a function', async () => {
    const { logPerformance } = await import('@/lib/logger');
    expect(typeof logPerformance).toBe('function');
  });

  it('logPerformance calls the provided function', async () => {
    const { logPerformance } = await import('@/lib/logger');
    const fn = vi.fn();
    logPerformance('test', fn);
    expect(fn).toHaveBeenCalled();
  });

  it('logAsyncPerformance calls async function and returns result', async () => {
    const { logAsyncPerformance } = await import('@/lib/logger');
    const result = await logAsyncPerformance('test', async () => 42);
    expect(result).toBe(42);
  });

  it('logger default export is defined', async () => {
    const { logger } = await import('@/lib/logger');
    expect(logger).toBeDefined();
  });
});
