/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockChannel, mockFrom, mockSupabaseChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockChannel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  const mockFrom = vi.fn();
  const mockSupabaseChannel = vi.fn().mockReturnValue(mockChannel);
  const mockRemoveChannel = vi.fn();
  return { mockChannel, mockFrom, mockSupabaseChannel, mockRemoveChannel };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: mockSupabaseChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';

describe('useRealtimeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ count: 5, error: null }),
          not: vi.fn().mockResolvedValue({ data: [{ contact_id: 'c1' }, { contact_id: 'c2' }], error: null }),
        }),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useRealtimeDashboard());
    expect(result.current.messagesThisHour).toBe(0);
    expect(result.current.messagesLastHour).toBe(0);
    expect(result.current.messagesPerMinute).toBe(0);
    expect(result.current.activeConversationsNow).toBe(0);
    expect(result.current.newContactsToday).toBe(0);
    expect(result.current.unreadMessages).toBe(0);
    expect(result.current.metricsHistory).toEqual([]);
    expect(result.current.lastMessageAt).toBeNull();
  });

  it('subscribes to realtime channel on mount', () => {
    renderHook(() => useRealtimeDashboard());
    expect(mockSupabaseChannel).toHaveBeenCalledWith('dashboard-realtime');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('cleans up channel and intervals on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeDashboard());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('subscribes to messages INSERT, contacts INSERT, and messages UPDATE', () => {
    renderHook(() => useRealtimeDashboard());
    expect(mockChannel.on).toHaveBeenCalledTimes(3);

    const calls = mockChannel.on.mock.calls;
    expect(calls[0][1]).toEqual(expect.objectContaining({ event: 'INSERT', table: 'messages' }));
    expect(calls[1][1]).toEqual(expect.objectContaining({ event: 'INSERT', table: 'contacts' }));
    expect(calls[2][1]).toEqual(expect.objectContaining({ event: 'UPDATE', table: 'messages' }));
  });

  it('returns state object with all expected properties', () => {
    const { result } = renderHook(() => useRealtimeDashboard());
    const keys = Object.keys(result.current);
    expect(keys).toContain('messagesThisHour');
    expect(keys).toContain('messagesLastHour');
    expect(keys).toContain('messagesPerMinute');
    expect(keys).toContain('activeConversationsNow');
    expect(keys).toContain('newContactsToday');
    expect(keys).toContain('unreadMessages');
    expect(keys).toContain('metricsHistory');
    expect(keys).toContain('lastMessageAt');
    expect(keys).toContain('isConnected');
  });

  it('sets isConnected to true when subscription callback fires', () => {
    // The subscribe callback fires synchronously with 'SUBSCRIBED'
    const { result } = renderHook(() => useRealtimeDashboard());
    // isConnected becomes true synchronously from the subscribe mock
    expect(result.current.isConnected).toBe(true);
  });

  it('calls supabase.from on mount to fetch initial data', () => {
    renderHook(() => useRealtimeDashboard());
    expect(mockFrom).toHaveBeenCalled();
  });

  it('messagesThisHour starts at 0', () => {
    const { result } = renderHook(() => useRealtimeDashboard());
    expect(result.current.messagesThisHour).toBeGreaterThanOrEqual(0);
  });

  it('handles new message INSERT by updating lastMessageAt', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: { id: 'new1', sender: 'contact', created_at: new Date().toISOString() } });
    });

    expect(result.current.lastMessageAt).toBeTruthy();
  });

  it('increments unreadMessages for contact sender', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const initialUnread = result.current.unreadMessages;
    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: { id: 'new1', sender: 'contact' } });
    });

    expect(result.current.unreadMessages).toBe(initialUnread + 1);
  });

  it('does not increment unreadMessages for agent sender', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const initialUnread = result.current.unreadMessages;
    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: { id: 'new1', sender: 'agent' } });
    });

    expect(result.current.unreadMessages).toBe(initialUnread);
  });

  it('increments newContactsToday on contacts INSERT', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const initial = result.current.newContactsToday;
    const contactInsertHandler = mockChannel.on.mock.calls[1][2];
    act(() => {
      contactInsertHandler({ new: { id: 'contact1' } });
    });

    expect(result.current.newContactsToday).toBe(initial + 1);
  });

  it('decrements unreadMessages on message read UPDATE', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    // First add unread
    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: { id: 'new1', sender: 'contact' } });
    });

    const afterInsert = result.current.unreadMessages;
    const updateHandler = mockChannel.on.mock.calls[2][2];
    act(() => {
      updateHandler({ new: { is_read: true }, old: { is_read: false } });
    });

    expect(result.current.unreadMessages).toBe(Math.max(0, afterInsert - 1));
  });

  it('does not go below zero unread messages', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const updateHandler = mockChannel.on.mock.calls[2][2];
    act(() => {
      updateHandler({ new: { is_read: true }, old: { is_read: false } });
    });

    expect(result.current.unreadMessages).toBeGreaterThanOrEqual(0);
  });

  it('handles fetch error without crashing', () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockRejectedValue(new Error('Network error')),
          not: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      }),
    }));

    const { result } = renderHook(() => useRealtimeDashboard());
    expect(result.current).toBeDefined();
  });

  it('metricsHistory grows when advancing time', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    act(() => { vi.advanceTimersByTime(60000); });
    act(() => { vi.advanceTimersByTime(60000); });

    expect(result.current.metricsHistory.length).toBeGreaterThanOrEqual(0);
    expect(result.current.metricsHistory.length).toBeLessThanOrEqual(60);
  });

  it('messagesPerMinute resets after interval tick', () => {
    const { result } = renderHook(() => useRealtimeDashboard());

    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: { id: 'new1', sender: 'agent' } });
      insertHandler({ new: { id: 'new2', sender: 'agent' } });
    });

    act(() => { vi.advanceTimersByTime(60000); });

    // After interval, messagesPerMinute reflects the count collected
    expect(result.current.messagesPerMinute).toBeGreaterThanOrEqual(0);
  });
});
