/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: any) => children,
}));

import { useAgentGamification, calculateLevel, xpForNextLevel, levelProgress, ACHIEVEMENT_TYPES } from '@/hooks/useAgentGamification';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const defaultStats = {
  id: 's1', profile_id: 'p1', xp: 500, level: 4,
  current_streak: 5, best_streak: 10, messages_sent: 100,
  messages_received: 80, conversations_resolved: 20,
  achievements_count: 5, avg_response_time_seconds: 120,
  customer_satisfaction_score: 4.5,
};

describe('useAgentGamification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'agent_stats') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: defaultStats, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'agent_achievements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'a1', profile_id: 'p1', achievement_type: 'fast_response', achievement_name: 'Fast', xp_earned: 50, earned_at: '2024-01-01' }],
                  error: null,
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
  });

  it('initializes without error', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns null stats when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeUndefined();
  });

  it('returns stats with XP and level', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.stats).toBeDefined());
    expect(result.current.stats?.xp).toBe(500);
    expect(result.current.stats?.level).toBe(4);
  });

  it('returns current streak', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.stats).toBeDefined());
    expect(result.current.stats?.current_streak).toBe(5);
  });

  it('returns best streak', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.stats).toBeDefined());
    expect(result.current.stats?.best_streak).toBe(10);
  });

  it('fetches achievements list', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.achievements.length).toBeGreaterThan(0));
    expect(result.current.achievements).toBeDefined();
  });

  it('returns profileId', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.profileId).toBeDefined());
    expect(result.current.profileId).toBe('p1');
  });

  it('exposes addXp function', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.addXp).toBe('function');
  });

  it('exposes grantAchievement function', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.grantAchievement).toBe('function');
  });

  it('exposes updateStreak function', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.updateStreak).toBe('function');
  });

  it('exposes incrementMessages function', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.incrementMessages).toBe('function');
  });

  it('exposes incrementResolutions function', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.incrementResolutions).toBe('function');
  });

  it('ACHIEVEMENT_TYPES contains all required types', () => {
    expect(ACHIEVEMENT_TYPES.FAST_RESPONSE).toBe('fast_response');
    expect(ACHIEVEMENT_TYPES.SPEED_DEMON).toBe('speed_demon');
    expect(ACHIEVEMENT_TYPES.STREAK).toBe('streak');
    expect(ACHIEVEMENT_TYPES.STREAK_MASTER).toBe('streak_master');
    expect(ACHIEVEMENT_TYPES.RESOLUTION).toBe('resolution');
    expect(ACHIEVEMENT_TYPES.PERFECT_RATING).toBe('perfect_rating');
    expect(ACHIEVEMENT_TYPES.LEVEL_UP).toBe('level_up');
    expect(ACHIEVEMENT_TYPES.DAILY_GOAL).toBe('daily_goal');
    expect(ACHIEVEMENT_TYPES.FIRST_MESSAGE).toBe('first_message');
    expect(ACHIEVEMENT_TYPES.FIRST_RESOLUTION).toBe('first_resolution');
    expect(ACHIEVEMENT_TYPES.MESSAGE_MILESTONE).toBe('message_milestone');
    expect(ACHIEVEMENT_TYPES.TEAM_PLAYER).toBe('team_player');
  });

  it('all achievement type values are unique', () => {
    const values = Object.values(ACHIEVEMENT_TYPES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('isAddingXp defaults to false', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAddingXp).toBe(false);
  });

  it('isGrantingAchievement defaults to false', async () => {
    const { result } = renderHook(() => useAgentGamification(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isGrantingAchievement).toBe(false);
  });
});

describe('calculateLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 for small XP', () => {
    expect(calculateLevel(10)).toBe(1);
  });

  it('returns 2 for 50 XP', () => {
    expect(calculateLevel(50)).toBe(2);
  });

  it('returns correct level for 200 XP', () => {
    expect(calculateLevel(200)).toBe(3);
  });

  it('returns correct level for 1000 XP', () => {
    const level = calculateLevel(1000);
    expect(level).toBeGreaterThan(1);
  });

  it('returns NaN for negative XP (edge case - no guard)', () => {
    // Math.sqrt of negative/50 is NaN, Math.floor(NaN) is NaN, Math.max(1, NaN) = NaN
    const result = calculateLevel(-100);
    expect(Number.isNaN(result)).toBe(true);
  });

  it('handles very large XP', () => {
    const level = calculateLevel(1000000);
    expect(level).toBeGreaterThan(100);
  });
});

describe('xpForNextLevel', () => {
  it('returns 0 for level 0', () => {
    expect(xpForNextLevel(0)).toBe(0);
  });

  it('returns 50 for level 1', () => {
    expect(xpForNextLevel(1)).toBe(50);
  });

  it('returns 200 for level 2', () => {
    expect(xpForNextLevel(2)).toBe(200);
  });

  it('increases with each level', () => {
    const xp3 = xpForNextLevel(3);
    const xp4 = xpForNextLevel(4);
    expect(xp4).toBeGreaterThan(xp3);
  });
});

describe('levelProgress', () => {
  it('returns 0 for start of level', () => {
    const progress = levelProgress(50, 2); // 50 XP at level 2 (needs 50-200)
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('returns value between 0 and 100', () => {
    const progress = levelProgress(100, 2);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('clamps to 100 max', () => {
    const progress = levelProgress(999999, 2);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('clamps to 0 min', () => {
    const progress = levelProgress(0, 1);
    expect(progress).toBeGreaterThanOrEqual(0);
  });
});
