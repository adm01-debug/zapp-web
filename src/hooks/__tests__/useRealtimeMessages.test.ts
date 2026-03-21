/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

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

const mockContacts = [
  { id: 'contact1', name: 'Alice', surname: null, nickname: null, phone: '+5511999999999', email: null, avatar_url: null, tags: null, company: null, job_title: null, assigned_to: null, created_at: '2024-01-01', updated_at: '2024-01-02', whatsapp_connection_id: null },
];

const mockMessages = [
  { id: 'msg1', contact_id: 'contact1', agent_id: null, content: 'Hello', sender: 'contact', message_type: 'text', media_url: null, is_read: false, status: 'sent', status_updated_at: null, created_at: '2024-01-01T10:00:00Z', updated_at: '2024-01-01T10:00:00Z', external_id: null, whatsapp_connection_id: null, transcription: null, transcription_status: null },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: mockSupabaseChannel,
    removeChannel: mockRemoveChannel,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { messageId: 'ext1' }, error: null }),
    },
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

vi.mock('@/utils/notificationSounds', () => ({
  playNotificationSound: vi.fn(),
  showBrowserNotification: vi.fn(),
  requestNotificationPermission: vi.fn(),
}));

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';

describe('useRealtimeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockContacts[0], error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockContacts[0], error: null }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'msg2', contact_id: 'contact1' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'profile1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });
  });

  it('starts with loading true and empty conversations', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.loading).toBe(true);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches conversations on mount', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].contact.name).toBe('Alice');
    expect(result.current.conversations[0].messages).toHaveLength(1);
    expect(result.current.conversations[0].unreadCount).toBe(1);
  });

  it('subscribes to realtime messages channel', () => {
    renderHook(() => useRealtimeMessages());

    expect(mockSupabaseChannel).toHaveBeenCalledWith('messages-realtime');
    expect(mockChannel.on).toHaveBeenCalledTimes(2);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeMessages());
    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('exposes sendMessage function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('exposes markAsRead function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('dismissNotification clears the notification state', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.dismissNotification();
    });

    expect(result.current.newMessageNotification).toBeNull();
  });

  it('setSelectedContact is callable', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedContact('contact1');
    });

    expect(typeof result.current.setSelectedContact).toBe('function');
  });

  it('setSoundEnabled is callable', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSoundEnabled(false);
    });

    expect(typeof result.current.setSoundEnabled).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('sets error when contacts fetch fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useRealtimeMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch conversations');
  });
});
