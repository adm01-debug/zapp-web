import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock @wavoip/wavoip-api — the constructor must not throw
vi.mock('@wavoip/wavoip-api', () => {
  const mockDevice = {
    token: 'tok1',
    status: 'open',
    contact: { official: null, unofficial: null },
    onStatus: vi.fn(),
    onContact: vi.fn(),
  };
  return {
    Wavoip: vi.fn().mockImplementation(() => ({
      onOffer: vi.fn(),
      startCall: vi.fn().mockResolvedValue({ call: null, err: { message: 'no device' } }),
      getDevices: vi.fn().mockReturnValue([mockDevice]),
      addDevices: vi.fn().mockReturnValue([mockDevice]),
      devices: [mockDevice],
    })),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useWavoip } from '../useWavoip';

describe('useWavoip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with disconnected state', () => {
    const { result } = renderHook(() => useWavoip());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.activeCall).toBeNull();
    expect(result.current.incomingOffer).toBeNull();
  });

  it('does not connect with empty tokens', () => {
    const { result } = renderHook(() => useWavoip());
    act(() => {
      result.current.connect([]);
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('disconnect resets state', () => {
    const { result } = renderHook(() => useWavoip());
    act(() => {
      result.current.disconnect();
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.activeCall).toBeNull();
    expect(result.current.devices).toEqual([]);
  });

  it('rejects call when no incoming offer', async () => {
    const { result } = renderHook(() => useWavoip());
    const success = await act(async () => result.current.rejectCall());
    expect(success).toBe(false);
  });

  it('accepts call fails when no incoming offer', async () => {
    const { result } = renderHook(() => useWavoip());
    const success = await act(async () => result.current.acceptCall());
    expect(success).toBe(false);
  });

  it('startCall fails when not connected', async () => {
    const { result } = renderHook(() => useWavoip());
    const success = await act(async () => result.current.startCall('+5511999999999'));
    expect(success).toBe(false);
  });

  it('fetchTokens returns empty array by default', async () => {
    const { result } = renderHook(() => useWavoip());
    const tokens = await act(async () => result.current.fetchTokens());
    expect(tokens).toEqual([]);
  });

  it('toggleMute returns false when no active call', async () => {
    const { result } = renderHook(() => useWavoip());
    const success = await act(async () => result.current.toggleMute());
    expect(success).toBe(false);
  });

  it('endActiveCall returns false when no active call', async () => {
    const { result } = renderHook(() => useWavoip());
    const success = await act(async () => result.current.endActiveCall());
    expect(success).toBe(false);
  });
});
