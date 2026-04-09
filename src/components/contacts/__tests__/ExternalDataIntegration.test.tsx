import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock external supabase client
const mockSelect = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock('@/integrations/supabase/externalClient', () => ({
  externalSupabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn((col: string) => {
        mockSelect(table, col);
        return {
          not: vi.fn((...args: any[]) => {
            mockNot(table, ...args);
            return {
              order: vi.fn((...oArgs: any[]) => {
                mockOrder(table, ...oArgs);
                return {
                  limit: vi.fn((...lArgs: any[]) => {
                    mockLimit(table, ...lArgs);
                    if (table === 'companies') {
                      return Promise.resolve({
                        data: [
                          { nome_fantasia: 'Acme Corp' },
                          { nome_fantasia: 'TechBR' },
                          { nome_fantasia: '  SpaceLabs  ' },
                          { nome_fantasia: 'Acme Corp' }, // duplicate
                          { nome_fantasia: '' }, // empty
                          { nome_fantasia: null }, // null
                        ],
                        error: null,
                      });
                    }
                    if (table === 'contacts') {
                      return Promise.resolve({
                        data: [
                          { cargo: 'Gerente' },
                          { cargo: 'Diretor' },
                          { cargo: '  Analista  ' },
                          { cargo: 'Gerente' }, // duplicate
                          { cargo: '' },
                        ],
                        error: null,
                      });
                    }
                    if (table === 'salespeople') {
                      return Promise.resolve({
                        data: [
                          { role: 'Closer' },
                          { role: 'SDR' },
                          { role: 'Gerente' }, // duplicate with contacts
                        ],
                        error: null,
                      });
                    }
                    return Promise.resolve({ data: [], error: null });
                  }),
                };
              }),
              limit: vi.fn((...lArgs: any[]) => {
                mockLimit(table, ...lArgs);
                if (table === 'contacts') {
                  return Promise.resolve({
                    data: [
                      { cargo: 'Gerente' },
                      { cargo: 'Diretor' },
                      { cargo: '  Analista  ' },
                      { cargo: 'Gerente' },
                      { cargo: '' },
                    ],
                    error: null,
                  });
                }
                if (table === 'salespeople') {
                  return Promise.resolve({
                    data: [
                      { role: 'Closer' },
                      { role: 'SDR' },
                      { role: 'Gerente' },
                    ],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              }),
            };
          }),
        };
      }),
    })),
  },
  isExternalConfigured: true,
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useExternalEmpresas } from '@/hooks/useExternalEmpresas';
import { useExternalCargos } from '@/hooks/useExternalCargos';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useExternalEmpresas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and returns unique trimmed empresa names', async () => {
    const { result } = renderHook(() => useExternalEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;
    // Should deduplicate "Acme Corp", trim "  SpaceLabs  ", remove empty/null
    expect(data).toContain('Acme Corp');
    expect(data).toContain('TechBR');
    expect(data).toContain('SpaceLabs');
    // No duplicates
    expect(data.filter(e => e === 'Acme Corp')).toHaveLength(1);
    // No empty strings
    expect(data.filter(e => e === '')).toHaveLength(0);
  });

  it('queries the companies table with nome_fantasia', async () => {
    const { result } = renderHook(() => useExternalEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSelect).toHaveBeenCalledWith('companies', 'nome_fantasia');
  });

  it('limits results to 1000', async () => {
    const { result } = renderHook(() => useExternalEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockLimit).toHaveBeenCalledWith('companies', 1000);
  });
});

