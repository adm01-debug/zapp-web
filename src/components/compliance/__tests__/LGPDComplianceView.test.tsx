/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: any[]) => mockFrom(...a),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast: toastFn };
});

const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, session: null, profile: null, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  createLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { toast } from 'sonner';
import { LGPDComplianceView } from '../LGPDComplianceView';

function setupMock() {
  mockFrom.mockImplementation((table: string) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
}

describe('LGPDComplianceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    // Mock URL.createObjectURL and revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('renders the page title', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Privacidade & LGPD')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Gerencie seus dados pessoais conforme a LGPD/GDPR')).toBeInTheDocument();
  });

  it('displays user rights section', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Seus Direitos')).toBeInTheDocument();
    expect(screen.getByText('Acesso')).toBeInTheDocument();
    expect(screen.getByText('Portabilidade')).toBeInTheDocument();
    expect(screen.getByText('Retificação')).toBeInTheDocument();
    expect(screen.getByText('Eliminação')).toBeInTheDocument();
  });

  it('displays data portability section', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Portabilidade de Dados')).toBeInTheDocument();
    expect(screen.getByText('Exportar Meus Dados')).toBeInTheDocument();
  });

  it('displays right to be forgotten section', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Direito ao Esquecimento')).toBeInTheDocument();
    expect(screen.getByText('Solicitar Exclusão de Dados')).toBeInTheDocument();
  });

  it('displays stored data types', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Dados de Identificação')).toBeInTheDocument();
    expect(screen.getByText('Dados de Uso')).toBeInTheDocument();
    expect(screen.getByText('Dados de Comunicação')).toBeInTheDocument();
    expect(screen.getByText('Dados de Segurança')).toBeInTheDocument();
  });

  it('displays legal basis badges', () => {
    render(<LGPDComplianceView />);
    const contractualBadges = screen.getAllByText('Execução contratual');
    expect(contractualBadges.length).toBe(2);
    expect(screen.getByText('Legítimo interesse')).toBeInTheDocument();
    expect(screen.getByText('Obrigação legal')).toBeInTheDocument();
  });

  it('triggers data export on button click', async () => {
    render(<LGPDComplianceView />);

    const exportBtn = screen.getByText('Exportar Meus Dados');
    await userEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
  });

  it('shows exporting state while export is in progress', async () => {
    // Make supabase slow
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
        }),
      }),
    }));

    render(<LGPDComplianceView />);
    const exportBtn = screen.getByText('Exportar Meus Dados');
    await userEvent.click(exportBtn);

    expect(screen.getByText('Exportando...')).toBeInTheDocument();
  });

  it('shows delete confirmation on delete button click', async () => {
    render(<LGPDComplianceView />);

    const deleteBtn = screen.getByText('Solicitar Exclusão de Dados');
    await userEvent.click(deleteBtn);

    expect(screen.getByText('Tem certeza? Esta ação não pode ser desfeita.')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('can cancel delete confirmation', async () => {
    render(<LGPDComplianceView />);

    await userEvent.click(screen.getByText('Solicitar Exclusão de Dados'));
    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument();
    });
  });

  it('submits deletion request on confirm', async () => {
    render(<LGPDComplianceView />);

    await userEvent.click(screen.getByText('Solicitar Exclusão de Dados'));
    await userEvent.click(screen.getByText('Confirmar Exclusão'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Solicitação de exclusão registrada')
      );
    });
  });

  it('handles export error gracefully', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error('Export failed')),
        }),
      }),
    }));

    render(<LGPDComplianceView />);
    await userEvent.click(screen.getByText('Exportar Meus Dados'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao exportar dados');
    });
  });

  it('handles deletion request error gracefully', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockRejectedValue(new Error('Delete failed')),
    }));

    render(<LGPDComplianceView />);
    await userEvent.click(screen.getByText('Solicitar Exclusão de Dados'));
    await userEvent.click(screen.getByText('Confirmar Exclusão'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao registrar solicitação');
    });
  });

  it('shows irreversible action warning', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Ação irreversível')).toBeInTheDocument();
  });

  it('describes data types in detail', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText('Nome, email, telefone')).toBeInTheDocument();
    expect(screen.getByText('Logs, sessões, dispositivos')).toBeInTheDocument();
    expect(screen.getByText('Mensagens, templates')).toBeInTheDocument();
    expect(screen.getByText('IPs, tentativas de login')).toBeInTheDocument();
  });

  it('mentions LGPD in the description', () => {
    render(<LGPDComplianceView />);
    expect(screen.getByText(/Lei Geral de Proteção de Dados/)).toBeInTheDocument();
  });
});
