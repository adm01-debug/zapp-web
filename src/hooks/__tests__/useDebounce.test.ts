import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('initial');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    rerender({ value: 'b', delay: 300 });
    act(() => vi.advanceTimersByTime(200));

    rerender({ value: 'c', delay: 300 });
    act(() => vi.advanceTimersByTime(200));

    // 'c' hasn't resolved yet (only 200ms since last change)
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toBe('c');
  });

  it('works with zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'init', delay: 0 } }
    );

    rerender({ value: 'zero', delay: 0 });

    act(() => vi.advanceTimersByTime(0));

    expect(result.current).toBe('zero');
  });

  it('handles number values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 200 } }
    );

    rerender({ value: 100, delay: 200 });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe(100);
  });

  it('handles null/undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string | null; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: null as string | null, delay: 200 } }
    );

    expect(result.current).toBeNull();

    rerender({ value: 'now set', delay: 200 });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe('now set');
  });
});
