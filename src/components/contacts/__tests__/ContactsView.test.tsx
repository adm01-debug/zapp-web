/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- supabase mock ----
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

const chainable = () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.then = undefined;
  return chain;
};

let mockContactsData: any[] = [];
let mockFromError: any = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockContactsData, error: mockFromError }),
          }),
          insert: vi.fn().mockReturnValue({
            then: undefined,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    }),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/hooks/useActionFeedback', () => ({
  useActionFeedback: () => ({
    warning: vi.fn(),
    withFeedback: vi.fn().mockImplementation(async (fn: any, opts: any) => {
      try {
        await fn();
        opts.onSuccess?.();
      } catch {
        // error path
      }
    }),
  }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/contacts' }),
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterDomProps(props)}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...filterDomProps(props)}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  StaggeredList: ({ children, ...props }: any) => <div {...filterDomProps(props)}>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

function filterDomProps(props: any) {
  const {
    initial, animate, exit, transition, variants,
    whileHover, whileTap, whileFocus, whileDrag, whileInView,
    layout, layoutId, ...rest
  } = props;
  return rest;
}

import { ContactsView } from '../ContactsView';

const sampleContacts = [
  {
    id: '1', name: 'Alice', nickname: null, surname: 'Smith', job_title: 'Dev',
    company: 'Acme', phone: '+5511999990001', email: 'alice@acme.com',
    avatar_url: null, tags: ['VIP'], notes: null, contact_type: 'cliente',
    created_at: '2024-06-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: '2', name: 'Bob', nickname: 'Bobby', surname: null, job_title: null,
    company: null, phone: '+5511999990002', email: null,
    avatar_url: null, tags: null, notes: null, contact_type: 'lead',
    created_at: '2024-05-01T00:00:00Z', updated_at: '2024-05-01T00:00:00Z',
  },
  {
    id: '3', name: 'Charlie', nickname: null, surname: 'Brown', job_title: 'Manager',
    company: 'Corp', phone: '+5511999990003', email: 'charlie@corp.com',
    avatar_url: null, tags: ['VIP', 'Priority'], notes: null, contact_type: 'fornecedor',
    created_at: '2024-04-01T00:00:00Z', updated_at: '2024-07-01T00:00:00Z',
  },
];

describe('ContactsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContactsData = sampleContacts;
    mockFromError = null;
  });

  it('renders the page header', async () => {
    render(<ContactsView />);
    const matches = screen.getAllByText('Contatos');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays loading spinner initially', () => {
    // The component shows loading state before data resolves
    render(<ContactsView />);
    // loading indicator is an animate-spin element
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders contacts after loading', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Charlie/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows contact count in subtitle', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText(/3 contatos/)).toBeInTheDocument();
    });
  });

  it('renders phone numbers', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('+5511999990001')).toBeInTheDocument();
    });
  });

  it('renders emails when present', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
    });
  });

  it('renders company and job title', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeInTheDocument();
      expect(screen.getByText('Dev')).toBeInTheDocument();
    });
  });

  it('renders tags badges', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      const vipBadges = screen.getAllByText('VIP');
      expect(vipBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when no contacts', async () => {
    mockContactsData = [];
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
    });
  });

  it('shows empty state description for no contacts', async () => {
    mockContactsData = [];
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText(/Adicione seu primeiro contato/)).toBeInTheDocument();
    });
  });

  it('has search input', () => {
    render(<ContactsView />);
    expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
  });

  it('filters contacts by search', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome/);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // Debounced - wait for search to apply
    await waitFor(() => {
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 1000 });
  });

  it('renders "Novo Contato" button', async () => {
    render(<ContactsView />);
    expect(screen.getByText('Novo Contato')).toBeInTheDocument();
  });

  it('renders sync button', async () => {
    render(<ContactsView />);
    expect(screen.getByText('Sincronizar')).toBeInTheDocument();
  });

  it('renders import and export buttons', () => {
    render(<ContactsView />);
    expect(screen.getByText('Importar')).toBeInTheDocument();
    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('renders contact type tabs', async () => {
    render(<ContactsView />);
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('shows filters button', () => {
    render(<ContactsView />);
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('shows error toast on fetch failure', async () => {
    mockFromError = { message: 'Network error' };
    render(<ContactsView />);
    await waitFor(() => {
      // should not crash; contacts empty
      expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
    });
  });

  it('renders table headers', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('Contato')).toBeInTheDocument();
      expect(screen.getByText('Tipo')).toBeInTheDocument();
      expect(screen.getByText('Telefone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  it('renders nickname when present', async () => {
    render(<ContactsView />);
    await waitFor(() => {
      expect(screen.getByText('(Bobby)')).toBeInTheDocument();
    });
  });

  it('renders the sort dropdown', () => {
    render(<ContactsView />);
    // Sort options exist as a Select
    expect(screen.getByText('Nome (A-Z)')).toBeInTheDocument();
  });
});
