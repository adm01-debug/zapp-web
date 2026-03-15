import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  track: vi.fn(),
  untrack: vi.fn(),
};
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue(mockChannel),
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
  });

  it('initializes with empty typing users', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(result.current.typingUsers).toEqual([]);
    expect(result.current.isContactTyping).toBe(false);
  });

  it('exposes handleTypingStart and handleTypingStop', () => {
    const { result } = renderHook(() => useTypingPresence({ conversationId: 'c1' }));
    expect(typeof result.current.handleTypingStart).toBe('function');
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
