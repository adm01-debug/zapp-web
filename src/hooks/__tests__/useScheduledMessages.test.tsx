import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useScheduledMessages } from '@/hooks/useScheduledMessages';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockMessages = [
  { id: 'sm1', contact_id: 'c1', content: 'Follow up', scheduled_at: '2024-12-01T10:00:00Z', status: 'pending', created_at: '2024-01-01', message_type: 'text' },
  { id: 'sm2', contact_id: 'c2', content: 'Reminder', scheduled_at: '2024-12-02T10:00:00Z', status: 'sent', created_at: '2024-01-01', message_type: 'text' },
];

describe('useScheduledMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockMessages[0], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('fetches scheduled messages', async () => {
    const { result } = renderHook(() => useScheduledMessages('c1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.scheduledMessages).toBeDefined();
  });

  it('handles null contactId gracefully', async () => {
    const { result } = renderHook(() => useScheduledMessages(null as any), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
        }),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      }),
    });

    const { result } = renderHook(() => useScheduledMessages('c1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
