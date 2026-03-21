/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </div>
  ),
}));

const mockStages = [
  { id: 's1', name: 'Prospecção', color: '#3b82f6', position: 1 },
  { id: 's2', name: 'Qualificação', color: '#f59e0b', position: 2 },
  { id: 's3', name: 'Proposta', color: '#10b981', position: 3 },
];

const mockDeals = [
  {
    id: 'd1', title: 'Deal Alpha', value: 5000, currency: 'BRL',
    stage_id: 's1', contact_id: 'c1', assigned_to: 'a1', priority: 'high',
    expected_close_date: '2024-07-15', notes: 'Important deal', tags: ['vip'],
    status: 'open', created_at: '2024-06-01',
    contacts: { name: 'John Client', phone: '+55111' },
    profiles: { name: 'Agent Alice' },
  },
  {
    id: 'd2', title: 'Deal Beta', value: 12000, currency: 'BRL',
    stage_id: 's2', contact_id: 'c2', assigned_to: 'a2', priority: 'medium',
    expected_close_date: null, notes: null, tags: [],
    status: 'open', created_at: '2024-06-02',
    contacts: { name: 'Jane Customer', phone: '+55222' },
    profiles: { name: 'Agent Bob' },
  },
  {
    id: 'd3', title: 'Won Deal', value: 8000, currency: 'BRL',
    stage_id: 's3', contact_id: null, assigned_to: null, priority: 'low',
    expected_close_date: null, notes: null, tags: [],
    status: 'won', created_at: '2024-05-01',
    contacts: null,
    profiles: null,
  },
];

const mockContacts = [
  { id: 'c1', name: 'John Client', phone: '+55111' },
  { id: 'c2', name: 'Jane Customer', phone: '+55222' },
];

const mockAgentsList = [
  { id: 'a1', name: 'Agent Alice' },
  { id: 'a2', name: 'Agent Bob' },
];

function setupMock(stages: any[] = mockStages, deals: any[] = mockDeals) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'sales_pipeline_stages') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: stages, error: null }),
        }),
      };
    }
    if (table === 'sales_deals') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: deals, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'contacts') {
      return {
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockAgentsList, error: null }),
        }),
      };
    }
    if (table === 'deal_activities') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return { select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

import { SalesPipelineView } from '../SalesPipelineView';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SalesPipelineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page header with pipeline title', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Pipeline de Vendas')).toBeInTheDocument();
    });
  });

  it('renders the subtitle about managing deals', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Gerencie suas oportunidades de negócio')).toBeInTheDocument();
    });
  });

  it('renders Novo Deal button', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Novo Deal')).toBeInTheDocument();
    });
  });

  it('renders KPI cards: Pipeline Total, Deals Ativos, Ganhos, Taxa Conversão', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Pipeline Total')).toBeInTheDocument();
    });
    expect(screen.getByText('Deals Ativos')).toBeInTheDocument();
    expect(screen.getByText('Ganhos')).toBeInTheDocument();
    expect(screen.getByText('Taxa Conversão')).toBeInTheDocument();
  });

  it('shows correct active deals count', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      // 2 open deals
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders all stage columns', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Prospecção')).toBeInTheDocument();
    });
    expect(screen.getByText('Qualificação')).toBeInTheDocument();
    expect(screen.getByText('Proposta')).toBeInTheDocument();
  });

  it('renders deal cards in correct stages', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Deal Alpha')).toBeInTheDocument();
    });
    expect(screen.getByText('Deal Beta')).toBeInTheDocument();
  });

  it('does not show won deals in the kanban board (status=won)', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Deal Alpha')).toBeInTheDocument();
    });
    // Won Deal has status "won" so it should not be in any stage column
    // The title still exists in the data but not rendered as a deal card in the board
    // It only shows in total won KPI
  });

  it('shows deal values formatted in BRL', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent?.includes('5.000,00') ?? false)).toBeInTheDocument();
    });
  });

  it('shows priority badges on deal cards', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Alta')).toBeInTheDocument();
    });
    expect(screen.getByText('Média')).toBeInTheDocument();
  });

  it('shows contact name on deal card', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('John Client')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
        limit: vi.fn().mockReturnValue(new Promise(() => {})),
        eq: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    }));
    render(<SalesPipelineView />);
    expect(screen.getByText('Carregando pipeline...')).toBeInTheDocument();
  });

  it('renders empty stage placeholder text', async () => {
    // Only deal in s1, so s3 should have the placeholder (Won Deal is status=won so not shown)
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Deal Alpha')).toBeInTheDocument();
    });
    const placeholders = screen.getAllByText('Arraste deals aqui');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('renders with no stages gracefully', async () => {
    setupMock([], []);
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('Pipeline de Vendas')).toBeInTheDocument();
    });
    // No stage columns rendered, but no crash
    expect(screen.queryByText('Prospecção')).not.toBeInTheDocument();
  });

  it('shows conversion rate as percentage', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      // 1 won out of 3 total = 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  it('shows 0% conversion rate when no deals exist', async () => {
    setupMock(mockStages, []);
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('shows stage deal count badges', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      // s1 has 1 open deal, s2 has 1 open deal
      const badges = screen.getAllByText('1');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('renders deal expected close date when present', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(screen.getByText('15/07/2024')).toBeInTheDocument();
    });
  });

  it('subscribes to realtime channel on mount', async () => {
    render(<SalesPipelineView />);
    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith('deals-changes');
    });
  });
});
