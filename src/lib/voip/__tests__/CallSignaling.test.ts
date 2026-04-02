import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock factories are hoisted — cannot reference external variables.
// We access the mocks through the imported module instead.

vi.mock('@/integrations/supabase/client', () => {
  const on = vi.fn().mockReturnThis();
  const subscribe = vi.fn().mockImplementation((cb: (s: string) => void) => {
    cb('SUBSCRIBED');
    return {};
  });
  const removeChannel = vi.fn();
  const invoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

  return {
    supabase: {
      channel: vi.fn().mockReturnValue({ on, subscribe }),
      removeChannel,
      functions: { invoke },
    },
    // Expose mocks for test access
    __mocks: { on, subscribe, removeChannel, invoke },
  };
});

vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { CallSignaling, type CallSignalingConfig } from '../CallSignaling';

// Get mock references
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = await import('@/integrations/supabase/client') as any;
const { on: mockOn, removeChannel: mockRemoveChannel, invoke: mockFunctionsInvoke } = __mocks;

describe('CallSignaling', () => {
  let signaling: CallSignaling;
  let config: CallSignalingConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnThis();

    config = {
      agentId: 'agent-1',
      onIncomingCall: vi.fn(),
      onCallStatusUpdate: vi.fn(),
    };

    signaling = new CallSignaling(config);
  });

  afterEach(() => {
    signaling.destroy();
  });

  it('creates signaling instance', () => {
    expect(signaling).toBeDefined();
    expect(signaling.getIsListening()).toBe(false);
  });

  it('startListening subscribes to realtime channel', () => {
    signaling.startListening();
    expect(signaling.getIsListening()).toBe(true);
    expect(mockOn).toHaveBeenCalledTimes(2);
  });

  it('does not double-subscribe', () => {
    signaling.startListening();
    signaling.startListening();
    expect(mockOn).toHaveBeenCalledTimes(2);
  });

  it('stopListening removes channel', () => {
    signaling.startListening();
    signaling.stopListening();
    expect(signaling.getIsListening()).toBe(false);
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('sendCallAction invokes edge function', async () => {
    const result = await signaling.sendCallAction('offer', {
      instanceName: 'test-instance',
      number: '+5511999999999',
      isVideo: false,
    });

    expect(result.success).toBe(true);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('voip-call', {
      body: {
        action: 'offer',
        instanceName: 'test-instance',
        number: '+5511999999999',
        isVideo: false,
      },
    });
  });

  it('sendCallAction handles edge function errors', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Server error' },
    });

    const result = await signaling.sendCallAction('offer', {
      instanceName: 'test-instance',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Server error');
  });

  it('sendCallAction handles network exceptions', async () => {
    mockFunctionsInvoke.mockRejectedValueOnce(new Error('Network failure'));

    const result = await signaling.sendCallAction('offer', {
      instanceName: 'test-instance',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');
  });

  it('destroy stops listening', () => {
    signaling.startListening();
    signaling.destroy();
    expect(signaling.getIsListening()).toBe(false);
  });

  it('registers INSERT listener for inbound calls', () => {
    signaling.startListening();
    const firstOnCall = mockOn.mock.calls[0];
    expect(firstOnCall[0]).toBe('postgres_changes');
    expect(firstOnCall[1]).toMatchObject({
      event: 'INSERT',
      schema: 'public',
      table: 'calls',
    });
  });

  it('registers UPDATE listener for status changes', () => {
    signaling.startListening();
    const secondOnCall = mockOn.mock.calls[1];
    expect(secondOnCall[0]).toBe('postgres_changes');
    expect(secondOnCall[1]).toMatchObject({
      event: 'UPDATE',
      schema: 'public',
      table: 'calls',
    });
  });
});
