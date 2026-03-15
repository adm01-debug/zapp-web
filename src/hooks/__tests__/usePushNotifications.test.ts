import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { usePushNotifications } from '@/hooks/usePushNotifications';

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock browser APIs
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com' }),
          },
          showNotification: vi.fn().mockResolvedValue(undefined),
        }),
      },
    });
  });

  it('initializes with isLoading true', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes requestPermission function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.requestPermission).toBe('function');
  });

  it('exposes subscribe function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.subscribe).toBe('function');
  });

  it('exposes unsubscribe function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.unsubscribe).toBe('function');
  });

  it('exposes showNotification function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.showNotification).toBe('function');
  });

  it('exposes toggleSubscription function', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(typeof result.current.toggleSubscription).toBe('function');
  });

  it('initializes isSubscribed as false', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSubscribed).toBe(false);
  });

  it('detects support correctly', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSupported).toBe(true);
  });
});
