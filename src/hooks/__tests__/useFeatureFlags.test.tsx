import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeatureFlags, FEATURE_FLAGS } from '../useFeatureFlags';
import React from 'react';

// Mock supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({
              data: [
                {
                  id: '1',
                  key: 'campaign_execution',
                  description: 'Campaign execution',
                  is_enabled: true,
                  target_percentage: 100,
                  target_organizations: [],
                  metadata: {},
                },
                {
                  id: '2',
                  key: 'ai_suggestions',
                  description: 'AI suggestions',
                  is_enabled: true,
                  target_percentage: 50,
                  target_organizations: [],
                  metadata: {},
                },
              ],
              error: null,
            });
          },
        };
      },
    }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads feature flags from database', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.flags).toHaveLength(2);
  });

  it('checks if a flag is enabled', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled(FEATURE_FLAGS.CAMPAIGN_EXECUTION)).toBe(true);
    expect(result.current.isEnabled(FEATURE_FLAGS.AI_SUGGESTIONS)).toBe(true);
    expect(result.current.isEnabled('nonexistent_flag')).toBe(false);
  });

  it('gets a specific flag', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const flag = result.current.getFlag(FEATURE_FLAGS.CAMPAIGN_EXECUTION);
    expect(flag).toBeDefined();
    expect(flag?.key).toBe('campaign_execution');
    expect(flag?.target_percentage).toBe(100);
  });

  it('returns undefined for unknown flag', async () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getFlag('nonexistent')).toBeUndefined();
  });

  it('exports known feature flag constants', () => {
    expect(FEATURE_FLAGS.CAMPAIGN_EXECUTION).toBe('campaign_execution');
    expect(FEATURE_FLAGS.AUTO_CLOSE_CONVERSATIONS).toBe('auto_close_conversations');
    expect(FEATURE_FLAGS.ADVANCED_ANALYTICS).toBe('advanced_analytics');
    expect(FEATURE_FLAGS.AI_SUGGESTIONS).toBe('ai_suggestions');
  });
});
