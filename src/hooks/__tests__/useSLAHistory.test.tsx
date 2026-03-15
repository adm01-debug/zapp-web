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

describe('useSLAHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
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

  it('fetches data for 30d period', async () => {
    const { result } = renderHook(() => useSLAHistory('30d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches data for 90d period', async () => {
    const { result } = renderHook(() => useSLAHistory('90d'));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('handles empty data gracefully', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.totals.totalBreaches).toBe(0);
    expect(result.current.data?.totals.overallSLARate).toBeDefined();
  });

  it('handles SLA records with breaches', async () => {
    const now = new Date();
    const mockRecords = [
      { id: '1', contact_id: 'c1', first_response_breached: true, resolution_breached: false, created_at: now.toISOString(), first_message_at: now.toISOString(), first_response_at: now.toISOString(), resolved_at: null },
      { id: '2', contact_id: 'c2', first_response_breached: false, resolution_breached: true, created_at: now.toISOString(), first_message_at: now.toISOString(), first_response_at: now.toISOString(), resolved_at: now.toISOString() },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.totals.firstResponseBreaches).toBe(1);
    expect(result.current.data?.totals.resolutionBreaches).toBe(1);
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

  it('data contains dailyData array', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.data?.dailyData)).toBe(true);
    expect(result.current.data!.dailyData.length).toBeGreaterThan(0);
  });

  it('data contains trends', async () => {
    const { result } = renderHook(() => useSLAHistory('7d'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.trends).toBeDefined();
    expect(result.current.data?.trends.overall).toBeDefined();
  });

  it('defaults to 30d when no period provided', async () => {
    const { result } = renderHook(() => useSLAHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });
});
