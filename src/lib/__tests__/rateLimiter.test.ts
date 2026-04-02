import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const limiter = new RateLimiter(3, 1000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('allows requests after window expires', () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);

    vi.advanceTimersByTime(1100);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('sliding window works correctly', () => {
    const limiter = new RateLimiter(2, 1000);

    // t=0: first request
    expect(limiter.tryAcquire()).toBe(true);

    // t=500: second request
    vi.advanceTimersByTime(500);
    expect(limiter.tryAcquire()).toBe(true);

    // t=500: third blocked
    expect(limiter.tryAcquire()).toBe(false);

    // t=1100: first expired, third now allowed
    vi.advanceTimersByTime(600);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('getRetryAfter returns 0 when allowed', () => {
    const limiter = new RateLimiter(5, 1000);
    expect(limiter.getRetryAfter()).toBe(0);
  });

  it('getRetryAfter returns time until next allowed', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.tryAcquire();

    const retryAfter = limiter.getRetryAfter();
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(1000);
  });

  it('reset clears all timestamps', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);

    limiter.reset();
    expect(limiter.tryAcquire()).toBe(true);
  });
});
