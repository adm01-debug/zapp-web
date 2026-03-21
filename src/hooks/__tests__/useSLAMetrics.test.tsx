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

import { useSLAMetrics } from '@/hooks/useSLAMetrics';

function makeChain(slaData: any[] = [], profiles: any[] = []) {
  return (table: string) => {
    if (table === 'conversation_sla') {
      return {
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: slaData, error: null }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockResolvedValue({ data: profiles, error: null }),
      };
    }
    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  };
}

const mockSLAData = [
  {
    id: 's1', contact_id: 'c1', first_response_breached: false, resolution_breached: false,
    first_response_at: '2024-01-01T10:05:00Z', first_message_at: '2024-01-01T10:00:00Z',
    resolved_at: '2024-01-01T11:00:00Z', created_at: '2024-01-01T10:00:00Z',
    contacts: { assigned_to: 'p1' },
  },
  {
    id: 's2', contact_id: 'c2', first_response_breached: true, resolution_breached: true,
    first_response_at: null, first_message_at: '2024-01-01T10:00:00Z',
    resolved_at: null, created_at: '2024-01-01T10:00:00Z',
    contacts: { assigned_to: 'p1' },
  },
];

const mockProfiles = [
  { id: 'p1', name: 'Agent 1', avatar_url: null },
  { id: 'p2', name: 'Agent 2', avatar_url: 'https://avatar.url' },
];

describe('useSLAMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches SLA metrics with default period', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('returns loading true initially', () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    expect(result.current.loading).toBe(true);
  });

  it('calculates overall metrics correctly', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const overall = result.current.data?.overall;
    expect(overall).toBeDefined();
    expect(overall?.totalConversations).toBe(2);
    expect(overall?.firstResponse.onTime).toBe(1);
    expect(overall?.firstResponse.breached).toBe(1);
  });

  it('calculates per-agent metrics', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const byAgent = result.current.data?.byAgent;
    expect(byAgent).toBeDefined();
    expect(byAgent!.length).toBeGreaterThan(0);
  });

  it('handles empty SLA data', async () => {
    mockFrom.mockImplementation(makeChain([], mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.overall.totalConversations).toBe(0);
    expect(result.current.data?.overall.overallRate).toBe(100);
  });

  it('handles today period', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics('today'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('handles week period', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics('week'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('handles month period', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics('month'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('handles all period', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics('all'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('handles fetch error gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_sla') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('SLA rate is 50% with 1 on-time and 1 breached for first response', async () => {
    mockFrom.mockImplementation(makeChain(mockSLAData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.overall.firstResponse.rate).toBe(50);
  });

  it('handles SLA data without assigned agents', async () => {
    const unassigned = [
      { ...mockSLAData[0], contacts: { assigned_to: null } },
    ];
    mockFrom.mockImplementation(makeChain(unassigned, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.byAgent.length).toBe(0);
  });

  it('sorts agents by overallRate descending', async () => {
    const multiAgentData = [
      { ...mockSLAData[0], contacts: { assigned_to: 'p1' } },
      { ...mockSLAData[1], contacts: { assigned_to: 'p2' } },
    ];
    mockFrom.mockImplementation(makeChain(multiAgentData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const byAgent = result.current.data?.byAgent;
    if (byAgent && byAgent.length >= 2) {
      expect(byAgent[0].overallRate).toBeGreaterThanOrEqual(byAgent[1].overallRate);
    }
  });

  it('handles large dataset', async () => {
    const largeData = Array.from({ length: 500 }, (_, i) => ({
      id: `s${i}`, contact_id: `c${i % 50}`,
      first_response_breached: i % 5 === 0, resolution_breached: i % 7 === 0,
      first_response_at: i % 5 !== 0 ? '2024-01-01T10:05:00Z' : null,
      resolved_at: i % 7 !== 0 ? '2024-01-01T11:00:00Z' : null,
      first_message_at: '2024-01-01T10:00:00Z', created_at: '2024-01-01T10:00:00Z',
      contacts: { assigned_to: `p${i % 2 + 1}` },
    }));
    mockFrom.mockImplementation(makeChain(largeData, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.overall.totalConversations).toBe(500);
  });

  it('returns 100% rate when all conversations are on-time', async () => {
    const allOnTime = [
      { ...mockSLAData[0], first_response_breached: false, resolution_breached: false, contacts: { assigned_to: 'p1' } },
    ];
    mockFrom.mockImplementation(makeChain(allOnTime, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.overall.firstResponse.rate).toBe(100);
  });

  it('returns 0% rate when all conversations are breached', async () => {
    const allBreached = [
      { ...mockSLAData[1], first_response_breached: true, resolution_breached: true, first_response_at: '2024-01-01T10:05:00Z', contacts: { assigned_to: 'p1' } },
    ];
    mockFrom.mockImplementation(makeChain(allBreached, mockProfiles));
    const { result } = renderHook(() => useSLAMetrics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.overall.firstResponse.rate).toBe(0);
  });
});
