/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Track all created channels for assertions
const createdChannels: any[] = [];
const mockRemoveChannel = vi.fn();

function createChannelMock(name: string) {
  let subscribeCallback: any = null;
  const channelObj: any = {
    _name: name,
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: any) => {
      subscribeCallback = cb;
      // Default: trigger SUBSCRIBED
      if (cb) cb('SUBSCRIBED');
      return channelObj;
    }),
    _triggerStatus: (status: string) => {
      if (subscribeCallback) subscribeCallback(status);
    },
  };
  createdChannels.push(channelObj);
  return channelObj;
}

const mockChannel = vi.fn((name: string) => createChannelMock(name));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { useSubscriptionManager } from '@/hooks/useSubscriptionManager';

describe('useSubscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    createdChannels.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should subscribe to a channel', () => {
    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({
        channelName: 'test-channel',
        table: 'messages',
        callback,
      });
    });

    expect(mockChannel).toHaveBeenCalledWith('test-channel');
    expect(createdChannels[0].on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: '*', schema: 'public', table: 'messages' }),
      callback
    );
    expect(createdChannels[0].subscribe).toHaveBeenCalled();
    expect(result.current.getActiveCount()).toBe(1);
  });

  it('should deduplicate channels with the same name', () => {
    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'dup-channel', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'dup-channel', table: 'messages', callback });
    });

    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(result.current.getActiveCount()).toBe(1);
  });

  it('should enforce max channels limit by removing oldest', () => {
    const maxChannels = 3;
    const { result } = renderHook(() => useSubscriptionManager(maxChannels));
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'ch-0', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'ch-1', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'ch-2', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'ch-3', table: 'messages', callback });
    });

    // 4th channel should have triggered removal of oldest (ch-0)
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(result.current.getActiveCount()).toBe(3);
  });

  it('should unsubscribe from a specific channel', () => {
    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'remove-me', table: 'contacts', callback });
    });

    expect(result.current.getActiveCount()).toBe(1);

    act(() => {
      result.current.unsubscribe('remove-me');
    });

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(result.current.getActiveCount()).toBe(0);
  });

  it('should unsubscribe all channels', () => {
    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'ch-a', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'ch-b', table: 'contacts', callback });
    });

    expect(result.current.getActiveCount()).toBe(2);

    act(() => {
      result.current.unsubscribeAll();
    });

    expect(mockRemoveChannel).toHaveBeenCalledTimes(2);
    expect(result.current.getActiveCount()).toBe(0);
  });

  it('should pass filter to channel config when provided', () => {
    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({
        channelName: 'filtered',
        table: 'messages',
        event: 'INSERT',
        filter: 'contact_id=eq.123',
        callback,
      });
    });

    expect(createdChannels[0].on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'contact_id=eq.123',
      }),
      callback
    );
  });

  it('should schedule reconnect on channel error', () => {
    // Override so first subscribe triggers CHANNEL_ERROR
    let callCount = 0;
    mockChannel.mockImplementation((name: string) => {
      const ch = createChannelMock(name);
      callCount++;
      if (callCount === 1) {
        ch.subscribe = vi.fn((cb: any) => {
          if (cb) cb('CHANNEL_ERROR');
          return ch;
        });
      }
      return ch;
    });

    const { result } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'error-ch', table: 'messages', callback });
    });

    // Advance timers to trigger reconnect (first attempt: 1000ms)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // removeChannel should have been called to clean up before reconnect
    expect(mockRemoveChannel).toHaveBeenCalled();
    // Channel should have been created at least twice (initial + reconnect)
    expect(mockChannel.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should cleanup all channels on unmount', () => {
    const { result, unmount } = renderHook(() => useSubscriptionManager());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe({ channelName: 'cleanup-1', table: 'messages', callback });
    });
    act(() => {
      result.current.subscribe({ channelName: 'cleanup-2', table: 'contacts', callback });
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(2);
  });

  it('should handle unsubscribe of non-existent channel gracefully', () => {
    const { result } = renderHook(() => useSubscriptionManager());

    act(() => {
      result.current.unsubscribe('nonexistent');
    });

    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});
