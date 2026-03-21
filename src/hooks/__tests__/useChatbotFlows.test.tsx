/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockFlows = [
  { id: 'f1', name: 'Welcome Flow', is_active: true, trigger_type: 'first_message', created_at: '2024-01-01' },
  { id: 'f2', name: 'Menu Flow', is_active: false, trigger_type: 'keyword', created_at: '2024-01-02' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'chatbot_flows') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockFlows, error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'f3', name: 'New Flow' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'f1', name: 'Updated' }, error: null }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
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

describe('useChatbotFlows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches flows and returns them', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.flows).toHaveLength(2);
    expect(result.current.flows[0].name).toBe('Welcome Flow');
  });

  it('returns empty array initially', () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });
    expect(result.current.flows).toEqual([]);
  });

  it('exposes createFlow mutation', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.createFlow.mutateAsync).toBe('function');
  });

  it('exposes updateFlow mutation', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.updateFlow.mutateAsync).toBe('function');
  });

  it('exposes deleteFlow mutation', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.deleteFlow.mutateAsync).toBe('function');
  });

  it('exposes toggleFlow mutation', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.toggleFlow.mutateAsync).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useChatbotFlows(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
