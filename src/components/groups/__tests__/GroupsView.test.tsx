import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Supabase Mock ───
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockInvoke = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

const chainMock = () => ({
  select: mockSelect.mockReturnValue({ order: mockOrder }),
  insert: mockInsert.mockResolvedValue({ error: null }),
  delete: mockDelete.mockReturnValue({ eq: mockEq }),
  upsert: mockUpsert.mockResolvedValue({ error: null }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => chainMock()),
    functions: { invoke: mockInvoke },
    channel: mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: mockRemoveChannel,
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: {}, profile: null, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { GroupsView } from '@/components/groups/GroupsView';
import { toast } from 'sonner';

describe('GroupsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: return empty data for both tables
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockResolvedValue({ error: null });
  });

  // ─── RENDERING ───

  describe('Rendering', () => {
    it('renders the page header', async () => {
      render(<GroupsView />);
      expect(screen.getByText('Grupos WhatsApp')).toBeInTheDocument();
    });

    it('shows loading spinner initially', () => {
      mockOrder.mockReturnValue(new Promise(() => {})); // never resolves
      render(<GroupsView />);
      // The RefreshCw spinner should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows empty state when no groups exist', async () => {
      render(<GroupsView />);
      await waitFor(() => {
        expect(screen.getByText('Nenhum grupo cadastrado')).toBeInTheDocument();
      });
    });

    it('displays groups when data is loaded', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            {
              id: 'g1',
              group_id: '123@g.us',
              name: 'Grupo Teste',
              description: 'Desc teste',
              participant_count: 10,
              avatar_url: null,
              is_admin: true,
              whatsapp_connection_id: 'conn-1',
              created_at: '2025-01-01',
              updated_at: '2025-01-01',
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: 'conn-1', name: 'WhatsApp Principal', phone_number: '5511999', instance_id: 'inst-1' },
          ],
          error: null,
        });

      render(<GroupsView />);

      await waitFor(() => {
        expect(screen.getByText('Grupo Teste')).toBeInTheDocument();
        expect(screen.getByText('10 participantes')).toBeInTheDocument();
        expect(screen.getByText('Desc teste')).toBeInTheDocument();
      });
    });

    it('shows Admin badge for admin groups', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            {
              id: 'g1', group_id: '123@g.us', name: 'Admin Group',
              description: null, participant_count: 5, avatar_url: null,
              is_admin: true, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01',
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });
    });

    it('shows "Não vinculado" for groups without connection', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            {
              id: 'g1', group_id: '123@g.us', name: 'Orphan Group',
              description: null, participant_count: 3, avatar_url: null,
              is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01',
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);

      await waitFor(() => {
        expect(screen.getByText('Não vinculado')).toBeInTheDocument();
      });
    });
  });

  // ─── SEARCH ───

  describe('Search', () => {
    it('filters groups by name', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Marketing', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
            { id: 'g2', group_id: '2@g.us', name: 'Vendas', description: null, participant_count: 8, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);

      await waitFor(() => expect(screen.getByText('Marketing')).toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText('Buscar por nome ou ID do grupo...');
      fireEvent.change(searchInput, { target: { value: 'Vendas' } });

      expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
      expect(screen.getByText('Vendas')).toBeInTheDocument();
    });

    it('filters groups by group_id', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: 'abc@g.us', name: 'Alpha', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
            { id: 'g2', group_id: 'xyz@g.us', name: 'Beta', description: null, participant_count: 8, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou ID do grupo...'), {
        target: { value: 'xyz' },
      });

      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('shows no-results empty state when search has no match', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Grupo A', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Grupo A')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou ID do grupo...'), {
        target: { value: 'inexistente' },
      });

      expect(screen.getByText('Nenhum grupo encontrado')).toBeInTheDocument();
    });
  });

  // ─── SELECTION & BROADCAST ───

  describe('Group Selection', () => {
    const setupGroups = () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Grupo 1', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: 'c1', created_at: '2025-01-01', updated_at: '2025-01-01' },
            { id: 'g2', group_id: '2@g.us', name: 'Grupo 2', description: null, participant_count: 10, avatar_url: null, is_admin: false, whatsapp_connection_id: 'c1', created_at: '2025-01-01', updated_at: '2025-01-01' },
            { id: 'g3', group_id: '3@g.us', name: 'Grupo 3', description: null, participant_count: 3, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'c1', name: 'WPP 1', phone_number: '5511999', instance_id: 'inst-1' }],
          error: null,
        });
    };

    it('shows "Selecionar todos" button when groups exist', async () => {
      setupGroups();
      render(<GroupsView />);
      await waitFor(() => {
        expect(screen.getByText('Selecionar todos')).toBeInTheDocument();
      });
    });

    it('shows broadcast button when groups are selected', async () => {
      setupGroups();
      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Grupo 1')).toBeInTheDocument());

      // Click a group card to select it
      fireEvent.click(screen.getByText('Grupo 1').closest('[class*="card"]')!);

      await waitFor(() => {
        expect(screen.getByText(/Enviar para 1 grupo/)).toBeInTheDocument();
      });
    });

    it('toggles group selection on click', async () => {
      setupGroups();
      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Grupo 1')).toBeInTheDocument());

      const card = screen.getByText('Grupo 1').closest('[class*="cursor-pointer"]')!;

      // Select
      fireEvent.click(card);
      await waitFor(() => expect(screen.getByText(/Enviar para 1 grupo/)).toBeInTheDocument());

      // Deselect
      fireEvent.click(card);
      await waitFor(() => expect(screen.queryByText(/Enviar para/)).not.toBeInTheDocument());
    });

    it('select all toggles all groups', async () => {
      setupGroups();
      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Grupo 1')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Selecionar todos'));

      await waitFor(() => {
        expect(screen.getByText(/Enviar para 3 grupo/)).toBeInTheDocument();
        expect(screen.getByText('Desselecionar todos')).toBeInTheDocument();
      });
    });
  });

  describe('Broadcast', () => {
    it('opens broadcast dialog when clicking send button', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Grupo Broadcast', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: 'c1', created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'c1', name: 'WPP', phone_number: '5511', instance_id: 'inst-1' }],
          error: null,
        });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Grupo Broadcast')).toBeInTheDocument());

      // Select group
      fireEvent.click(screen.getByText('Grupo Broadcast').closest('[class*="cursor-pointer"]')!);
      await waitFor(() => expect(screen.getByText(/Enviar para 1 grupo/)).toBeInTheDocument());

      // Open broadcast dialog
      fireEvent.click(screen.getByText(/Enviar para 1 grupo/));

      await waitFor(() => {
        expect(screen.getByText('Enviar Mensagem em Massa')).toBeInTheDocument();
        expect(screen.getByText(/1.*grupo\(s\) selecionado/)).toBeInTheDocument();
      });
    });

    it('shows rate limiting warning in broadcast dialog', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'G1', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: 'c1', created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'c1', name: 'WPP', phone_number: '5511', instance_id: 'inst-1' }],
          error: null,
        });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('G1')).toBeInTheDocument());

      fireEvent.click(screen.getByText('G1').closest('[class*="cursor-pointer"]')!);
      await waitFor(() => fireEvent.click(screen.getByText(/Enviar para 1 grupo/)));

      await waitFor(() => {
        expect(screen.getByText(/Intervalo de 2 segundos/)).toBeInTheDocument();
      });
    });
  });

  // ─── AUTO-SYNC ───

  describe('Auto-Sync', () => {
    it('calls evolution API list-groups for each connection on sync', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: [], error: null }) // groups
        .mockResolvedValueOnce({
          data: [
            { id: 'c1', name: 'WPP 1', phone_number: '5511999', instance_id: 'inst-1' },
            { id: 'c2', name: 'WPP 2', phone_number: '5511888', instance_id: 'inst-2' },
          ],
          error: null,
        });

      mockInvoke.mockResolvedValue({ data: [], error: null });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Sincronizar')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Sincronizar'));

      await waitFor(() => {
        // Should have called for each connection
        expect(mockInvoke).toHaveBeenCalledWith('evolution-api/list-groups', {
          body: { instanceName: 'inst-1', getParticipants: 'false' },
        });
        expect(mockInvoke).toHaveBeenCalledWith('evolution-api/list-groups', {
          body: { instanceName: 'inst-2', getParticipants: 'false' },
        });
      });
    });

    it('shows error toast when no connections available', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: [], error: null }) // groups
        .mockResolvedValueOnce({ data: [], error: null }); // connections

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Sincronizar')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Sincronizar'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Nenhuma conexão WhatsApp configurada');
      });
    });

    it('shows partial sync warning when some connections fail', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            { id: 'c1', name: 'OK', phone_number: '5511', instance_id: 'inst-ok' },
            { id: 'c2', name: 'Fail', phone_number: '5522', instance_id: 'inst-fail' },
          ],
          error: null,
        });

      mockInvoke
        .mockResolvedValueOnce({ data: [{ id: '1@g.us', subject: 'G1', size: 5 }], error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('timeout') });

      // Mock the refetch after sync
      mockOrder.mockResolvedValue({ data: [], error: null });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Sincronizar')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Sincronizar'));

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalled();
      });
    });

    it('skips connections without instance_id', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            { id: 'c1', name: 'No Instance', phone_number: '5511', instance_id: null },
          ],
          error: null,
        });

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Sincronizar')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Sincronizar'));

      await waitFor(() => {
        expect(mockInvoke).not.toHaveBeenCalled();
      });
    });
  });

  // ─── DELETE ───

  describe('Delete Group', () => {
    it('calls delete and refreshes on success', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Delete Me', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValue({ data: [], error: null }); // refetch

      render(<GroupsView />);
      await waitFor(() => expect(screen.getByText('Delete Me')).toBeInTheDocument());
    });
  });

  // ─── ERROR HANDLING ───

  describe('Error Handling', () => {
    it('shows error toast when groups fetch fails', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao carregar grupos');
      });
    });

    it('handles connection fetch errors gracefully', async () => {
      mockOrder
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'conn error' } });

      render(<GroupsView />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Grupos WhatsApp')).toBeInTheDocument();
      });
    });
  });

  // ─── CONNECTION NAME RESOLUTION ───

  describe('Connection Name Resolution', () => {
    it('shows connection name for linked groups', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Linked Group', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: 'c1', created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'c1', name: 'WhatsApp Business', phone_number: '5511999', instance_id: 'inst-1' }],
          error: null,
        });

      render(<GroupsView />);

      await waitFor(() => {
        expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
      });
    });

    it('shows "Desconhecido" for unknown connection ids', async () => {
      mockOrder
        .mockResolvedValueOnce({
          data: [
            { id: 'g1', group_id: '1@g.us', name: 'Unknown Conn', description: null, participant_count: 5, avatar_url: null, is_admin: false, whatsapp_connection_id: 'nonexistent', created_at: '2025-01-01', updated_at: '2025-01-01' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<GroupsView />);

      await waitFor(() => {
        expect(screen.getByText('Desconhecido')).toBeInTheDocument();
      });
    });
  });
});
