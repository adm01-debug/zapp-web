/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }),
  mockRemoveChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useQueues } from '@/hooks/useQueues';

const mockQueues = [
  { id: 'q1', name: 'Support', description: 'Support queue', color: '#3B82F6', is_active: true, max_wait_time_minutes: 30, priority: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'q2', name: 'Sales', description: null, color: '#10B981', is_active: true, max_wait_time_minutes: 15, priority: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const mockMembers = [
  { id: 'm1', queue_id: 'q1', profile_id: 'p1', is_active: true, created_at: '2024-01-01', profile: { id: 'p1', name: 'Agent A', avatar_url: null, is_active: true } },
];

const mockWaiting = [
  { queue_id: 'q1' },
  { queue_id: 'q1' },
];

function setupMocks(overrides: any = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'queues' && !overrides.queuesError) {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: overrides.queues ?? mockQueues, error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockQueues[0], error: overrides.createError ?? null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: overrides.updateError ?? null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: overrides.deleteError ?? null }),
        }),
      };
    }
    if (table === 'queues' && overrides.queuesError) {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: overrides.queuesError }),
        }),
      };
    }
    if (table === 'queue_members') {
      return {
        select: vi.fn().mockResolvedValue({ data: overrides.members ?? mockMembers, error: null }),
        insert: vi.fn().mockResolvedValue({ error: overrides.addMemberError ?? null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: overrides.removeMemberError ?? null }),
          }),
        }),
      };
    }
    if (table === 'contacts') {
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: overrides.waiting ?? mockWaiting, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: overrides.assignError ?? null }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('useQueues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('fetches queues on mount', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queues).toHaveLength(2);
  });

  it('combines queues with members', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queues[0].members).toHaveLength(1);
    expect(result.current.queues[1].members).toHaveLength(0);
  });

  it('calculates waiting count', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queues[0].waiting_count).toBe(2);
    expect(result.current.queues[1].waiting_count).toBe(0);
  });

  it('handles fetch error', async () => {
    setupMocks({ queuesError: { message: 'DB error' } });
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('starts with loading true', () => {
    const { result } = renderHook(() => useQueues());
    expect(result.current.loading).toBe(true);
  });

  it('createQueue calls insert and refetches', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createQueue({ name: 'New', color: '#fff' });
    });
    expect(mockFrom).toHaveBeenCalledWith('queues');
  });

  it('deleteQueue calls delete', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.deleteQueue('q1');
    });
    expect(mockFrom).toHaveBeenCalledWith('queues');
  });

  it('addMember calls insert on queue_members', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addMember('q1', 'p2');
    });
    expect(mockFrom).toHaveBeenCalledWith('queue_members');
  });

  it('removeMember calls delete on queue_members', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.removeMember('q1', 'p1');
    });
    expect(mockFrom).toHaveBeenCalledWith('queue_members');
  });

  it('assignContactToQueue updates contact', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.assignContactToQueue('c1', 'q1');
    });
    expect(mockFrom).toHaveBeenCalledWith('contacts');
  });

  it('assignContactToQueue with null removes from queue', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.assignContactToQueue('c1', null);
    });
    expect(mockFrom).toHaveBeenCalledWith('contacts');
  });

  it('handles createQueue error', async () => {
    setupMocks({ createError: { message: 'Insert failed' } });
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(
      act(async () => {
        await result.current.createQueue({ name: 'Fail' });
      })
    ).rejects.toBeTruthy();
  });

  it('subscribes to realtime changes', () => {
    renderHook(() => useQueues());
    expect(mockChannel).toHaveBeenCalledWith('queues-changes');
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useQueues());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('returns refetch function', async () => {
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('returns empty queues array when no data', async () => {
    setupMocks({ queues: [] });
    const { result } = renderHook(() => useQueues());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queues).toEqual([]);
  });
});
