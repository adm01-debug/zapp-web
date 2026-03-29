/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockSlaSelect = vi.fn();
const mockProfilesSelect = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'conversation_sla') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockImplementation(() => mockSlaSelect()),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockImplementation(() => mockProfilesSelect()),
        };
      }
      return { select: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    }),
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

import { useSLAMetrics } from '../useSLAMetrics';

const mockSlaData = [
  { id: '1', contact_id: 'c1', first_response_at: '2026-03-29T10:05:00Z', first_response_breached: false, resolved_at: '2026-03-29T11:00:00Z', resolution_breached: false, contacts: { assigned_to: 'agent-1' }, created_at: '2026-03-29T10:00:00Z' },
  { id: '2', contact_id: 'c2', first_response_at: null, first_response_breached: true, resolved_at: null, resolution_breached: true, contacts: { assigned_to: 'agent-1' }, created_at: '2026-03-29T10:00:00Z' },
  { id: '3', contact_id: 'c3', first_response_at: '2026-03-29T10:02:00Z', first_response_breached: false, resolved_at: '2026-03-29T10:30:00Z', resolution_breached: false, contacts: { assigned_to: 'agent-2' }, created_at: '2026-03-29T10:00:00Z' },
];

const mockProfiles = [
  { id: 'agent-1', name: 'Alice', avatar_url: null },
  { id: 'agent-2', name: 'Bob', avatar_url: 'https://example.com/bob.jpg' },
];

describe('useSLAMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSlaSelect.mockResolvedValue({ data: mockSlaData, error: null });
    mockProfilesSelect.mockResolvedValue({ data: mockProfiles, error: null });
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useSLAMetrics('today'));
    expect(result.current.loading).toBe(true);
  });

  it('should fetch and compute overall SLA metrics', async () => {
    const { result } = renderHook(() => useSLAMetrics('today'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.overall.totalConversations).toBe(3);
    // 2 on-time first responses, 1 breached = 3 total first responses
    expect(result.current.data!.overall.firstResponse.onTime).toBe(2);
    expect(result.current.data!.overall.firstResponse.breached).toBe(1);
    expect(result.current.data!.overall.firstResponse.total).toBe(3);
  });

  it('should compute resolution metrics', async () => {
    const { result } = renderHook(() => useSLAMetrics('today'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 2 resolved on time, 1 breached
    expect(result.current.data!.overall.resolution.onTime).toBe(2);
    expect(result.current.data!.overall.resolution.breached).toBe(1);
  });

  it('should compute agent-level SLA metrics', async () => {
    const { result } = renderHook(() => useSLAMetrics('today'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data!.byAgent).toHaveLength(2);
    // Agent-2 (Bob) should be first since 100% rate
    const bob = result.current.data!.byAgent.find(a => a.agentName === 'Bob');
    expect(bob).toBeDefined();
    expect(bob!.overallRate).toBe(100);
  });

  it('should handle empty data gracefully', async () => {
    mockSlaSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useSLAMetrics('today'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data!.overall.totalConversations).toBe(0);
    expect(result.current.data!.overall.overallRate).toBe(100); // Default 100% when no data
    expect(result.current.data!.byAgent).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    mockSlaSelect.mockResolvedValue({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useSLAMetrics('today'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it('should refetch when period changes', async () => {
    const { result, rerender } = renderHook(
      ({ period }) => useSLAMetrics(period),
      { initialProps: { period: 'today' as const } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSlaSelect).toHaveBeenCalledTimes(1);

    rerender({ period: 'week' as const });

    await waitFor(() => {
      expect(mockSlaSelect).toHaveBeenCalledTimes(2);
    });
  });
});
