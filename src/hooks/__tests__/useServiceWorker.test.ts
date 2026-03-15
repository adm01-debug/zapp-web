import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockRegistration = {
  scope: '/',
  update: vi.fn(),
  installing: null,
  addEventListener: vi.fn(),
};

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        controller: null,
        addEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers service worker on mount', async () => {
    const { useServiceWorker } = await import('@/hooks/useServiceWorker');
    renderHook(() => useServiceWorker());
    
    // Allow async registration
    await vi.advanceTimersByTimeAsync(0);
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('does not crash when serviceWorker is unavailable', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    
    const { useServiceWorker } = await import('@/hooks/useServiceWorker');
    expect(() => renderHook(() => useServiceWorker())).not.toThrow();
  });
});
