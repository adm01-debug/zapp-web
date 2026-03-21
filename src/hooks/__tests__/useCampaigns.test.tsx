/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockCampaigns = [
  { id: 'c1', name: 'Campaign 1', status: 'draft', created_at: '2024-01-01' },
  { id: 'c2', name: 'Campaign 2', status: 'completed', created_at: '2024-01-02' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'c3', name: 'New' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Updated' }, error: null }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'campaign_contacts') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
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

import { useCampaigns } from '@/hooks/useCampaigns';
import { TestQueryWrapper } from '@/test/mocks/queryClient';

describe('useCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches campaigns and returns them', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns).toHaveLength(2);
    expect(result.current.campaigns[0].name).toBe('Campaign 1');
  });

  it('returns empty array while loading', () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    expect(result.current.campaigns).toEqual([]);
  });

  it('exposes createCampaign mutation', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.createCampaign.mutateAsync).toBe('function');
  });

  it('exposes updateCampaign mutation', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.updateCampaign.mutateAsync).toBe('function');
  });

  it('exposes deleteCampaign mutation', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.deleteCampaign.mutateAsync).toBe('function');
  });

  it('exposes addContactsToCampaign mutation', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.addContactsToCampaign.mutateAsync).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
