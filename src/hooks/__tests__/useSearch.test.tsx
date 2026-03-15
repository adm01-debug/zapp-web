import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useSearch } from '@/hooks/useSearch';

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        or: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        textSearch: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty results', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('does not search with empty query', () => {
    const { result } = renderHook(() => useSearch());
    
    act(() => {
      result.current.setQuery('');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.results).toEqual([]);
  });

  it('handles search query', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');
  });
});
