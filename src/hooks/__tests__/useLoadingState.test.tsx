import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useLoadingState } from '@/hooks/useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading=false', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading to true', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('sets loading to false', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading();
    });

    act(() => {
      result.current.stopLoading();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('withLoading wraps async function', async () => {
    const { result } = renderHook(() => useLoadingState());
    const fn = vi.fn().mockResolvedValue('done');

    await act(async () => {
      await result.current.withLoading(fn);
    });

    expect(fn).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('withLoading handles errors', async () => {
    const { result } = renderHook(() => useLoadingState());
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await act(async () => {
      try {
        await result.current.withLoading(fn);
      } catch {
        // Expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('initializes with custom initial state', () => {
    const { result } = renderHook(() => useLoadingState(true));
    expect(result.current.isLoading).toBe(true);
  });
});
