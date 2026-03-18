import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    showNotification: vi.fn(),
    permission: 'granted',
  }),
}));

import { useWarRoomAlerts } from '@/hooks/useWarRoomAlerts';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useWarRoomAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [
              { id: 'a1', alert_type: 'sla_breach', title: 'SLA Alert', message: 'Breach!', is_read: false },
            ], error: null }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('fetches unread alerts', async () => {
    const { result } = renderHook(() => useWarRoomAlerts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.alerts).toBeDefined());
    expect(mockFrom).toHaveBeenCalledWith('warroom_alerts');
  });

  it('exposes markAsRead function', () => {
    const { result } = renderHook(() => useWarRoomAlerts(), { wrapper: createWrapper() });
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('accepts soundEnabled parameter', () => {
    const { result } = renderHook(() => useWarRoomAlerts(false), { wrapper: createWrapper() });
    expect(result.current).toBeDefined();
  });

  it('exposes unreadCount', () => {
    const { result } = renderHook(() => useWarRoomAlerts(), { wrapper: createWrapper() });
    expect(typeof result.current.unreadCount).toBe('number');
  });
});
