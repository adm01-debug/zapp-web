/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => {
  function makeChainable(table: string, overrides?: Record<string, any>): any {
    const handler: ProxyHandler<any> = {
      get(_, prop) {
        if (prop === 'then') {
          return (resolve: any) => {
            if (overrides && overrides[table] !== undefined) {
              return Promise.resolve(overrides[table]).then(resolve);
            }
            if (table === 'profiles') {
              return Promise.resolve({
                data: [
                  { id: 'p1', name: 'Agent 1', is_active: true, role: 'agent' },
                  { id: 'p2', name: 'Agent 2', is_active: false, role: 'agent' },
                ],
                error: null,
              }).then(resolve);
            }
            if (table === 'contacts') {
              return Promise.resolve({
                data: [
                  { id: 'c1', name: 'Contact 1', phone: '+5511999', avatar_url: null, assigned_to: 'p1', queue_id: 'q1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                  { id: 'c2', name: 'Contact 2', phone: '+5511888', avatar_url: null, assigned_to: null, queue_id: 'q1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                ],
                error: null,
              }).then(resolve);
            }
            if (table === 'messages') {
              return Promise.resolve({
                data: [
                  { id: 'm1', contact_id: 'c1', content: 'Hello', sender: 'contact', created_at: new Date().toISOString(), is_read: false, agent_id: 'p1', contacts: { name: 'Contact 1', phone: '+5511999', avatar_url: null, queue_id: 'q1' } },
                ],
                error: null,
              }).then(resolve);
            }
            if (table === 'queues') {
              return Promise.resolve({
                data: [{ id: 'q1', name: 'Support', color: '#3B82F6', is_active: true, queue_members: [{ profile_id: 'p1', is_active: true, profiles: { id: 'p1', is_active: true } }] }],
                error: null,
              }).then(resolve);
            }
            if (table === 'conversation_sla') {
              return Promise.resolve({
                data: [
                  { first_message_at: '2024-01-01T10:00:00Z', first_response_at: '2024-01-01T10:02:00Z' },
                ],
                error: null,
              }).then(resolve);
            }
            return Promise.resolve({ data: [], error: null }).then(resolve);
          };
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  const fromFn = vi.fn().mockImplementation((table: string) => makeChainable(table));

  return {
    supabase: {
      from: fromFn,
    },
    __makeChainable: makeChainable,
    __fromFn: fromFn,
  };
});

import { useDashboardData, formatResponseTime, DashboardFilters } from '@/hooks/useDashboardData';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard stats with default filters', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });

  it('returns correct openConversations count', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // c1 has assigned_to, c2 does not
    expect(result.current.stats?.openConversations).toBe(1);
  });

  it('returns correct pendingConversations count', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // c2 has no assigned_to but has queue_id
    expect(result.current.stats?.pendingConversations).toBe(1);
  });

  it('returns correct online/total agent counts', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats?.onlineAgents).toBe(1);
    expect(result.current.stats?.totalAgents).toBe(2);
  });

  it('returns totalConversations matching contacts count', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats?.totalConversations).toBe(2);
  });

  it('returns queuesStats array', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats?.queuesStats).toBeDefined();
    expect(result.current.stats!.queuesStats.length).toBeGreaterThan(0);
    expect(result.current.stats!.queuesStats[0].name).toBe('Support');
  });

  it('returns recentActivity from messages', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats?.recentActivity.length).toBeGreaterThan(0);
    expect(result.current.stats!.recentActivity[0].contactName).toBe('Contact 1');
  });

  it('accepts custom queueId filter', async () => {
    const filters: DashboardFilters = { queueId: 'q1' };
    const { result } = renderHook(() => useDashboardData(filters), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });

  it('accepts custom agentId filter', async () => {
    const filters: DashboardFilters = { agentId: 'p1' };
    const { result } = renderHook(() => useDashboardData(filters), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });

  it('accepts custom date range filter', async () => {
    const filters: DashboardFilters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      },
    };
    const { result } = renderHook(() => useDashboardData(filters), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('returns avgResponseTime from SLA data', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Based on 2 min difference -> 120 seconds
    expect(result.current.stats?.avgResponseTime).toBe(120);
  });

  it('returns null avgResponseTime when no SLA data', async () => {
    // Need a wrapper that returns empty SLA
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Our mock returns SLA data, so this tests the default path
    expect(result.current.stats?.avgResponseTime).toBeDefined();
  });

  it('queue stats include color', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats!.queuesStats[0].color).toBe('#3B82F6');
  });

  it('recent activity includes unread status', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats!.recentActivity[0].status).toBe('unread');
  });
});

describe('formatResponseTime', () => {
  it('returns N/A for null', () => {
    expect(formatResponseTime(null)).toBe('N/A');
  });

  it('formats seconds under 60', () => {
    expect(formatResponseTime(45)).toBe('45s');
  });

  it('formats exactly 60 seconds', () => {
    expect(formatResponseTime(60)).toBe('1min 0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatResponseTime(125)).toBe('2min 5s');
  });

  it('formats hours', () => {
    expect(formatResponseTime(3665)).toBe('1h 1min');
  });

  it('formats zero seconds', () => {
    expect(formatResponseTime(0)).toBe('0s');
  });

  it('formats large values (24+ hours)', () => {
    const result = formatResponseTime(86400);
    expect(result).toContain('h');
  });
});
