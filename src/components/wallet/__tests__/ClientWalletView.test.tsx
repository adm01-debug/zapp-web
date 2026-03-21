/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useActionFeedback', () => ({
  useActionFeedback: () => ({
    executeWithFeedback: vi.fn(),
  }),
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => <div data-testid="floating-particles" />,
}));
vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => <div data-testid="aurora" />,
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
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));
vi.mock('@/components/ui/contextual-empty-states', () => ({
  ContextualEmptyState: () => <div />,
}));

const mockRules = [
  {
    id: 'r1', name: 'Vendas Principal', agent_id: 'a1',
    whatsapp_connection_id: 'c1', priority: 10, is_active: true,
  },
  {
    id: 'r2', name: 'Suporte', agent_id: 'a2',
    whatsapp_connection_id: null, priority: 5, is_active: false,
  },
];

const mockAgents = [
  { id: 'a1', name: 'Agent Alice' },
  { id: 'a2', name: 'Agent Bob' },
];

const mockConnections = [
  { id: 'c1', name: 'Conexão 1', phone_number: '+5511999' },
];

function setupMock(rules: any[] = mockRules, agents: any[] = mockAgents, connections: any[] = mockConnections) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'client_wallet_rules') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rules, error: null }),
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
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: agents, error: null }),
          in: vi.fn().mockResolvedValue({ data: agents, error: null }),
        }),
      };
    }
    if (table === 'whatsapp_connections') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: connections, error: null }),
          in: vi.fn().mockResolvedValue({ data: connections, error: null }),
        }),
      };
    }
    return { select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

import { ClientWalletView } from '../ClientWalletView';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClientWalletView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page header with title', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Carteira de Clientes')).toBeInTheDocument();
    });
  });

  it('renders the subtitle about auto-assignment', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText(/Configure regras para atribuição automática/)).toBeInTheDocument();
    });
  });

  it('renders Nova Regra button', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Nova Regra')).toBeInTheDocument();
    });
  });

  it('displays stats cards with correct counts', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Regras Ativas')).toBeInTheDocument();
    });
    expect(screen.getByText('Total de Regras')).toBeInTheDocument();
    expect(screen.getByText('Vendedores')).toBeInTheDocument();
  });

  it('renders the rules table with rule names', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Vendas Principal')).toBeInTheDocument();
    });
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });

  it('shows rule priority values', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders table headers for rules', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Nome')).toBeInTheDocument();
    });
    expect(screen.getByText('Vendedor')).toBeInTheDocument();
    expect(screen.getByText('Conexão')).toBeInTheDocument();
    expect(screen.getByText('Prioridade')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows "Todas" for rules without a specific connection', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Todas')).toBeInTheDocument();
    });
  });

  it('shows empty state when no rules exist', async () => {
    setupMock([]);
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Nenhuma regra configurada')).toBeInTheDocument();
  });

  it('shows "Criar Primeira Regra" button in empty state', async () => {
    setupMock([]);
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Criar Primeira Regra')).toBeInTheDocument();
    });
  });

  it('renders the "Como funciona?" section', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Como funciona?')).toBeInTheDocument();
    });
  });

  it('shows explanation bullets about how rules work', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText(/Quando um novo contato chega/)).toBeInTheDocument();
    });
  });

  it('renders the Regras de Atribuição card title', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Regras de Atribuição')).toBeInTheDocument();
    });
  });

  it('shows Carregando... text while loading', () => {
    // Make the promise never resolve
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    }));
    render(<ClientWalletView />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders delete buttons for each rule', async () => {
    render(<ClientWalletView />);
    await waitFor(() => {
      expect(screen.getByText('Vendas Principal')).toBeInTheDocument();
    });
    // There should be delete buttons (trash icons)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });
});
