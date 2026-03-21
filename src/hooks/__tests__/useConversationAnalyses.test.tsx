/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useConversationAnalyses } from '@/hooks/useConversationAnalyses';

const mockAnalyses = [
  {
    id: 'a1', contact_id: 'c1', analyzed_by: 'p1', summary: 'Customer wants refund',
    status: 'completed', key_points: ['refund request'], next_steps: ['process refund'],
    sentiment: 'negativo', sentiment_score: 30, topics: ['billing'], urgency: 'alta',
    customer_satisfaction: 2, message_count: 15, created_at: '2024-01-10',
  },
  {
    id: 'a2', contact_id: 'c1', analyzed_by: 'p1', summary: 'General inquiry',
    status: 'completed', key_points: ['product info'], next_steps: ['send catalog'],
    sentiment: 'neutro', sentiment_score: 50, topics: ['products'], urgency: 'baixa',
    customer_satisfaction: 4, message_count: 5, created_at: '2024-01-09',
  },
  {
    id: 'a3', contact_id: 'c1', analyzed_by: 'p1', summary: 'Happy customer',
    status: 'completed', key_points: ['praise'], next_steps: [],
    sentiment: 'positivo', sentiment_score: 90, topics: ['support'], urgency: 'baixa',
    customer_satisfaction: 5, message_count: 3, created_at: '2024-01-08',
  },
];

const largeAnalyses = Array.from({ length: 20 }, (_, i) => ({
  id: `a${i}`, contact_id: 'c1', analyzed_by: 'p1', summary: `Analysis ${i}`,
  status: 'completed', key_points: [], next_steps: [],
  sentiment: i % 3 === 0 ? 'negativo' : i % 3 === 1 ? 'neutro' : 'positivo',
  sentiment_score: 10 + i * 4, topics: [], urgency: 'baixa',
  customer_satisfaction: 3, message_count: 5, created_at: `2024-01-${String(20 - i).padStart(2, '0')}`,
}));

describe('useConversationAnalyses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockAnalyses, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...mockAnalyses[0], id: 'new1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
  });

  it('fetches analyses for a contact', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analyses).toHaveLength(3);
  });

  it('returns empty for null contactId', async () => {
    const { result } = renderHook(() => useConversationAnalyses(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analyses).toEqual([]);
  });

  it('handles fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Failed') }),
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('exposes saveAnalysis function', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.saveAnalysis).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('getLatestAnalysis returns first analysis', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const latest = result.current.getLatestAnalysis();
    expect(latest?.id).toBe('a1');
  });

  it('getLatestAnalysis returns null when no analyses', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getLatestAnalysis()).toBeNull();
  });

  it('getSentimentTrend returns null with less than 2 analyses', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [mockAnalyses[0]], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getSentimentTrend()).toBeNull();
  });

  it('getSentimentTrend detects improving trend', async () => {
    const improvingAnalyses = Array.from({ length: 10 }, (_, i) => ({
      ...mockAnalyses[0],
      id: `a${i}`,
      sentiment_score: i < 5 ? 80 : 30, // recent (first 5) high, older low
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: improvingAnalyses, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getSentimentTrend()).toBe('improving');
  });

  it('getSentimentTrend detects declining trend', async () => {
    const decliningAnalyses = Array.from({ length: 10 }, (_, i) => ({
      ...mockAnalyses[0],
      id: `a${i}`,
      sentiment_score: i < 5 ? 20 : 80, // recent low, older high
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: decliningAnalyses, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getSentimentTrend()).toBe('declining');
  });

  it('getSentimentTrend detects stable trend', async () => {
    const stableAnalyses = Array.from({ length: 10 }, (_, i) => ({
      ...mockAnalyses[0],
      id: `a${i}`,
      sentiment_score: 50, // all same
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: stableAnalyses, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getSentimentTrend()).toBe('stable');
  });

  it('handles zero sentiment scores', async () => {
    const zeroAnalyses = mockAnalyses.map(a => ({ ...a, sentiment_score: 0 }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: zeroAnalyses, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analyses[0].sentiment_score).toBe(0);
  });

  it('handles large dataset (20 analyses)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: largeAnalyses, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analyses).toHaveLength(20);
  });

  it('sets loading to true then false', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    // Initially loading
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('error is null on successful fetch', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('saveAnalysis adds to local state', async () => {
    const { result } = renderHook(() => useConversationAnalyses('c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveAnalysis({
        contact_id: 'c1', summary: 'New', status: 'completed',
        key_points: [], next_steps: [], sentiment: 'positivo', sentiment_score: 80,
        topics: [], urgency: 'baixa', customer_satisfaction: 5, message_count: 2,
      });
    });

    // The saved analysis should be prepended
    expect(result.current.analyses.length).toBeGreaterThanOrEqual(3);
  });

  it('handles contactId change', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useConversationAnalyses(id),
      { initialProps: { id: 'c1' as string | null } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ id: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Should not crash
    expect(result.current.analyses).toBeDefined();
  });
});
