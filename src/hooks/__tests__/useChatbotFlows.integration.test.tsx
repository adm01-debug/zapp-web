/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFlows = [
  {
    id: 'f1', name: 'Welcome', is_active: true, trigger_type: 'first_message',
    trigger_value: null, nodes: [], edges: [], variables: {},
    execution_count: 100, last_executed_at: '2024-12-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'f2', name: 'Menu', is_active: false, trigger_type: 'keyword',
    trigger_value: 'menu', nodes: [{ id: 'n1', type: 'start', data: { label: 'Start' }, position: { x: 0, y: 0 } }],
    edges: [], variables: {},
    execution_count: 0, last_executed_at: null,
    created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'f3', name: 'Schedule Bot', is_active: true, trigger_type: 'schedule',
    trigger_value: null, nodes: [], edges: [], variables: { greeting: 'Hi' },
    execution_count: 50, last_executed_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
];

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 'f4', name: 'New Flow' }, error: null }),
  }),
});

const mockUpdateFn = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'f1' }, error: null }),
    }),
  }),
});

const mockDeleteFn = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'chatbot_flows') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockFlows, error: null }),
          }),
          insert: mockInsert,
          update: mockUpdateFn,
          delete: mockDeleteFn,
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useChatbotFlows } from '@/hooks/useChatbotFlows';
import { TestQueryWrapper } from '@/test/mocks/queryClient';

describe('useChatbotFlows - integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns flows after loading', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.flows).toHaveLength(3);
  });

  it('includes active flow', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const active = result.current.flows.filter(f => f.is_active);
    expect(active).toHaveLength(2);
  });

  it('includes inactive flow', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const inactive = result.current.flows.filter(f => !f.is_active);
    expect(inactive).toHaveLength(1);
    expect(inactive[0].name).toBe('Menu');
  });

  it('flow with no nodes has empty array', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const welcome = result.current.flows.find(f => f.id === 'f1')!;
    expect(welcome.nodes).toEqual([]);
  });

  it('flow with nodes has them populated', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const menu = result.current.flows.find(f => f.id === 'f2')!;
    expect(menu.nodes).toHaveLength(1);
    expect(menu.nodes[0].type).toBe('start');
  });

  it('execution count is tracked', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.flows[0].execution_count).toBe(100);
    expect(result.current.flows[1].execution_count).toBe(0);
  });

  it('createFlow calls supabase insert', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.createFlow.mutate({ name: 'New', trigger_type: 'keyword', trigger_value: 'hi' });
    });

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
  });

  it('createFlow shows success toast', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.createFlow.mutate({ name: 'Test' });
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fluxo de chatbot criado!'));
  });

  it('updateFlow calls supabase update', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateFlow.mutate({ id: 'f1', name: 'Updated' });
    });

    await waitFor(() => expect(mockUpdateFn).toHaveBeenCalled());
  });

  it('deleteFlow calls supabase delete', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.deleteFlow.mutate('f2');
    });

    await waitFor(() => expect(mockDeleteFn).toHaveBeenCalled());
  });

  it('toggleFlow activates a flow', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.toggleFlow.mutate({ id: 'f2', is_active: true });
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fluxo ativado!'));
  });

  it('toggleFlow deactivates a flow', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.toggleFlow.mutate({ id: 'f1', is_active: false });
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fluxo desativado!'));
  });

  it('refetch is available', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('trigger types are correctly populated', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.flows[0].trigger_type).toBe('first_message');
    expect(result.current.flows[1].trigger_type).toBe('keyword');
    expect(result.current.flows[2].trigger_type).toBe('schedule');
  });

  it('variables are preserved', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const schedBot = result.current.flows.find(f => f.id === 'f3')!;
    expect(schedBot.variables).toEqual({ greeting: 'Hi' });
  });
});
