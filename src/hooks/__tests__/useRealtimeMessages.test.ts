import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: mockRemoveChannel,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

vi.mock('@/utils/notificationSound', () => ({
  playNotificationSound: vi.fn(),
  showBrowserNotification: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';

describe('useRealtimeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('initializes with loading=true', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.loading).toBe(true);
  });

  it('initializes with empty conversations', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.conversations).toEqual([]);
  });

  it('initializes with no error', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.error).toBeNull();
  });

  it('exposes sendMessage function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('exposes markAsRead function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.refetch).toBe('function');
  });

  it('exposes dismissNotification function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.dismissNotification).toBe('function');
  });

  it('exposes setSelectedContact function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.setSelectedContact).toBe('function');
  });

  it('exposes setSoundEnabled function', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(typeof result.current.setSoundEnabled).toBe('function');
  });

  it('newMessageNotification is initially null', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.newMessageNotification).toBeNull();
  });

  it('subscribes to realtime channel', () => {
    renderHook(() => useRealtimeMessages());
    expect(mockChannel).toHaveBeenCalledWith('messages-realtime');
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeMessages());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('fetches conversations on mount', async () => {
    renderHook(() => useRealtimeMessages());
    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(mockFrom).toHaveBeenCalledWith('messages');
  });

  it('handles fetch error gracefully', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Fail') }),
        }),
      }),
    });
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
