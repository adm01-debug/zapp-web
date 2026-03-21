/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockQueues = [
  { id: 'cq1', whatsapp_connection_id: 'conn1', queue_id: 'q1', created_at: '2024-01-01' },
  { id: 'cq2', whatsapp_connection_id: 'conn1', queue_id: 'q2', created_at: '2024-01-02' },
];

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useConnectionQueues } from '@/hooks/useConnectionQueues';

describe('useConnectionQueues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockQueues, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }));
  });

  it('fetches connection queues when connectionId is provided', async () => {
    const { result } = renderHook(() => useConnectionQueues('conn1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.connectionQueues).toHaveLength(2);
  });

  it('does not fetch when connectionId is undefined', async () => {
    const { result } = renderHook(() => useConnectionQueues(undefined));

    // Should not call from since connectionId is undefined
    expect(result.current.connectionQueues).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts with loading false and empty array', () => {
    const { result } = renderHook(() => useConnectionQueues(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.connectionQueues).toEqual([]);
  });

  it('exposes addQueue function', async () => {
    const { result } = renderHook(() => useConnectionQueues('conn1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.addQueue).toBe('function');
  });

  it('exposes removeQueue function', async () => {
    const { result } = renderHook(() => useConnectionQueues('conn1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.removeQueue).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useConnectionQueues('conn1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('removeQueue updates local state optimistically', async () => {
    const { result } = renderHook(() => useConnectionQueues('conn1'));

    await waitFor(() => {
      expect(result.current.connectionQueues).toHaveLength(2);
    });

    await act(async () => {
      await result.current.removeQueue('q1');
    });

    expect(result.current.connectionQueues).toHaveLength(1);
    expect(result.current.connectionQueues[0].queue_id).toBe('q2');
  });
});