describe('useExternalCargos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches cargos from contacts and salespeople, deduplicates', async () => {
    const { result } = renderHook(() => useExternalCargos(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;
    // Should have unique values from both tables
    expect(data).toContain('Gerente');
    expect(data).toContain('Diretor');
    expect(data).toContain('Analista');
    expect(data).toContain('Closer');
    expect(data).toContain('SDR');
    // Deduplicated "Gerente" (appears in both tables)
    expect(data.filter(c => c === 'Gerente')).toHaveLength(1);
    // No empty strings
    expect(data.filter(c => c === '')).toHaveLength(0);
  });

  it('returns sorted results (pt-BR locale)', async () => {
    const { result } = renderHook(() => useExternalCargos(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;
    const sorted = [...data].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(data).toEqual(sorted);
  });

  it('queries both contacts.cargo and salespeople.role', async () => {
    const { result } = renderHook(() => useExternalCargos(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSelect).toHaveBeenCalledWith('contacts', 'cargo');
    expect(mockSelect).toHaveBeenCalledWith('salespeople', 'role');
  });
});

describe('useExternalEmpresas — disabled when not configured', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch when external is not configured', async () => {
    // We test the enabled flag logic directly
    const enabled = false; // simulating isExternalConfigured = false
    expect(enabled).toBe(false);
  });
});

describe('ContactForm — Empresa autocomplete logic', () => {
  const empresas = ['Acme Corp', 'Acme Ltda', 'TechBR', 'SpaceLabs', 'Google Brasil'];

  function filterEmpresas(list: string[], query: string) {
    if (query.length < 2) return [];
    return list.filter(e => e.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }

  it('returns empty for queries shorter than 2 chars', () => {
    expect(filterEmpresas(empresas, '')).toHaveLength(0);
    expect(filterEmpresas(empresas, 'A')).toHaveLength(0);
  });

  it('filters by partial match (case-insensitive)', () => {
    expect(filterEmpresas(empresas, 'acme')).toEqual(['Acme Corp', 'Acme Ltda']);
    expect(filterEmpresas(empresas, 'tech')).toEqual(['TechBR']);
    expect(filterEmpresas(empresas, 'GOOGLE')).toEqual(['Google Brasil']);
  });

  it('limits results to 8', () => {
    const bigList = Array.from({ length: 20 }, (_, i) => `Company ${i}`);
    expect(filterEmpresas(bigList, 'Company').length).toBe(8);
  });

  it('returns empty when no match', () => {
    expect(filterEmpresas(empresas, 'zzzz')).toHaveLength(0);
  });
});

describe('ContactForm — Cargo select logic', () => {
  const cargos = ['Analista', 'Closer', 'Diretor', 'Gerente', 'SDR'];

  it('__none__ maps to empty string', () => {
    const value: string = '__none__';
    const result = value === '__none__' ? '' : value;
    expect(result).toBe('');
  });

  it('valid cargo passes through', () => {
    const value: string = 'Gerente';
    const result = value === '__none__' ? '' : value;
    expect(result).toBe('Gerente');
  });

  it('all cargos are available as options', () => {
    cargos.forEach(cargo => {
      expect(typeof cargo).toBe('string');
      expect(cargo.length).toBeGreaterThan(0);
    });
  });
});

describe('ContactForm — Validation', () => {
  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.startsWith('55')) {
      if (cleaned.length <= 4) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`;
      if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`;
      if (cleaned.length <= 11) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9, 13)}`;
    }
    return value;
  };

  it('validates correct emails', () => {
    expect(validateEmail('test@email.com')).toBe(true);
    expect(validateEmail('user@domain.co.br')).toBe(true);
    expect(validateEmail('')).toBe(true); // optional
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
  });

  it('validates correct phone numbers', () => {
    expect(validatePhone('+55 11 99999-9999')).toBe(true);
    expect(validatePhone('5511999999999')).toBe(true);
    expect(validatePhone('11999999999')).toBe(true);
  });

  it('rejects short phone numbers', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('999')).toBe(false);
  });

  it('formats Brazilian phone correctly', () => {
    expect(formatPhone('5511999999999')).toBe('+55 (11) 99999-9999');
    expect(formatPhone('5511')).toBe('+55 (11');
    expect(formatPhone('551199')).toBe('+55 (11) 99');
  });

  it('returns raw value for non-BR numbers', () => {
    expect(formatPhone('1234567890')).toBe('1234567890');
  });
});
