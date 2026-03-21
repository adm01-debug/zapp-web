/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockShowNotification, mockChannel, mockSupabaseChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockShowNotification = vi.fn();
  const mockChannel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    }),
  };
  const mockSupabaseChannel = vi.fn().mockReturnValue(mockChannel);
  const mockRemoveChannel = vi.fn();
  return { mockShowNotification, mockChannel, mockSupabaseChannel, mockRemoveChannel };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mockSupabaseChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user1' } }),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSubscribed: true,
    permission: 'granted' as NotificationPermission,
    showNotification: mockShowNotification,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Mock serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

import { useSecurityPushNotifications } from '@/hooks/useSecurityPushNotifications';

describe('useSecurityPushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isEnabled true when subscribed and permission granted', () => {
    const { result } = renderHook(() => useSecurityPushNotifications());

    expect(result.current.isEnabled).toBe(true);
    expect(typeof result.current.sendSecurityNotification).toBe('function');
  });

  it('subscribes to security_alerts for the current user', () => {
    renderHook(() => useSecurityPushNotifications());

    expect(mockSupabaseChannel).toHaveBeenCalledWith('security-alerts-push');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'security_alerts',
        filter: 'user_id=eq.user1',
      }),
      expect.any(Function)
    );
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useSecurityPushNotifications());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('sendSecurityNotification calls showNotification for high severity', async () => {
    const { result } = renderHook(() => useSecurityPushNotifications());

    await act(async () => {
      await result.current.sendSecurityNotification({
        id: 'alert1',
        alert_type: 'brute_force',
        severity: 'high',
        title: 'Brute Force Detected',
        description: 'Multiple failed login attempts',
        ip_address: '192.168.1.1',
        created_at: '2024-01-01',
        is_resolved: false,
      });
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Brute Force Detected'),
        body: expect.stringContaining('192.168.1.1'),
        requireInteraction: true,
      })
    );
  });

  it('sendSecurityNotification handles low severity alerts without requireInteraction', async () => {
    const { result } = renderHook(() => useSecurityPushNotifications());

    await act(async () => {
      await result.current.sendSecurityNotification({
        id: 'alert2',
        alert_type: 'new_device',
        severity: 'low',
        title: 'New Device Login',
        description: 'Login from a new device',
        ip_address: null,
        created_at: '2024-01-01',
        is_resolved: false,
      });
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        requireInteraction: false,
      })
    );
  });

  it('registers service worker message listener', () => {
    renderHook(() => useSecurityPushNotifications());

    expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
  });

  it('removes service worker message listener on unmount', () => {
    const { unmount } = renderHook(() => useSecurityPushNotifications());

    unmount();

    expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
  });
});
