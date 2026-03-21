/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: any[]) => mockFrom(...a),
  },
}));

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast: toastFn };
});

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  createLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useActionFeedback', () => ({
  useActionFeedback: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    withFeedback: vi.fn(async (action: () => Promise<any>, opts?: any) => {
      try {
        const result = await action();
        opts?.onSuccess?.(result);
        return result;
      } catch (err) {
        return undefined;
      }
    }),
    dismissAll: vi.fn(),
    showFeedback: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/groups' }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));

import { toast } from 'sonner';
import { GroupsView } from '../GroupsView';

const sampleGroups = [
  {
    id: 'g1', whatsapp_connection_id: 'conn1', group_id: '5511999@g.us',
    name: 'Equipe Vendas', description: 'Grupo de vendas', participant_count: 25,
    avatar_url: null, is_admin: true, created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'g2', whatsapp_connection_id: null, group_id: '5511888@g.us',
    name: 'Suporte Técnico', description: null, participant_count: 10,
    avatar_url: null, is_admin: false, created_at: '2025-02-01T00:00:00Z',
  },
];

const sampleConnections = [
  { id: 'conn1', name: 'Conexão Principal', phone_number: '+5511999999999' },
];

function setupMock(groups = sampleGroups, connections = sampleConnections) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'whatsapp_groups') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: groups, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'whatsapp_connections') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: connections, error: null }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('GroupsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page title', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Grupos WhatsApp')).toBeInTheDocument();
  });

  it('shows group count in subtitle', async () => {
    render(<GroupsView />);
    expect(await screen.findByText(/2 grupos/)).toBeInTheDocument();
  });

  it('displays all groups', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Equipe Vendas')).toBeInTheDocument();
    expect(screen.getByText('Suporte Técnico')).toBeInTheDocument();
  });

  it('shows participant count', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('25 participantes')).toBeInTheDocument();
    expect(screen.getByText('10 participantes')).toBeInTheDocument();
  });

  it('shows group descriptions', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Grupo de vendas')).toBeInTheDocument();
  });

  it('shows group IDs', async () => {
    render(<GroupsView />);
    expect(await screen.findByText(/5511999@g.us/)).toBeInTheDocument();
  });

  it('shows admin badge for admin groups', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });

  it('shows connection name for linked groups', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Conexão Principal')).toBeInTheDocument();
  });

  it('shows Não vinculado for unlinked groups', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Não vinculado')).toBeInTheDocument();
  });

  it('filters groups by search', async () => {
    render(<GroupsView />);
    await screen.findByText('Equipe Vendas');

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou ID do grupo...');
    await userEvent.type(searchInput, 'Suporte');

    expect(screen.queryByText('Equipe Vendas')).not.toBeInTheDocument();
    expect(screen.getByText('Suporte Técnico')).toBeInTheDocument();
  });

  it('filters groups by group ID', async () => {
    render(<GroupsView />);
    await screen.findByText('Equipe Vendas');

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou ID do grupo...');
    await userEvent.type(searchInput, '5511888');

    expect(screen.queryByText('Equipe Vendas')).not.toBeInTheDocument();
    expect(screen.getByText('Suporte Técnico')).toBeInTheDocument();
  });

  it('shows empty state when no groups', async () => {
    setupMock([]);
    render(<GroupsView />);
    expect(await screen.findByText('Nenhum grupo cadastrado')).toBeInTheDocument();
  });

  it('shows empty state when search matches nothing', async () => {
    render(<GroupsView />);
    await screen.findByText('Equipe Vendas');

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou ID do grupo...');
    await userEvent.type(searchInput, 'nonexistent');

    expect(await screen.findByText('Nenhum grupo encontrado')).toBeInTheDocument();
  });

  it('has a sync button', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Sincronizar')).toBeInTheDocument();
  });

  it('has an add group button', async () => {
    render(<GroupsView />);
    expect(await screen.findByText('Adicionar Grupo')).toBeInTheDocument();
  });

  it('opens add dialog when Adicionar Grupo is clicked', async () => {
    render(<GroupsView />);
    await screen.findByText('Equipe Vendas');

    await userEvent.click(screen.getByText('Adicionar Grupo'));
    expect(screen.getByText('Adicionar Grupo', { selector: '[class*="DialogTitle"], h2' })).toBeInTheDocument();
  });

  it('handles API error on fetch', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'whatsapp_groups') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        };
      }
      if (table === 'whatsapp_connections') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<GroupsView />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar grupos');
    });
  });
});
