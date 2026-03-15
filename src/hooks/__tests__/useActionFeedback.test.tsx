import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useActionFeedback } from '@/hooks/useActionFeedback';

describe('useActionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading=false', () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(result.current.loading).toBe(false);
  });

  it('exposes showFeedback function', () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(typeof result.current.showFeedback).toBe('function');
  });

  it('exposes withFeedback function', () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(typeof result.current.withFeedback).toBe('function');
  });

  it('withFeedback runs async action', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockResolvedValue('success');

    await act(async () => {
      await result.current.withFeedback(mockAction, {
        successMessage: 'Done!',
      });
    });

    expect(mockAction).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('withFeedback handles errors', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockRejectedValue(new Error('Boom'));

    await act(async () => {
      try {
        await result.current.withFeedback(mockAction, {
          errorMessage: 'Failed!',
        });
      } catch {
        // Expected
      }
    });

    expect(result.current.loading).toBe(false);
  });
});
