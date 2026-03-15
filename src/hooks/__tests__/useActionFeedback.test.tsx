import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

import { useActionFeedback } from '@/hooks/useActionFeedback';

describe('useActionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading=false', () => {
    const { result } = renderHook(() => useActionFeedback());
    expect(result.current.isLoading).toBe(false);
  });

  it('executeWithFeedback runs async action', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockResolvedValue('success');

    await act(async () => {
      await result.current.executeWithFeedback(mockAction, {
        loadingMessage: 'Loading...',
        successMessage: 'Done!',
        errorMessage: 'Failed!',
      });
    });

    expect(mockAction).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles action failure', async () => {
    const { result } = renderHook(() => useActionFeedback());
    const mockAction = vi.fn().mockRejectedValue(new Error('Boom'));

    await act(async () => {
      try {
        await result.current.executeWithFeedback(mockAction, {
          loadingMessage: 'Loading...',
          successMessage: 'Done!',
          errorMessage: 'Failed!',
        });
      } catch {
        // Expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
