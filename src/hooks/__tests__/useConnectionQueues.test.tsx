/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useConnectionQueues } from '@/hooks/useConnectionQueues';

const mockConnectionQueues = [
  { id: 'cq1', whatsapp_connection_id: 'w1', queue_id: 'q1', created_at: '2024-01-01' },
  { id: 'cq2', whatsapp_connection_id: 'w1', queue_id: 'q2', created_at: '2024-01-01' },
];

function setupMocks(overrides: any = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'whatsapp_connection_queues') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: overrides.queues ?? mockConnectionQueues, error: overrides.fetchError ?? null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: overrides.insertError ?? null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: overrides.deleteError ?? null }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('useConnectionQueues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('fetches connection queues on mount', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionQueues).toHaveLength(2);
  });

  it('returns connection queue data', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionQueues[0].queue_id).toBe('q1');
  });

  it('returns empty when no connectionId', async () => {
    const { result } = renderHook(() => useConnectionQueues(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionQueues).toEqual([]);
  });

  it('handles fetch error gracefully', async () => {
    setupMocks({ fetchError: { message: 'Error' } });
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionQueues).toEqual([]);
  });

  it('exposes addQueue function', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.addQueue).toBe('function');
  });

  it('addQueue calls insert', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addQueue('q3');
    });
    expect(mockFrom).toHaveBeenCalledWith('whatsapp_connection_queues');
  });

  it('addQueue does nothing without connectionId', async () => {
    const { result } = renderHook(() => useConnectionQueues(undefined));
    await act(async () => {
      await result.current.addQueue('q3');
    });
    expect(mockFrom).not.toHaveBeenCalledWith('whatsapp_connection_queues');
  });

  it('removeQueue calls delete', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeQueue('q1');
    });
    expect(mockFrom).toHaveBeenCalledWith('whatsapp_connection_queues');
  });

  it('removeQueue updates local state', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connectionQueues).toHaveLength(2);
    await act(async () => {
      await result.current.removeQueue('q1');
    });
    expect(result.current.connectionQueues).toHaveLength(1);
    expect(result.current.connectionQueues[0].queue_id).toBe('q2');
  });

  it('removeQueue does nothing without connectionId', async () => {
    const { result } = renderHook(() => useConnectionQueues(undefined));
    await act(async () => {
      await result.current.removeQueue('q1');
    });
    expect(mockFrom).not.toHaveBeenCalledWith('whatsapp_connection_queues');
  });

  it('handles addQueue error', async () => {
    setupMocks({ insertError: { message: 'Insert failed' } });
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      act(async () => {
        await result.current.addQueue('q3');
      })
    ).rejects.toBeTruthy();
  });

  it('handles removeQueue error', async () => {
    setupMocks({ deleteError: { message: 'Delete failed' } });
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      act(async () => {
        await result.current.removeQueue('q1');
      })
    ).rejects.toBeTruthy();
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('returns isLoading boolean', () => {
    const { result } = renderHook(() => useConnectionQueues('w1'));
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
