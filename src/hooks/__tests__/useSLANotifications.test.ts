import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: mockRemoveChannel,
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    settings: {
      soundEnabled: true,
      slaBreachSound: true,
      browserNotifications: false,
      desktopAlerts: false,
      soundType: 'chime',
      soundVolume: 1,
    },
    isQuietHours: () => false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/utils/notificationSounds', () => ({
  playNotificationSound: vi.fn(),
  showBrowserNotification: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { useSLANotifications } from '@/hooks/useSLANotifications';

describe('useSLANotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'João', phone: '123' }, error: null }),
        }),
      }),
    });
  });

  it('subscribes to sla-breaches channel when user exists', () => {
    renderHook(() => useSLANotifications());
    expect(mockChannel).toHaveBeenCalledWith('sla-breaches');
  });

  it('does not subscribe when no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useSLANotifications());
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useSLANotifications());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('subscribes to both UPDATE and INSERT events', () => {
    const onMock = vi.fn().mockReturnThis();
    mockChannel.mockReturnValue({
      on: onMock,
      subscribe: vi.fn().mockReturnThis(),
    });
    renderHook(() => useSLANotifications());
    expect(onMock).toHaveBeenCalledTimes(2);
    const calls = onMock.mock.calls;
    expect(calls[0][1]).toEqual(expect.objectContaining({ event: 'UPDATE', table: 'conversation_sla' }));
    expect(calls[1][1]).toEqual(expect.objectContaining({ event: 'INSERT', table: 'conversation_sla' }));
  });

  it('re-subscribes when user changes', () => {
    const { rerender } = renderHook(() => useSLANotifications());
    expect(mockChannel).toHaveBeenCalledTimes(1);
  });
});
