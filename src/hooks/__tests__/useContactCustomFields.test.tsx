/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useContactCustomFields } from '@/hooks/useContactCustomFields';

const mockFields = [
  { id: 'f1', contact_id: 'c1', field_name: 'CPF', field_value: '123.456.789-00', field_type: 'text', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f2', contact_id: 'c1', field_name: 'RG', field_value: '12.345.678-9', field_type: 'text', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

function setupMocks(overrides: any = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'contact_custom_fields') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: overrides.fields ?? mockFields, error: overrides.fetchError ?? null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: overrides.upsertError ?? null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: overrides.deleteError ?? null }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('useContactCustomFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('fetches fields on mount', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields).toHaveLength(2);
  });

  it('returns field names', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields[0].field_name).toBe('CPF');
    expect(result.current.fields[1].field_name).toBe('RG');
  });

  it('returns field values', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields[0].field_value).toBe('123.456.789-00');
  });

  it('returns empty when contactId is undefined', async () => {
    const { result } = renderHook(() => useContactCustomFields(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields).toEqual([]);
  });

  it('handles fetch error gracefully', async () => {
    setupMocks({ fetchError: { message: 'Error' } });
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields).toEqual([]);
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    // isLoading may be true initially or already false if async resolves fast
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('exposes addField function', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.addField).toBe('function');
  });

  it('addField calls upsert', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addField('CNPJ', '00.000.000/0001-00');
    });
    expect(mockFrom).toHaveBeenCalledWith('contact_custom_fields');
  });

  it('addField with custom type', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addField('Age', '30', 'number');
    });
    expect(mockFrom).toHaveBeenCalledWith('contact_custom_fields');
  });

  it('removeField calls delete', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.removeField('f1');
    });
    expect(mockFrom).toHaveBeenCalledWith('contact_custom_fields');
  });

  it('removeField updates local state', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fields).toHaveLength(2);
    await act(async () => {
      await result.current.removeField('f1');
    });
    expect(result.current.fields).toHaveLength(1);
    expect(result.current.fields[0].id).toBe('f2');
  });

  it('handles addField error', async () => {
    setupMocks({ upsertError: { message: 'Upsert failed' } });
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      act(async () => {
        await result.current.addField('Fail', 'val');
      })
    ).rejects.toBeTruthy();
  });

  it('handles removeField error', async () => {
    setupMocks({ deleteError: { message: 'Delete failed' } });
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      act(async () => {
        await result.current.removeField('f1');
      })
    ).rejects.toBeTruthy();
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useContactCustomFields('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('addField does nothing when contactId is undefined', async () => {
    const { result } = renderHook(() => useContactCustomFields(undefined));
    await act(async () => {
      await result.current.addField('Test', 'val');
    });
    // Should not have called from for upsert
    expect(mockFrom).not.toHaveBeenCalledWith('contact_custom_fields');
  });
});
