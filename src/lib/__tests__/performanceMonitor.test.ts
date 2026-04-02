import { describe, it, expect, vi } from 'vitest';
import { measureAsync, startTimer, getRecentEntries } from '../performanceMonitor';

describe('performanceMonitor', () => {
  it('measureAsync returns the function result', async () => {
    const result = await measureAsync('test-op', async () => 42);
    expect(result).toBe(42);
  });

  it('measureAsync records an entry', async () => {
    await measureAsync('recorded-op', async () => 'done');
    const entries = getRecentEntries();
    const found = entries.find(e => e.name === 'recorded-op');
    expect(found).toBeDefined();
    expect(found!.duration).toBeGreaterThanOrEqual(0);
  });

  it('measureAsync propagates errors', async () => {
    await expect(
      measureAsync('failing-op', async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    // Should still record the entry even on failure
    const entries = getRecentEntries();
    expect(entries.find(e => e.name === 'failing-op')).toBeDefined();
  });

  it('startTimer measures duration', async () => {
    const timer = startTimer('manual-timer');
    await new Promise(r => setTimeout(r, 10));
    const duration = timer.stop();
    expect(duration).toBeGreaterThanOrEqual(0);

    const entries = getRecentEntries();
    expect(entries.find(e => e.name === 'manual-timer')).toBeDefined();
  });

  it('getRecentEntries returns readonly array', () => {
    const entries = getRecentEntries();
    expect(Array.isArray(entries)).toBe(true);
  });
});
