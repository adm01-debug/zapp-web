import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useSavedFilters } from '@/hooks/useSavedFilters';

describe('useSavedFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useSavedFilters('test-key'));
    expect(result.current.filters).toEqual([]);
  });

  it('saves a filter', () => {
    const { result } = renderHook(() => useSavedFilters('test-key'));

    act(() => {
      result.current.saveFilter({ name: 'My Filter', values: { status: 'open' } });
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].name).toBe('My Filter');
  });

  it('removes a filter', () => {
    const { result } = renderHook(() => useSavedFilters('test-key'));

    act(() => {
      result.current.saveFilter({ name: 'Filter1', values: { status: 'open' } });
    });

    const filterId = result.current.filters[0].id;

    act(() => {
      result.current.removeFilter(filterId);
    });

    expect(result.current.filters).toHaveLength(0);
  });

  it('persists filters to localStorage', () => {
    const { result } = renderHook(() => useSavedFilters('persist-test'));

    act(() => {
      result.current.saveFilter({ name: 'Persisted', values: { type: 'vip' } });
    });

    const stored = localStorage.getItem('persist-test');
    expect(stored).toBeTruthy();
  });

  it('loads filters from localStorage on mount', () => {
    localStorage.setItem('load-test', JSON.stringify([
      { id: 'f1', name: 'Loaded', values: { status: 'closed' } },
    ]));

    const { result } = renderHook(() => useSavedFilters('load-test'));
    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].name).toBe('Loaded');
  });

  it('handles invalid localStorage data', () => {
    localStorage.setItem('bad-data', 'not-json');
    const { result } = renderHook(() => useSavedFilters('bad-data'));
    expect(result.current.filters).toEqual([]);
  });
});
