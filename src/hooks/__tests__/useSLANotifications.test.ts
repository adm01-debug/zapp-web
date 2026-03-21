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

  it('subscribes to UPDATE and INSERT on conversation_sla', () => {
    renderHook(() => useSLANotifications());
    expect(mockChannel.on).toHaveBeenCalledTimes(2);

    const calls = mockChannel.on.mock.calls;
    expect(calls[0][1]).toEqual(expect.objectContaining({ event: 'UPDATE', table: 'conversation_sla' }));
    expect(calls[1][1]).toEqual(expect.objectContaining({ event: 'INSERT', table: 'conversation_sla' }));
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

  it('handles UPDATE with first_response breach', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla1', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
      old: { first_response_breached: false, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(mockPlaySound).toHaveBeenCalled();
    expect(mockShowBrowserNotification).toHaveBeenCalled();
  });

  it('handles UPDATE with resolution breach', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla2', contact_id: 'c1', first_response_breached: false, resolution_breached: true },
      old: { first_response_breached: false, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalled();
  });

  it('handles INSERT with first_response breach', async () => {
    renderHook(() => useSLANotifications());
    const insertHandler = mockChannel.on.mock.calls[1][2];

    await insertHandler({
      new: { id: 'sla3', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalled();
  });

  it('handles INSERT with resolution breach', async () => {
    renderHook(() => useSLANotifications());
    const insertHandler = mockChannel.on.mock.calls[1][2];

    await insertHandler({
      new: { id: 'sla4', contact_id: 'c1', first_response_breached: false, resolution_breached: true },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalled();
  });

  it('does not play sound during quiet hours', async () => {
    mockIsQuietHours.mockReturnValue(true);
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla5', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
      old: { first_response_breached: false },
    });

    expect(mockPlaySound).not.toHaveBeenCalled();
  });

  it('does not notify for already-notified breaches (dedup)', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    const payload = {
      new: { id: 'sla6', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
      old: { first_response_breached: false },
    };

    await updateHandler(payload);
    await updateHandler(payload);

    const { toast } = await import('@/hooks/use-toast');
    // Should only be called once for this breach ID
    const callCount = (toast as any).mock.calls.filter(
      (call: any[]) => call[0]?.title?.includes('Primeira Resposta')
    ).length;
    expect(callCount).toBe(1);
  });

  it('does not notify when breach status has not changed', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla7', contact_id: 'c1', first_response_breached: false, resolution_breached: false },
      old: { first_response_breached: false, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).not.toHaveBeenCalled();
  });

  it('handles INSERT with no breaches', async () => {
    renderHook(() => useSLANotifications());
    const insertHandler = mockChannel.on.mock.calls[1][2];

    await insertHandler({
      new: { id: 'sla8', contact_id: 'c1', first_response_breached: false, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).not.toHaveBeenCalled();
  });

  it('handles both breach types simultaneously', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla9', contact_id: 'c1', first_response_breached: true, resolution_breached: true },
      old: { first_response_breached: false, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('plays sound with correct parameters', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla10', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
      old: { first_response_breached: false },
    });

    expect(mockPlaySound).toHaveBeenCalledWith('sla_breach', 'beep', 80);
  });

  it('shows browser notification with tag', async () => {
    renderHook(() => useSLANotifications());
    const updateHandler = mockChannel.on.mock.calls[0][2];

    await updateHandler({
      new: { id: 'sla11', contact_id: 'c1', first_response_breached: true, resolution_breached: false },
      old: { first_response_breached: false },
    });

    expect(mockShowBrowserNotification).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ tag: 'sla-breach-first_response' }),
    );
  });

  it('handles contact without name', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    renderHook(() => useSLANotifications());
    const insertHandler = mockChannel.on.mock.calls[1][2];

    await insertHandler({
      new: { id: 'sla12', contact_id: 'c999', first_response_breached: true, resolution_breached: false },
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalled();
  });
});
