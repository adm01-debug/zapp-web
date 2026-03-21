/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    // isConnected may become true immediately if subscribe callback fires synchronously
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

  it('subscribes to messages, contacts, and message updates', () => {
    renderHook(() => useRealtimeDashboard());

    expect(mockChannel.on).toHaveBeenCalledTimes(3);

    const calls = mockChannel.on.mock.calls;
    expect(calls[0][1]).toEqual(
      expect.objectContaining({ event: 'INSERT', table: 'messages' })
    );
    expect(calls[1][1]).toEqual(
      expect.objectContaining({ event: 'INSERT', table: 'contacts' })
    );
    expect(calls[2][1]).toEqual(
      expect.objectContaining({ event: 'UPDATE', table: 'messages' })
    );
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
});
