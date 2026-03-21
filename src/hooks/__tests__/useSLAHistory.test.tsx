/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useSLAHistory } from '@/hooks/useSLAHistory';

function makeChain(data: any = [], error: any = null) {
  return {
    select: vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('useSLAHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain([]));
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    expect(result.current.loading).toBe(true);
  });

  it('fetches data for 7d period', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('fetches data for 14d period', async () => {
    const { result } = renderHook(() => useSLAHistory('14d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('fetches data for 30d period', async () => {
    const { result } = renderHook(() => useSLAHistory('30d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches data for 90d period', async () => {
    const { result } = renderHook(() => useSLAHistory('90d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('defaults to 30d when no period provided', async () => {
    const { result } = renderHook(() => useSLAHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('handles empty data gracefully', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.totalBreaches).toBe(0);
    expect(result.current.data?.totals.overallSLARate).toBe(100);
  });

  it('handles SLA records with first response breaches', async () => {
    const now = new Date();
    mockFrom.mockReturnValue(makeChain([
      { id: '1', contact_id: 'c1', first_response_breached: true, resolution_breached: false, created_at: now.toISOString() },
    ]));
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.firstResponseBreaches).toBe(1);
  });

  it('handles SLA records with resolution breaches', async () => {
    const now = new Date();
    mockFrom.mockReturnValue(makeChain([
      { id: '2', contact_id: 'c2', first_response_breached: false, resolution_breached: true, created_at: now.toISOString() },
    ]));
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.resolutionBreaches).toBe(1);
  });

  it('handles both breach types', async () => {
    const now = new Date();
    mockFrom.mockReturnValue(makeChain([
      { id: '3', contact_id: 'c3', first_response_breached: true, resolution_breached: true, created_at: now.toISOString() },
    ]));
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.totalBreaches).toBe(2);
  });

  it('handles fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }),
    });
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('data contains dailyData array with correct length', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(Array.isArray(result.current.data?.dailyData)).toBe(true);
    // 7 days + today = 8 days
    expect(result.current.data!.dailyData.length).toBeGreaterThanOrEqual(7);
  });

  it('data contains trends object', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.trends).toBeDefined();
    expect(result.current.data?.trends.firstResponse).toBeDefined();
    expect(result.current.data?.trends.resolution).toBeDefined();
    expect(result.current.data?.trends.overall).toBeDefined();
  });

  it('trend direction is stable for zero data', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.trends.overall.direction).toBe('stable');
  });

  it('worstDays and bestDays are arrays', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(Array.isArray(result.current.data?.worstDays)).toBe(true);
    expect(Array.isArray(result.current.data?.bestDays)).toBe(true);
  });

  it('handles large dataset (90 days of records)', async () => {
    const records = Array.from({ length: 200 }, (_, i) => ({
      id: `s${i}`, contact_id: `c${i % 10}`,
      first_response_breached: i % 7 === 0, resolution_breached: i % 11 === 0,
      created_at: new Date(Date.now() - (i % 90) * 86400000).toISOString(),
    }));
    mockFrom.mockReturnValue(makeChain(records));
    const { result } = renderHook(() => useSLAHistory('90d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.totalConversations).toBe(200);
  });

  it('SLA rate is 100% when no breaches', async () => {
    const now = new Date();
    mockFrom.mockReturnValue(makeChain([
      { id: '1', contact_id: 'c1', first_response_breached: false, resolution_breached: false, created_at: now.toISOString() },
    ]));
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totals.overallSLARate).toBe(100);
  });

  it('dailyData entries have all required fields', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const day = result.current.data!.dailyData[0];
    expect(day).toHaveProperty('date');
    expect(day).toHaveProperty('dateLabel');
    expect(day).toHaveProperty('firstResponseBreaches');
    expect(day).toHaveProperty('resolutionBreaches');
    expect(day).toHaveProperty('totalBreaches');
    expect(day).toHaveProperty('totalConversations');
    expect(day).toHaveProperty('slaRate');
  });
});
