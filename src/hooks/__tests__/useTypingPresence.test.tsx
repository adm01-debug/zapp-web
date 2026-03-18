import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockTrack = vi.fn();
const mockUntrack = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: mockSubscribe,
      track: mockTrack,
      untrack: mockUntrack,
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/lib/logger', () => ({ log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

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
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'conv-1',
      currentUserId: 'user-1',
      currentUserName: 'Agent',
    }));
    expect(result.current.typingUsers).toEqual([]);
  });

  it('exposes handleTypingStop function', () => {
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'conv-1',
    }));
    expect(typeof result.current.handleTypingStop).toBe('function');
  });

  it('exposes handleTypingStart function', () => {
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'conv-1',
    }));
    expect(typeof result.current.handleTypingStart).toBe('function');
  });

  it('isContactTyping defaults to false', () => {
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'conv-1',
    }));
    expect(result.current.isContactTyping).toBe(false);
  });

  it('handles missing currentUserId with defaults', () => {
    const { result } = renderHook(() => useTypingPresence({
      conversationId: 'conv-1',
    }));
    expect(result.current).toBeDefined();
  });
});
