/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => mockSelect()),
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-1' }, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => mockInsert()),
        }),
      }),
    })),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { useConversationAnalyses } from '../useConversationAnalyses';

const mockAnalyses = [
  { id: '1', contact_id: 'c1', summary: 'Test', sentiment: 'positivo', sentiment_score: 80, created_at: '2026-03-29T10:00:00Z', status: 'done', key_points: [], next_steps: [], topics: [], urgency: 'baixa', customer_satisfaction: 8, message_count: 5, analyzed_by: null },
  { id: '2', contact_id: 'c1', summary: 'Test 2', sentiment: 'neutro', sentiment_score: 50, created_at: '2026-03-28T10:00:00Z', status: 'done', key_points: [], next_steps: [], topics: [], urgency: 'media', customer_satisfaction: 6, message_count: 3, analyzed_by: null },
];

describe('useConversationAnalyses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({ data: mockAnalyses, error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockInsert.mockResolvedValue({ data: { id: '3', ...mockAnalyses[0] }, error: null });
  });

  it('should fetch analyses for a contact', async () => {
    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analyses).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when contactId is null', async () => {
    const { result } = renderHook(() => useConversationAnalyses(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.analyses).toHaveLength(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    mockSelect.mockResolvedValue({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('DB error');
    expect(result.current.analyses).toHaveLength(0);
  });

  it('should return latest analysis', async () => {
    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const latest = result.current.getLatestAnalysis();
    expect(latest?.id).toBe('1');
  });

  it('should return null for latest analysis when empty', () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    const latest = result.current.getLatestAnalysis();
    expect(latest).toBeNull();
  });

  it('should return null for sentiment trend with less than 2 analyses', async () => {
    mockSelect.mockResolvedValue({ data: [mockAnalyses[0]], error: null });

    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getSentimentTrend()).toBeNull();
  });

  it('should provide a refetch function', async () => {
    const { result } = renderHook(() => useConversationAnalyses('contact-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelect).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
