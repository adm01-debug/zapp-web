import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: mockRemoveChannel,
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSubscribed: true,
    permission: 'granted',
    showNotification: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useSecurityPushNotifications } from '@/hooks/useSecurityPushNotifications';

describe('useSecurityPushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('returns isEnabled true when subscribed and granted', () => {
    const { result } = renderHook(() => useSecurityPushNotifications());
    expect(result.current.isEnabled).toBe(true);
  });

  it('exposes sendSecurityNotification function', () => {
    const { result } = renderHook(() => useSecurityPushNotifications());
    expect(typeof result.current.sendSecurityNotification).toBe('function');
  });

  it('subscribes to security alerts channel', () => {
    renderHook(() => useSecurityPushNotifications());
    expect(mockChannel).toHaveBeenCalledWith('security-alerts-push');
  });

  it('does not subscribe when no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useSecurityPushNotifications());
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useSecurityPushNotifications());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('filters by user_id in subscription', () => {
    const onMock = vi.fn().mockReturnThis();
    mockChannel.mockReturnValue({
      on: onMock,
      subscribe: vi.fn().mockReturnThis(),
    });
    renderHook(() => useSecurityPushNotifications());
    expect(onMock).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'user_id=eq.u1' }),
      expect.any(Function)
    );
  });

  it('sendSecurityNotification does not throw', async () => {
    const { result } = renderHook(() => useSecurityPushNotifications());
    await expect(
      result.current.sendSecurityNotification({
        id: 'a1',
        alert_type: 'brute_force',
        severity: 'high',
        title: 'Brute force detected',
        description: 'Multiple failed logins',
        ip_address: '1.2.3.4',
        created_at: '2024-01-01',
        is_resolved: false,
      })
    ).resolves.not.toThrow();
  });
});
