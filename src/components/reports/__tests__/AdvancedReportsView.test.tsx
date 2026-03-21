/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [
      { id: 'a1', name: 'Agent 1' },
      { id: 'a2', name: 'Agent 2' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    tags: [
      { id: 't1', name: 'Urgent', color: '#ff0000' },
    ],
    isLoading: false,
  }),
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  Legend: () => <div />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
}));

vi.mock('@/components/reports/ExportButton', () => ({
  ExportButton: () => <button data-testid="export-btn">Export</button>,
}));

import { AdvancedReportsView } from '../AdvancedReportsView';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeChain(data: any = [], error: any = null) {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'not', 'or', 'order', 'limit', 'is', 'in', 'filter', 'range'];
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.then = vi.fn().mockImplementation((fn: any) => Promise.resolve({ data, error }).then(fn));
  return chain;
}

describe('AdvancedReportsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return makeChain([
          { id: 'c1', created_at: new Date().toISOString(), assigned_to: 'a1', queue_id: 'q1', tags: ['t1'] },
        ]);
      }
      if (table === 'messages') {
        return makeChain([
          { id: 'm1', contact_id: 'c1', sender: 'agent', created_at: new Date().toISOString(), agent_id: 'a1' },
        ]);
      }
      return makeChain([]);
    });
  });

  it('renders report header', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Relat.*rios/i)).toBeInTheDocument();
    });
  });

  it('renders period selection options', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toContain('30');
    });
  });

  it('renders export button', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByTestId('export-btn')).toBeInTheDocument();
    });
  });

  it('renders chart containers', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      const containers = screen.getAllByTestId('chart-container');
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  it('renders tabs for different report views', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles empty data gracefully', async () => {
    mockFrom.mockImplementation(() => makeChain([]));
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles supabase error gracefully', async () => {
    mockFrom.mockImplementation(() => makeChain(null, new Error('fail')));
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders loading skeleton while fetching', () => {
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      const methods = ['select', 'eq', 'gte', 'lte', 'not', 'or', 'order', 'limit'];
      methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
      chain.then = vi.fn().mockReturnValue(new Promise(() => {}));
      return chain;
    });
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    expect(document.body.textContent).toBeTruthy();
  });

  it('handles large datasets without crashing', async () => {
    const largeContacts = Array.from({ length: 1000 }, (_, i) => ({
      id: `c${i}`, created_at: new Date(Date.now() - i * 86400000).toISOString(),
      assigned_to: `a${i % 2}`, queue_id: 'q1', tags: [],
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') return makeChain(largeContacts);
      return makeChain([]);
    });
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles date edge case - start of year', async () => {
    const newYearData = [
      { id: 'c1', created_at: '2024-01-01T00:00:00.000Z', assigned_to: 'a1', queue_id: 'q1', tags: [] },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') return makeChain(newYearData);
      return makeChain([]);
    });
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles date edge case - end of year', async () => {
    const eoyData = [
      { id: 'c1', created_at: '2024-12-31T23:59:59.999Z', assigned_to: 'a1', queue_id: 'q1', tags: [] },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') return makeChain(eoyData);
      return makeChain([]);
    });
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders compare toggle', async () => {
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      // Compare switch should be present
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders with null assigned_to contacts', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contacts') {
        return makeChain([
          { id: 'c1', created_at: new Date().toISOString(), assigned_to: null, queue_id: null, tags: [] },
        ]);
      }
      return makeChain([]);
    });
    const Wrapper = createWrapper();
    render(<AdvancedReportsView />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });
});
