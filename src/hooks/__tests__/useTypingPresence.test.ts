import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockTrack = vi.fn();
const mockUntrack = vi.fn();
const mockSubscribe = vi.fn().mockReturnThis();
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: mockSubscribe,
      track: mockTrack,
      untrack: mockUntrack,
    }),
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
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

  it('initializes with empty typing users', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(result.current.typingUsers).toEqual([]);
  });

  it('initializes with contact not typing', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(result.current.isContactTyping).toBe(false);
  });

  it('exposes setTyping function', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(typeof result.current.setTyping).toBe('function');
  });

  it('exposes handleTypingStart function', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(typeof result.current.handleTypingStart).toBe('function');
  });

  it('exposes handleTypingStop function', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(typeof result.current.handleTypingStop).toBe('function');
  });

  it('does not create channel with empty conversationId', () => {
    const { supabase } = require('@/integrations/supabase/client');
    vi.clearAllMocks();
    renderHook(() => useTypingPresence({ conversationId: '' }));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('creates channel for valid conversationId', () => {
    const { supabase } = require('@/integrations/supabase/client');
    renderHook(() => useTypingPresence({ conversationId: 'conv-123' }));
    expect(supabase.channel).toHaveBeenCalledWith('typing:conv-123', expect.any(Object));
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('accepts custom userId and userName', () => {
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'c1',
      currentUserId: 'user-42',
      currentUserName: 'João',
    }));
    expect(result.current).toBeDefined();
  });
});
