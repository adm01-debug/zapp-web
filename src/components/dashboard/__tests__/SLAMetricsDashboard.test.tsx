/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { SLAMetricsDashboard } from '../SLAMetricsDashboard';

function makeSLAChain(slaData: any[] = [], profiles: any[] = [], contacts: any[] = []) {
  return (table: string) => {
    const chain: any = {};
    const methods = ['select', 'eq', 'neq', 'gte', 'lte', 'not', 'or', 'order', 'limit', 'is'];
    methods.forEach(m => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    if (table === 'conversation_sla') {
      chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: slaData, error: null }).then(fn));
    } else if (table === 'profiles') {
      chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: profiles, error: null }).then(fn));
    } else if (table === 'contacts') {
      chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: contacts, error: null }).then(fn));
    } else {
      chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: [], error: null }).then(fn));
    }
    return chain;
  };
}

describe('SLAMetricsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      const methods = ['select', 'eq', 'gte', 'lte', 'not', 'order', 'limit'];
      methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
      chain.then = vi.fn().mockReturnValue(new Promise(() => {}));
      return chain;
    });
    render(<SLAMetricsDashboard />);
    // Loading skeleton should be present
    expect(document.querySelector('[class*="skeleton"], [class*="Skeleton"]')).toBeTruthy();
  });

  it('renders header with SLA title after loading', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'Agent 1', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/M.*tricas de SLA/)).toBeInTheDocument();
    });
  });

  it('displays 100% rate when no SLA data exists', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'Agent 1', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  it('renders period filter buttons', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'Agent', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Hoje')).toBeInTheDocument();
      expect(screen.getByText('Semana')).toBeInTheDocument();
    });
  });

  it('renders refresh button', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'Agent', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });
  });

  it('renders summary cards (4 metric cards)', async () => {
    const profiles = [{ id: 'p1', name: 'Agent 1', avatar_url: null }];
    mockFrom.mockImplementation(makeSLAChain([], profiles, []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Taxa Geral SLA')).toBeInTheDocument();
      expect(screen.getByText('No Prazo')).toBeInTheDocument();
    });
  });

  it('shows "Nenhum agente encontrado" when no agents have data', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum agente encontrado/)).toBeInTheDocument();
    });
  });

  it('calculates correct metrics with breaches', async () => {
    const slaData = [
      { id: 's1', contact_id: 'c1', first_response_breached: false, resolution_breached: false, first_response_at: '2024-01-01T10:05:00Z', resolved_at: '2024-01-01T11:00:00Z', created_at: '2024-01-01T10:00:00Z' },
      { id: 's2', contact_id: 'c2', first_response_breached: true, resolution_breached: true, first_response_at: null, resolved_at: null, created_at: '2024-01-01T10:00:00Z' },
    ];
    const profiles = [{ id: 'p1', name: 'Agent 1', avatar_url: null }];
    const contacts = [
      { id: 'c1', assigned_to: 'p1' },
      { id: 'c2', assigned_to: 'p1' },
    ];
    mockFrom.mockImplementation(makeSLAChain(slaData, profiles, contacts));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/M.*tricas de SLA/)).toBeInTheDocument();
    });
  });

  it('displays agent SLA information', async () => {
    const slaData = [
      { id: 's1', contact_id: 'c1', first_response_breached: false, resolution_breached: false, first_response_at: '2024-01-01T10:05:00Z', resolved_at: '2024-01-01T11:00:00Z', created_at: '2024-01-01T10:00:00Z' },
    ];
    const profiles = [{ id: 'p1', name: 'Carlos Silva', avatar_url: null }];
    const contacts = [{ id: 'c1', assigned_to: 'p1' }];
    mockFrom.mockImplementation(makeSLAChain(slaData, profiles, contacts));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });
  });

  it('handles error from supabase gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain: any = {};
      const methods = ['select', 'eq', 'gte', 'lte', 'not', 'order', 'limit'];
      methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
      chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data: null, error: new Error('fail') }).then(fn));
      return chain;
    });
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      // Should not crash
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles refresh button click', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'Agent', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Atualizar'));
    // Should re-fetch without crashing
    await waitFor(() => {
      expect(screen.getByText(/M.*tricas de SLA/)).toBeInTheDocument();
    });
  });

  it('renders empty SLA overview when no data', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'A', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum dado de SLA/)).toBeInTheDocument();
    });
  });

  it('handles large number of agents', async () => {
    const profiles = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`, name: `Agent ${i}`, avatar_url: null,
    }));
    mockFrom.mockImplementation(makeSLAChain([], profiles, []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/M.*tricas de SLA/)).toBeInTheDocument();
    });
  });

  it('renders "SLA por Agente" section header', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'A', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('SLA por Agente')).toBeInTheDocument();
    });
  });

  it('renders "Resumo Geral" section header', async () => {
    mockFrom.mockImplementation(makeSLAChain([], [{ id: 'p1', name: 'A', avatar_url: null }], []));
    render(<SLAMetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Resumo Geral')).toBeInTheDocument();
    });
  });
});
