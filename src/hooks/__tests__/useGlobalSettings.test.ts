/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockSettings = [
  { id: 's1', key: 'site_name', value: 'Zapp', description: 'Site name', updated_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 's2', key: 'max_agents', value: '10', description: 'Max agents', updated_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useGlobalSettings } from '@/hooks/useGlobalSettings';

describe('useGlobalSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 's3', key: 'new_key', value: 'new_val' }, error: null }),
        }),
      }),
    }));
  });

  it('fetches settings on mount', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toHaveLength(2);
    expect(result.current.settings[0].key).toBe('site_name');
  });

  it('returns empty array when fetch fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      }),
    }));

    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual([]);
  });

  it('getSetting returns value for existing key', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getSetting('site_name')).toBe('Zapp');
    expect(result.current.getSetting('max_agents')).toBe('10');
  });

  it('getSetting returns null for non-existent key', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getSetting('nonexistent')).toBeNull();
  });

  it('updateSetting updates local state optimistically', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSetting('site_name', 'NewName');
    });

    expect(result.current.getSetting('site_name')).toBe('NewName');
  });

  it('updateSetting throws when supabase returns error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'global_settings') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.updateSetting('site_name', 'fail');
      })
    ).rejects.toBeDefined();
  });

  it('exposes addSetting function', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.addSetting).toBe('function');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useGlobalSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
