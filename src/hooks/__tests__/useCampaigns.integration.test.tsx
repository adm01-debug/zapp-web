/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockCampaigns = [
  {
    id: 'c1', name: 'Draft Campaign', status: 'draft', total_contacts: 50,
    sent_count: 0, delivered_count: 0, read_count: 0, failed_count: 0,
    message_content: 'Hello', message_type: 'text', target_type: 'all',
    send_interval_seconds: 5, created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2', name: 'Sending Campaign', status: 'sending', total_contacts: 100,
    sent_count: 45, delivered_count: 40, read_count: 20, failed_count: 3,
    message_content: 'Promo', message_type: 'text', target_type: 'tag',
    send_interval_seconds: 10, created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'c3', name: 'Completed Campaign', status: 'completed', total_contacts: 200,
    sent_count: 200, delivered_count: 195, read_count: 150, failed_count: 5,
    message_content: 'Done', message_type: 'text', target_type: 'all',
    send_interval_seconds: 5, created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'c4', name: 'Paused Campaign', status: 'paused', total_contacts: 80,
    sent_count: 30, delivered_count: 28, read_count: 10, failed_count: 1,
    message_content: 'Paused', message_type: 'text', target_type: 'queue',
    send_interval_seconds: 5, created_at: '2024-04-01T00:00:00Z',
  },
];

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 'new1', name: 'Created' }, error: null }),
  }),
});

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'c1', status: 'sending' }, error: null }),
    }),
  }),
});

const mockDelete = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockCampaignContactsInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
            }),
          }),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      }
      if (table === 'campaign_contacts') {
        return {
          insert: mockCampaignContactsInsert,
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useCampaigns } from '@/hooks/useCampaigns';
import { TestQueryWrapper } from '@/test/mocks/queryClient';

describe('useCampaigns - integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all campaigns after loading', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaigns).toHaveLength(4);
  });

  it('campaigns include draft status', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const draft = result.current.campaigns.find(c => c.status === 'draft');
    expect(draft).toBeDefined();
    expect(draft!.name).toBe('Draft Campaign');
  });

  it('campaigns include sending status', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const sending = result.current.campaigns.find(c => c.status === 'sending');
    expect(sending).toBeDefined();
    expect(sending!.sent_count).toBe(45);
  });

  it('campaigns include completed status', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const completed = result.current.campaigns.find(c => c.status === 'completed');
    expect(completed!.sent_count).toBe(200);
  });

  it('campaigns include paused status', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaigns.find(c => c.status === 'paused')).toBeDefined();
  });

  it('createCampaign calls supabase insert', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.createCampaign.mutate({ name: 'New', message_content: 'Hi' });
    });

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
  });

  it('createCampaign shows success toast', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.createCampaign.mutate({ name: 'New', message_content: 'Hi' });
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Campanha criada com sucesso!'));
  });

  it('updateCampaign calls supabase update', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updateCampaign.mutate({ id: 'c1', status: 'sending' });
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

  it('deleteCampaign calls supabase delete', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.deleteCampaign.mutate('c1');
    });

    await waitFor(() => expect(mockDelete).toHaveBeenCalled());
  });

  it('addContactsToCampaign inserts contact records', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.addContactsToCampaign.mutate({
        campaignId: 'c1',
        contactIds: ['contact1', 'contact2'],
      });
    });

    await waitFor(() => expect(mockCampaignContactsInsert).toHaveBeenCalled());
  });

  it('progress tracking: sending campaign has partial progress', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const sending = result.current.campaigns.find(c => c.id === 'c2')!;
    const progress = Math.round((sending.sent_count / sending.total_contacts) * 100);
    expect(progress).toBe(45);
  });

  it('progress tracking: completed campaign is 100%', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const completed = result.current.campaigns.find(c => c.id === 'c3')!;
    const progress = Math.round((completed.sent_count / completed.total_contacts) * 100);
    expect(progress).toBe(100);
  });

  it('refetch is a callable function', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('campaign contact targeting data preserved', async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper: TestQueryWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaigns[0].target_type).toBe('all');
    expect(result.current.campaigns[1].target_type).toBe('tag');
    expect(result.current.campaigns[3].target_type).toBe('queue');
  });
});
