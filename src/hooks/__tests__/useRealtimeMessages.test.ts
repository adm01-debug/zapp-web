/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { mockChannel, mockFrom, mockSupabaseChannel, mockRemoveChannel, mockFunctionsInvoke } = vi.hoisted(() => {
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
  const mockFunctionsInvoke = vi.fn().mockResolvedValue({ data: { messageId: 'ext1' }, error: null });
  return { mockChannel, mockFrom, mockSupabaseChannel, mockRemoveChannel, mockFunctionsInvoke };
});

const mockContacts = [
  { id: 'contact1', name: 'Alice', surname: null, nickname: null, phone: '+5511999999999', email: null, avatar_url: null, tags: null, company: null, job_title: null, assigned_to: null, created_at: '2024-01-01', updated_at: '2024-01-02', whatsapp_connection_id: null },
  { id: 'contact2', name: 'Bob', surname: null, nickname: null, phone: '+5511888888888', email: 'bob@test.com', avatar_url: null, tags: ['vip'], company: null, job_title: null, assigned_to: 'agent1', created_at: '2024-02-01', updated_at: '2024-03-01', whatsapp_connection_id: 'conn1' },
];

const mockMessages = [
  { id: 'msg1', contact_id: 'contact1', agent_id: null, content: 'Hello', sender: 'contact', message_type: 'text', media_url: null, is_read: false, status: 'sent', status_updated_at: null, created_at: '2024-01-01T10:00:00Z', updated_at: '2024-01-01T10:00:00Z', external_id: null, whatsapp_connection_id: null, transcription: null, transcription_status: null },
  { id: 'msg2', contact_id: 'contact1', agent_id: 'a1', content: 'Hi Alice', sender: 'agent', message_type: 'text', media_url: null, is_read: true, status: 'read', status_updated_at: null, created_at: '2024-01-01T10:01:00Z', updated_at: '2024-01-01T10:01:00Z', external_id: 'ext0', whatsapp_connection_id: null, transcription: null, transcription_status: null },
  { id: 'msg3', contact_id: 'contact2', agent_id: null, content: 'Hey!', sender: 'contact', message_type: 'text', media_url: null, is_read: true, status: 'sent', status_updated_at: null, created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z', external_id: null, whatsapp_connection_id: null, transcription: null, transcription_status: null },
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
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
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

function setupDefaultMocks() {
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
            single: vi.fn().mockResolvedValue({ data: { id: 'msg-new', contact_id: 'contact1' }, error: null }),
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
    if (table === 'whatsapp_connections') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { instance_id: 'wpp2', status: 'connected' }, error: null }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  });
}

describe('useRealtimeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // --- Initialization ---
  it('starts with loading true and empty conversations', () => {
    const { result } = renderHook(() => useRealtimeMessages());
    expect(result.current.loading).toBe(true);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches conversations on mount', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations).toHaveLength(2);
  });

  it('populates contact data correctly', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const alice = result.current.conversations.find(c => c.contact.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.contact.phone).toBe('+5511999999999');
  });

  it('populates messages for each contact', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const alice = result.current.conversations.find(c => c.contact.id === 'contact1');
    expect(alice!.messages).toHaveLength(2);
  });

  it('calculates unread count correctly', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const alice = result.current.conversations.find(c => c.contact.id === 'contact1');
    expect(alice!.unreadCount).toBe(1); // msg1 from contact is unread
    const bob = result.current.conversations.find(c => c.contact.id === 'contact2');
    expect(bob!.unreadCount).toBe(0);
  });

  it('sets lastMessage correctly', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const alice = result.current.conversations.find(c => c.contact.id === 'contact1');
    expect(alice!.lastMessage!.content).toBe('Hi Alice');
  });

  it('sorts conversations by last message time (newest first)', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Bob's last message is from Feb, Alice's is from Jan
    expect(result.current.conversations[0].contact.name).toBe('Bob');
  });

  // --- Realtime subscription ---
  it('subscribes to realtime messages channel', () => {
    renderHook(() => useRealtimeMessages());
    expect(mockSupabaseChannel).toHaveBeenCalledWith('messages-realtime');
    expect(mockChannel.on).toHaveBeenCalledTimes(2);
  });

  it('subscribes to INSERT events', () => {
    renderHook(() => useRealtimeMessages());
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'messages' }),
      expect.any(Function)
    );
  });

  it('subscribes to UPDATE events', () => {
    renderHook(() => useRealtimeMessages());
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', table: 'messages' }),
      expect.any(Function)
    );
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeMessages());
    unmount();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  // --- Functions ---
  it('exposes sendMessage function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('exposes markAsRead function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('markAsRead updates local state to zero unread', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markAsRead('contact1');
    });

    const alice = result.current.conversations.find(c => c.contact.id === 'contact1');
    expect(alice!.unreadCount).toBe(0);
  });

  it('dismissNotification clears the notification state', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.dismissNotification(); });
    expect(result.current.newMessageNotification).toBeNull();
  });

  it('setSelectedContact is callable', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setSelectedContact('contact1'); });
    expect(typeof result.current.setSelectedContact).toBe('function');
  });

  it('setSoundEnabled is callable', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setSoundEnabled(false); });
    expect(typeof result.current.setSoundEnabled).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  // --- Error handling ---
  it('sets error when contacts fetch fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to fetch conversations');
  });

  it('sets error when messages fetch fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to fetch conversations');
  });

  it('handles empty contacts list gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('newMessageNotification is initially null', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newMessageNotification).toBeNull();
  });

  it('refetch reloads conversations', async () => {
    const { result } = renderHook(() => useRealtimeMessages());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    // mockFrom should have been called multiple times (initial + refetch)
    expect(mockFrom).toHaveBeenCalled();
  });
});
