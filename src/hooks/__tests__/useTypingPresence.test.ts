/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockTrack, mockPresenceState, mockChannel, mockSupabaseChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockTrack = vi.fn().mockResolvedValue(undefined);
  const mockPresenceState = vi.fn().mockReturnValue({});
  const mockChannel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    track: mockTrack,
    presenceState: mockPresenceState,
  };
  const mockSupabaseChannel = vi.fn().mockReturnValue(mockChannel);
  const mockRemoveChannel = vi.fn();
  return { mockTrack, mockPresenceState, mockChannel, mockSupabaseChannel, mockRemoveChannel };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mockSupabaseChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useTypingPresence } from '@/hooks/useTypingPresence';

describe('useTypingPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with no typing users', () => {
    const { result } = renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    expect(result.current.isContactTyping).toBe(false);
    expect(result.current.typingUsers).toEqual([]);
  });

  it('creates a presence channel for the conversation', () => {
    renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('typing:conv1', expect.objectContaining({
      config: expect.objectContaining({
        presence: expect.objectContaining({ key: 'agent' }),
      }),
    }));
  });

  it('does not create channel when conversationId is empty', () => {
    mockSupabaseChannel.mockClear();

    renderHook(() =>
      useTypingPresence({ conversationId: '' })
    );

    expect(mockSupabaseChannel).not.toHaveBeenCalled();
  });

  it('subscribes to presence sync, join, and leave events', () => {
    renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    expect(mockChannel.on).toHaveBeenCalledTimes(3);
    expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
    expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
    expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
  });

  it('handleTypingStart tracks typing and auto-stops after 3 seconds', async () => {
    const { result } = renderHook(() =>
      useTypingPresence({
        conversationId: 'conv1',
        currentUserId: 'agent1',
        currentUserName: 'Agent Smith',
      })
    );

    act(() => {
      result.current.handleTypingStart();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'agent1',
        name: 'Agent Smith',
        isTyping: true,
      })
    );

    mockTrack.mockClear();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        isTyping: false,
      })
    );
  });

  it('handleTypingStop tracks isTyping false immediately', () => {
    const { result } = renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    act(() => {
      result.current.handleTypingStop();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        isTyping: false,
      })
    );
  });

  it('handleTypingStart resets the auto-stop timer on repeated calls', () => {
    const { result } = renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    act(() => {
      result.current.handleTypingStart();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    mockTrack.mockClear();

    act(() => {
      result.current.handleTypingStart();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ isTyping: true })
    );

    mockTrack.mockClear();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockTrack).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ isTyping: false })
    );
  });

  it('cleans up channel and timeout on unmount', () => {
    const { unmount } = renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('uses default userId and name when not provided', () => {
    renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    expect(mockSupabaseChannel).toHaveBeenCalledWith('typing:conv1', expect.objectContaining({
      config: expect.objectContaining({
        presence: expect.objectContaining({ key: 'agent' }),
      }),
    }));
  });

  it('returns expected API shape', () => {
    const { result } = renderHook(() =>
      useTypingPresence({ conversationId: 'conv1' })
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        isContactTyping: expect.any(Boolean),
        typingUsers: expect.any(Array),
        handleTypingStart: expect.any(Function),
        handleTypingStop: expect.any(Function),
      })
    );
  });
});
