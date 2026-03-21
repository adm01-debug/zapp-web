/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockChannel, mockPlaySound, mockShowBrowserNotification, mockIsQuietHours, mockSupabaseChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockChannel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    }),
  };
  const mockPlaySound = vi.fn();
  const mockShowBrowserNotification = vi.fn();
  const mockIsQuietHours = vi.fn().mockReturnValue(false);
  const mockSupabaseChannel = vi.fn().mockReturnValue(mockChannel);
  const mockRemoveChannel = vi.fn();
  return { mockChannel, mockPlaySound, mockShowBrowserNotification, mockIsQuietHours, mockSupabaseChannel, mockRemoveChannel };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Alice', phone: '+5511999' }, error: null }),
        }),
      }),
    }),
    channel: mockSupabaseChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user1' } }),
}));

vi.mock('@/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    settings: {
      soundEnabled: true,
      slaBreachSound: true,
      soundType: 'beep',
      soundVolume: 80,
      browserNotifications: true,
      desktopAlerts: true,
    },
    isQuietHours: mockIsQuietHours,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/utils/notificationSounds', () => ({
  playNotificationSound: (...args: any[]) => mockPlaySound(...args),
  showBrowserNotification: (...args: any[]) => mockShowBrowserNotification(...args),
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { useSLANotifications } from '@/hooks/useSLANotifications';

describe('useSLANotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuietHours.mockReturnValue(false);
  });

  it('subscribes to sla-breaches channel', () => {
    renderHook(() => useSLANotifications());

    expect(mockSupabaseChannel).toHaveBeenCalledWith('sla-breaches');
  });

  it('subscribes to conversation_sla table changes', () => {
    renderHook(() => useSLANotifications());

    expect(mockChannel.on).toHaveBeenCalledTimes(2);

    const calls = mockChannel.on.mock.calls;
    expect(calls[0][1]).toEqual(
      expect.objectContaining({ event: 'UPDATE', table: 'conversation_sla' })
    );
    expect(calls[1][1]).toEqual(
      expect.objectContaining({ event: 'INSERT', table: 'conversation_sla' })
    );
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useSLANotifications());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('subscribes to the channel', () => {
    renderHook(() => useSLANotifications());

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('handles UPDATE payload with first_response breach', async () => {
    renderHook(() => useSLANotifications());

    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: {
        id: 'sla1',
        contact_id: 'contact1',
        first_response_breached: true,
        resolution_breached: false,
      },
      old: {
        first_response_breached: false,
        resolution_breached: false,
      },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
      })
    );
    expect(mockPlaySound).toHaveBeenCalled();
    expect(mockShowBrowserNotification).toHaveBeenCalled();
  });

  it('handles INSERT payload with resolution breach', async () => {
    renderHook(() => useSLANotifications());

    const insertHandler = mockChannel.on.mock.calls[1][2];

    await insertHandler({
      new: {
        id: 'sla2',
        contact_id: 'contact1',
        first_response_breached: false,
        resolution_breached: true,
      },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalled();
  });

  it('does not play sound during quiet hours', async () => {
    mockIsQuietHours.mockReturnValue(true);

    renderHook(() => useSLANotifications());

    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: {
        id: 'sla3',
        contact_id: 'contact1',
        first_response_breached: true,
        resolution_breached: false,
      },
      old: {
        first_response_breached: false,
      },
    });

    expect(mockPlaySound).not.toHaveBeenCalled();
  });
});
