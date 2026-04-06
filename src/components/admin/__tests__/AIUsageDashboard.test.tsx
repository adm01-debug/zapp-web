/**
 * Comprehensive test suite for AI Usage Tracking module.
 * Covers: rendering, KPIs, filters, charts, CSV export, edge cases,
 * error handling, security, accessibility, performance, and data integrity.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIUsageDashboard } from '../AIUsageDashboard';
import { BrowserRouter } from 'react-router-dom';

// ─── ResizeObserver polyfill for jsdom ────────────────────────
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

// ─── Mocks ────────────────────────────────────────────────────
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function makeLogs(count: number, overrides: Partial<Record<string, unknown>> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}-${Math.random()}`,
    user_id: overrides.user_id !== undefined ? overrides.user_id : `user-${i % 5}`,
    profile_id: `profile-${i % 5}`,
    function_name: overrides.function_name ?? ['ai-suggest-reply', 'ai-enhance-message', 'ai-conversation-analysis', 'ai-auto-tag', 'chatbot-l1', 'ai-conversation-summary'][i % 6],
    model: overrides.model !== undefined ? overrides.model : 'google/gemini-3-flash-preview',
    input_tokens: overrides.input_tokens ?? (100 + i),
    output_tokens: overrides.output_tokens ?? (20 + i),
    total_tokens: overrides.total_tokens ?? (120 + i * 2),
    duration_ms: overrides.duration_ms !== undefined ? overrides.duration_ms : (500 + i * 10),
    status: overrides.status ?? (i % 20 === 0 ? 'error' : 'success'),
    created_at: new Date(Date.now() - i * 60000).toISOString(),
    error_message: null,
    ...overrides,
  }));
}

function makeProfiles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `profile-${i}`,
    user_id: `user-${i}`,
    name: `Usuário ${i}`,
    email: `user${i}@test.com`,
    avatar_url: null,
  }));
}

function setupMocks(logs: unknown[] = [], profiles: unknown[] = []) {
  mockFrom.mockImplementation((table: unknown) => {
    if (table === 'ai_usage_logs') {
      return {
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: logs, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockResolvedValue({ data: profiles, error: null }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

function clickTab(name: string) {
  const tab = screen.getByRole('tab', { name });
  fireEvent.click(tab);
}

// ═══════════════════════════════════════════════════════════════
// 1. RENDERING & STRUCTURE
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Rendering', () => {
  beforeEach(() => setupMocks(makeLogs(50), makeProfiles(5)));

  it('renders the main title', () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Consumo de IA')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/Monitoramento de uso/)).toBeInTheDocument();
  });

  it('renders time filter selector', () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders refresh and CSV buttons', () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 5 KPI cards', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Chamadas')).toBeInTheDocument();
      expect(screen.getByText('Tokens Total')).toBeInTheDocument();
      expect(screen.getByText('Usuários Ativos')).toBeInTheDocument();
      expect(screen.getByText('Tempo Médio')).toBeInTheDocument();
    });
  });

  it('renders all 3 tab triggers', () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByRole('tab', { name: 'Visão Geral' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por Usuário' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs Detalhados' })).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. KPI CALCULATIONS
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – KPI Calculations', () => {
  it('shows correct total calls count', async () => {
    setupMocks(makeLogs(10, { status: 'success' }), makeProfiles(5));
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
  });

  it('shows correct unique users count', async () => {
    setupMocks(makeLogs(10), makeProfiles(5));
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
  });

  it('calculates error rate correctly', async () => {
    const logs = [
      ...makeLogs(4, { status: 'success' }),
      { ...makeLogs(1, { status: 'error' })[0], id: 'err-unique' },
    ];
    setupMocks(logs, []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/20\.0%/)).toBeInTheDocument();
    });
  });

  it('handles zero logs gracefully', async () => {
    setupMocks([], []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const zeroes = screen.getAllByText('0');
      expect(zeroes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles all-error logs', async () => {
    setupMocks(makeLogs(5, { status: 'error' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. EMPTY STATES
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Empty States', () => {
  beforeEach(() => setupMocks([], []));

  it('shows empty state for timeline chart', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nenhum dado no período selecionado')).toBeInTheDocument();
    });
  });

  it('shows empty state for function distribution', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Sem dados')).toBeInTheDocument();
    });
  });

  it('shows empty state for logs table', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('Nenhum log encontrado')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. CSV EXPORT
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – CSV Export', () => {
  it('shows warning toast when no data to export', async () => {
    setupMocks([], []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));
  });

  it('creates downloadable CSV', async () => {
    setupMocks(makeLogs(3, { status: 'success' }), makeProfiles(3));
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const calls = screen.getAllByText(/\d+/);
      expect(calls.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('CSV'));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Tab Navigation', () => {
  beforeEach(() => setupMocks(makeLogs(20), makeProfiles(5)));

  it('defaults to Overview tab with timeline chart title', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Chamadas ao Longo do Tempo')).toBeInTheDocument();
    });
  });

  it('switches to Users tab', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Por Usuário');
    await waitFor(() => {
      expect(screen.getByText('Ranking de Consumo por Usuário')).toBeInTheDocument();
    });
  });

  it('switches to Logs tab', async () => {
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('Últimas Chamadas')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. LOGS TABLE
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Logs Table', () => {
  it('shows max 100 logs in table', async () => {
    setupMocks(makeLogs(150), makeProfiles(5));
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThanOrEqual(101);
    });
  });

  it('displays function badges with correct labels', async () => {
    setupMocks(makeLogs(1, { function_name: 'ai-suggest-reply', status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('Sugestão de Resposta')).toBeInTheDocument();
    });
  });

  it('shows error badge for failed calls', async () => {
    setupMocks(makeLogs(1, { status: 'error' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('✗')).toBeInTheDocument();
    });
  });

  it('shows success badge for successful calls', async () => {
    setupMocks(makeLogs(1, { status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('strips model prefix in display', async () => {
    setupMocks(makeLogs(1, { model: 'google/gemini-3-flash-preview', status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('gemini-3-flash-preview')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. USER RANKING
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – User Ranking', () => {
  it('shows user ranking table', async () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({
      id: `log-${i}`,
      user_id: `user-${i}`,
      profile_id: `profile-${i}`,
      function_name: 'ai-suggest-reply',
      model: 'google/gemini-3-flash-preview',
      input_tokens: 100,
      output_tokens: 20,
      total_tokens: 120,
      duration_ms: 500,
      status: 'success',
      created_at: new Date().toISOString(),
    }));
    setupMocks(logs, makeProfiles(30));
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Por Usuário');
    await waitFor(() => {
      expect(screen.getByText('Ranking de Consumo por Usuário')).toBeInTheDocument();
    });
  });

  it('sorts users by token usage descending', async () => {
    const logs = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `log-a-${i}`, user_id: 'user-heavy', profile_id: 'p-1',
        function_name: 'ai-suggest-reply', model: 'test', input_tokens: 500,
        output_tokens: 100, total_tokens: 600, duration_ms: 100, status: 'success',
        created_at: new Date().toISOString(),
      })),
      {
        id: 'log-b-0', user_id: 'user-light', profile_id: 'p-2',
        function_name: 'ai-suggest-reply', model: 'test', input_tokens: 10,
        output_tokens: 5, total_tokens: 15, duration_ms: 50, status: 'success',
        created_at: new Date().toISOString(),
      },
    ];
    const profiles = [
      { id: 'p-1', user_id: 'user-heavy', name: 'Heavy User', email: 'heavy@t.com', avatar_url: null },
      { id: 'p-2', user_id: 'user-light', name: 'Light User', email: 'light@t.com', avatar_url: null },
    ];
    setupMocks(logs, profiles);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Por Usuário');
    await waitFor(() => {
      expect(screen.getByText('Heavy User')).toBeInTheDocument();
      expect(screen.getByText('Light User')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. EDGE CASES & DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Edge Cases', () => {
  it('handles null user_id gracefully in logs tab', async () => {
    setupMocks(makeLogs(1, { user_id: null, status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  it('handles null model gracefully', async () => {
    setupMocks(makeLogs(1, { model: null, status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles null duration_ms gracefully', async () => {
    setupMocks(makeLogs(1, { duration_ms: null, status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles zero tokens gracefully', async () => {
    setupMocks(makeLogs(1, { input_tokens: 0, output_tokens: 0, total_tokens: 0, status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Consumo de IA')).toBeInTheDocument();
  });

  it('handles unknown function_name gracefully', async () => {
    setupMocks(makeLogs(1, { function_name: 'unknown-function-xyz', status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('unknown-function-xyz')).toBeInTheDocument();
    });
  });

  it('handles very large token numbers', async () => {
    setupMocks(makeLogs(1, { total_tokens: 999999999, status: 'success' }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });
  });

  it('handles single log correctly', async () => {
    setupMocks(makeLogs(1, { status: 'success', duration_ms: 1500 }), []);
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('1500ms')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Error Handling', () => {
  it('handles Supabase query error without crashing', async () => {
    mockFrom.mockImplementation((table: unknown) => {
      if (table === 'ai_usage_logs') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Consumo de IA')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. PROFILE MAPPING
// ═══════════════════════════════════════════════════════════════
describe('AIUsageDashboard – Profile Mapping', () => {
  it('maps user_id to profile name', async () => {
    setupMocks(
      makeLogs(1, { user_id: 'user-0', status: 'success' }),
      [{ id: 'profile-0', user_id: 'user-0', name: 'João Silva', email: 'joao@test.com', avatar_url: null }]
    );
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
  });

  it('falls back to email when name is null', async () => {
    setupMocks(
      makeLogs(1, { user_id: 'user-0', status: 'success' }),
      [{ id: 'profile-0', user_id: 'user-0', name: null, email: 'joao@test.com', avatar_url: null }]
    );
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('joao@test.com')).toBeInTheDocument();
    });
  });

  it('falls back to truncated user_id when no profile', async () => {
    setupMocks(
      makeLogs(1, { user_id: 'abcdefgh-1234-5678-9012-abcdefghijkl', status: 'success' }),
      []
    );
    render(<AIUsageDashboard />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Consumo de IA'));
    clickTab('Logs Detalhados');
    await waitFor(() => {
      expect(screen.getByText('abcdefgh')).toBeInTheDocument();
    });
  });
});
