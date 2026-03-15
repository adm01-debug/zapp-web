import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useDeviceDetection } from '@/hooks/useDeviceDetection';

describe('useDeviceDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects desktop environment in jsdom', () => {
    const { result } = renderHook(() => useDeviceDetection());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('returns device info object', () => {
    const { result } = renderHook(() => useDeviceDetection());
    expect(result.current).toHaveProperty('isMobile');
    expect(result.current).toHaveProperty('isDesktop');
    expect(result.current).toHaveProperty('isTablet');
  });

  it('isTablet is false in desktop env', () => {
    const { result } = renderHook(() => useDeviceDetection());
    expect(result.current.isTablet).toBe(false);
  });

  it('isTouchDevice is false in jsdom', () => {
    const { result } = renderHook(() => useDeviceDetection());
    expect(result.current.isTouchDevice).toBe(false);
  });
});
