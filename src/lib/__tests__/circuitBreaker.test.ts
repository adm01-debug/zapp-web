import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeout: 1000,
    });
  });

  it('starts in closed state', () => {
    expect(breaker.getState()).toBe('closed');
  });

  it('passes through successful calls', async () => {
    const result = await breaker.execute(async () => 42);
    expect(result).toBe(42);
    expect(breaker.getState()).toBe('closed');
  });

  it('opens after reaching failure threshold', async () => {
    const failFn = async () => { throw new Error('fail'); };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    }

    expect(breaker.getState()).toBe('open');
  });

  it('rejects calls immediately when open', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    }

    // Should throw CircuitOpenError without executing the function
    const spy = vi.fn();
    await expect(breaker.execute(spy)).rejects.toThrow(CircuitOpenError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('transitions to half-open after reset timeout', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    }
    expect(breaker.getState()).toBe('open');

    // Fast-forward past reset timeout
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    // Next call should be allowed (half-open)
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('closed');

    vi.useRealTimers();
  });

  it('reopens if half-open test call fails', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    }

    // Fast-forward past reset timeout
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    // Half-open test call fails
    await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    // Should be open again (failure count incremented past threshold)
    expect(breaker.getState()).toBe('open');

    vi.useRealTimers();
  });

  it('resets failure count on success', async () => {
    const failFn = async () => { throw new Error('fail'); };

    // 2 failures (below threshold)
    await expect(breaker.execute(failFn)).rejects.toThrow();
    await expect(breaker.execute(failFn)).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');

    // Success resets counter
    await breaker.execute(async () => 'ok');

    // 2 more failures should not open (counter was reset)
    await expect(breaker.execute(failFn)).rejects.toThrow();
    await expect(breaker.execute(failFn)).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');
  });

  it('manual reset closes the circuit', async () => {
    const failFn = async () => { throw new Error('fail'); };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
    }
    expect(breaker.getState()).toBe('open');

    breaker.reset();
    expect(breaker.getState()).toBe('closed');

    const result = await breaker.execute(async () => 'works');
    expect(result).toBe('works');
  });

  it('CircuitOpenError has correct name', () => {
    const error = new CircuitOpenError('test');
    expect(error.name).toBe('CircuitOpenError');
    expect(error.message).toBe('test');
    expect(error).toBeInstanceOf(Error);
  });
});
