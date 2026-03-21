/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFields = [
  { id: 'f1', contact_id: 'c1', field_name: 'Company', field_value: 'Acme', field_type: 'text', created_at: '', updated_at: '' },
  { id: 'f2', contact_id: 'c1', field_name: 'Role', field_value: 'Dev', field_type: 'text', created_at: '', updated_at: '' },
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

import { useContactCustomFields } from '@/hooks/useContactCustomFields';

describe('useContactCustomFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockFields, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));
  });

  it('fetches fields when contactId is provided', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fields).toHaveLength(2);
    expect(result.current.fields[0].field_name).toBe('Company');
  });

  it('does not fetch when contactId is undefined', () => {
    const { result } = renderHook(() => useContactCustomFields(undefined));
    expect(result.current.fields).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes addField function', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.addField).toBe('function');
  });

  it('exposes removeField function', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.removeField).toBe('function');
  });

  it('removeField removes field from local state', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));

    await waitFor(() => {
      expect(result.current.fields).toHaveLength(2);
    });

    await act(async () => {
      await result.current.removeField('f1');
    });

    expect(result.current.fields).toHaveLength(1);
    expect(result.current.fields[0].id).toBe('f2');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
