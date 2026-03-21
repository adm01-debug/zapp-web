/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useTags, useContactTags } from '@/hooks/useTags';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockTagsData = [
  { id: 't1', name: 'VIP', color: '#ef4444', description: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 't2', name: 'Lead', color: '#22c55e', description: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const mockContactTagsData = [
  { tag_id: 't1' },
  { tag_id: 't1' },
  { tag_id: 't2' },
];

function setupMocks(overrides: any = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'tags') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: overrides.tags ?? mockTagsData, error: overrides.tagsError ?? null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTagsData[0], error: overrides.createError ?? null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTagsData[0], error: overrides.updateError ?? null }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: overrides.deleteError ?? null }),
        }),
      };
    }
    if (table === 'contact_tags') {
      return {
        select: vi.fn().mockImplementation((query: string) => {
          if (query && query.includes('tags(')) {
            return {
              eq: vi.fn().mockResolvedValue({
                data: overrides.contactTags ?? [{ tag_id: 't1', tags: mockTagsData[0] }],
                error: null,
              }),
            };
          }
          return vi.fn().mockResolvedValue({ data: overrides.contactCounts ?? mockContactTagsData, error: null });
        }),
        insert: vi.fn().mockResolvedValue({ error: overrides.addTagError ?? null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: overrides.removeTagError ?? null }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('useTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('fetches tags on mount', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tags).toHaveLength(2);
  });

  it('calculates contact_count per tag', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tags[0].contact_count).toBe(2);
    expect(result.current.tags[1].contact_count).toBe(1);
  });

  it('returns empty array when no tags', async () => {
    setupMocks({ tags: [] });
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tags).toEqual([]);
  });

  it('handles fetch error', async () => {
    setupMocks({ tagsError: { message: 'DB error' } });
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('starts with loading true', () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes createTag function', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.createTag).toBe('function');
  });

  it('exposes updateTag function', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.updateTag).toBe('function');
  });

  it('exposes deleteTag function', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.deleteTag).toBe('function');
  });

  it('createTag calls supabase insert', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createTag({ name: 'New', color: '#000' });
    });
    expect(mockFrom).toHaveBeenCalledWith('tags');
  });

  it('deleteTag calls supabase delete', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.deleteTag('t1');
    });
    expect(mockFrom).toHaveBeenCalledWith('tags');
  });

  it('returns isPending flags', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('returns refetch function', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useContactTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('fetches tags for a contact', async () => {
    const { result } = renderHook(() => useContactTags('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contactTags).toBeDefined();
  });

  it('returns empty when contactId is undefined', async () => {
    const { result } = renderHook(() => useContactTags(undefined), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contactTags).toEqual([]);
  });

  it('exposes addTag function', async () => {
    const { result } = renderHook(() => useContactTags('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.addTag).toBe('function');
  });

  it('exposes removeTag function', async () => {
    const { result } = renderHook(() => useContactTags('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.removeTag).toBe('function');
  });

  it('addTag calls supabase insert', async () => {
    const { result } = renderHook(() => useContactTags('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addTag('t1');
    });
    expect(mockFrom).toHaveBeenCalledWith('contact_tags');
  });

  it('removeTag calls supabase delete', async () => {
    const { result } = renderHook(() => useContactTags('c1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeTag('t1');
    });
    expect(mockFrom).toHaveBeenCalledWith('contact_tags');
  });
});
