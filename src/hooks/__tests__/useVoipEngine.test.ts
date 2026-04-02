import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/voip/VoipEngine', () => {
  return {
    VoipEngine: vi.fn().mockImplementation(function () {
      return {
        initiateCall: vi.fn().mockResolvedValue(null),
        acceptCall: vi.fn().mockResolvedValue(false),
        rejectCall: vi.fn(),
        endCall: vi.fn(),
        setMuted: vi.fn(),
        getCurrentCall: vi.fn().mockReturnValue(null),
        getCallDuration: vi.fn().mockReturnValue(0),
        destroy: vi.fn(),
        setDbCallId: vi.fn(),
        handleIncomingCall: vi.fn(),
        updateCallStatus: vi.fn(),
      };
    }),
  };
});

vi.mock('@/lib/voip/CallSignaling', () => {
  return {
    CallSignaling: vi.fn().mockImplementation(function () {
      return {
        sendCallAction: vi.fn().mockResolvedValue({ success: true }),
        startListening: vi.fn(),
        destroy: vi.fn(),
      };
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useVoipEngine } from '../useVoipEngine';

describe('useVoipEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with not-ready state', () => {
    const { result } = renderHook(() => useVoipEngine());
    expect(result.current.isReady).toBe(false);
    expect(result.current.activeCall).toBeNull();
    expect(result.current.incomingOffer).toBeNull();
    expect(result.current.audioLevel).toBe(0);
  });

  it('becomes ready after initialize', () => {
    const { result } = renderHook(() => useVoipEngine());
    act(() => {
      result.current.initialize('agent-1');
    });
    expect(result.current.isReady).toBe(true);
  });

  it('stays ready after double-initialize', () => {
    const { result } = renderHook(() => useVoipEngine());
    act(() => {
      result.current.initialize('agent-1');
    });
    expect(result.current.isReady).toBe(true);
    // Second call should be a no-op, state should remain ready
    act(() => {
      result.current.initialize('agent-1');
    });
    expect(result.current.isReady).toBe(true);
  });

  it('startCall fails when not initialized', async () => {
    const { result } = renderHook(() => useVoipEngine());
    const success = await act(async () => result.current.startCall('+5511999999999'));
    expect(success).toBe(false);
  });

  it('acceptCall fails when not initialized', async () => {
    const { result } = renderHook(() => useVoipEngine());
    const success = await act(async () => result.current.acceptCall());
    expect(success).toBe(false);
  });

  it('rejectCall fails when not initialized', async () => {
    const { result } = renderHook(() => useVoipEngine());
    const success = await act(async () => result.current.rejectCall());
    expect(success).toBe(false);
  });

  it('toggleMute fails when not initialized', () => {
    const { result } = renderHook(() => useVoipEngine());
    const success = result.current.toggleMute();
    expect(success).toBe(false);
  });

  it('getCallDuration returns 0 when not initialized', () => {
    const { result } = renderHook(() => useVoipEngine());
    const duration = result.current.getCallDuration();
    expect(duration).toBe(0);
  });

  it('destroy resets state', () => {
    const { result } = renderHook(() => useVoipEngine());
    act(() => {
      result.current.initialize('agent-1');
    });
    expect(result.current.isReady).toBe(true);

    act(() => {
      result.current.destroy();
    });
    expect(result.current.isReady).toBe(false);
    expect(result.current.activeCall).toBeNull();
  });
});
