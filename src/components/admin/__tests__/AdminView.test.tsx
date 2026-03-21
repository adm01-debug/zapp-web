/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminView } from '../AdminView';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => <div data-testid="floating-particles" />,
}));
vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => <div data-testid="aurora" />,
}));

let mockIsAdmin = true;
let mockIsSupervisor = true;
let mockRoleLoading = false;

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    isAdmin: mockIsAdmin,
    isSupervisor: mockIsSupervisor,
    loading: mockRoleLoading,
    roles: mockIsAdmin ? ['admin'] : mockIsSupervisor ? ['supervisor'] : ['agent'],
    hasRole: (r: string) => (mockIsAdmin && r === 'admin') || (mockIsSupervisor && r === 'supervisor'),
    refetch: vi.fn(),
  }),
}));

const mockProfiles = [
  {
    id: 'p1', user_id: 'u1', name: 'Alice Admin', email: 'alice@test.com',
    avatar_url: null, role: 'admin', job_title: 'Manager', department: 'Sales',
    phone: '+55123', access_level: 'full', max_chats: 10, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'p2', user_id: 'u2', name: 'Bob Agent', email: 'bob@test.com',
    avatar_url: null, role: 'agent', job_title: null, department: null,
    phone: null, access_level: 'basic', max_chats: 5, is_active: true, created_at: '2024-01-02',
  },
  {
    id: 'p3', user_id: 'u3', name: 'Inactive User', email: 'inactive@test.com',
    avatar_url: null, role: 'agent', job_title: null, department: null,
    phone: null, access_level: 'basic', max_chats: 5, is_active: false, created_at: '2024-01-03',
  },
];

const mockRoles = [
  { id: 'r1', user_id: 'u1', role: 'admin' },
  { id: 'r2', user_id: 'u2', role: 'agent' },
  { id: 'r3', user_id: 'u3', role: 'agent' },
];

const mockAuditLogs = [
  { id: 'l1', user_id: 'u1', action: 'user.login', entity_type: 'auth', details: {}, created_at: '2024-06-15T10:30:00Z' },
  { id: 'l2', user_id: 'u2', action: 'ticket.close', entity_type: 'ticket', details: { ticket_id: 't1' }, created_at: '2024-06-15T11:00:00Z' },
];

function setupProfilesMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      const selectResult = {
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
        in: vi.fn().mockResolvedValue({
          data: mockProfiles.map(p => ({ user_id: p.user_id, name: p.name, email: p.email })),
          error: null,
        }),
      };
      return {
        select: vi.fn().mockReturnValue(selectResult),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'user_roles') {
      const rolesResult = Promise.resolve({ data: mockRoles, error: null });
      const selectObj: any = {
        ...rolesResult,
        then: rolesResult.then.bind(rolesResult),
      };
      return {
        select: vi.fn().mockReturnValue(selectObj),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'audit_logs') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = true;
    mockIsSupervisor = true;
    mockRoleLoading = false;
    setupProfilesMock();
  });

  it('shows loading spinner when role is loading', () => {
    mockRoleLoading = true;
    const { container } = render(<AdminView />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows access restricted message when user is not supervisor', () => {
    mockIsSupervisor = false;
    mockIsAdmin = false;
    render(<AdminView />);
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(screen.getByText('Você não tem permissão para acessar esta área.')).toBeInTheDocument();
  });

  it('renders admin header with title and subtitle', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Administração')).toBeInTheDocument();
    });
    expect(screen.getByText(/Gerencie usuários, permissões/)).toBeInTheDocument();
  });

  it('renders Users and Audit tab buttons', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários/)).toBeInTheDocument();
    });
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
  });

  it('renders user table with users data', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob Agent')).toBeInTheDocument();
  });

  it('shows user email in the table', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    });
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('shows job title and department for users who have them', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('shows Ativo badge for active users', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
    });
  });

  it('shows Inativo badge for inactive users', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  it('shows actions column for admin users', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  it('hides actions column for non-admin supervisor', async () => {
    mockIsAdmin = false;
    mockIsSupervisor = true;
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ações')).not.toBeInTheDocument();
  });

  it('renders search input for users', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar usuários...')).toBeInTheDocument();
    });
  });

  it('filters users by search term', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar usuários...'), { target: { value: 'Bob' } });
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Agent')).toBeInTheDocument();
  });

  it('renders refresh button', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });
  });

  it('renders Usuários tab with user count', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText(/Usuários \(3\)/)).toBeInTheDocument();
    });
  });

  it('shows table headers for user table', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Usuário')).toBeInTheDocument();
    });
    expect(screen.getByText('Cargo/Depto')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows Editar Usuário dialog title (not open by default)', async () => {
    render(<AdminView />);
    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
    // Dialog should not be visible by default
    expect(screen.queryByText('Editar Usuário')).not.toBeInTheDocument();
  });
});
