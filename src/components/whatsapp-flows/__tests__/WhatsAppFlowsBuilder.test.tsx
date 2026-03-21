/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFrom = vi.fn();
const mockToast = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: any[]) => mockFrom(...a),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: (...a: any[]) => mockToast(...a),
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/whatsapp-flows' }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { WhatsAppFlowsBuilder } from '../WhatsAppFlowsBuilder';

const sampleFlows = [
  {
    id: 'flow1', name: 'Cadastro Lead', description: 'Formulário de cadastro',
    flow_json: {}, status: 'draft', whatsapp_flow_id: null,
    created_at: '2025-01-01T00:00:00Z',
    screens: [
      {
        id: 's1', title: 'Tela 1',
        layout: [
          { id: 'c1', type: 'TextHeading', text: 'Bem-vindo' },
          { id: 'c2', type: 'TextBody', text: 'Preencha abaixo' },
          { id: 'c3', type: 'TextInput', label: 'Nome', name: 'field_name' },
          { id: 'c4', type: 'Footer', label: 'Enviar' },
        ],
      },
    ],
  },
  {
    id: 'flow2', name: 'Pesquisa NPS', description: null,
    flow_json: {}, status: 'published', whatsapp_flow_id: 'wa-123',
    created_at: '2025-02-01T00:00:00Z',
    screens: [
      { id: 's2', title: 'Tela 1', layout: [{ id: 'c5', type: 'TextHeading', text: 'NPS' }, { id: 'c6', type: 'Footer', label: 'Enviar' }] },
      { id: 's3', title: 'Tela 2', layout: [{ id: 'c7', type: 'TextBody', text: 'Obrigado' }] },
    ],
  },
];

function setupMock(flows = sampleFlows) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'whatsapp_flows') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: flows, error: null }),
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
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('WhatsAppFlowsBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid-1234' });
  });

  it('renders the page header', async () => {
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('WhatsApp Flows')).toBeInTheDocument();
  });

  it('displays flow list', async () => {
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('Cadastro Lead')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa NPS')).toBeInTheDocument();
  });

  it('shows flow descriptions', async () => {
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('Formulário de cadastro')).toBeInTheDocument();
    expect(screen.getByText('Sem descrição')).toBeInTheDocument();
  });

  it('shows screen count badges', async () => {
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('1 telas')).toBeInTheDocument();
    expect(screen.getByText('2 telas')).toBeInTheDocument();
  });

  it('shows published status badge', async () => {
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('Publicado')).toBeInTheDocument();
  });

  it('shows draft status badge', async () => {
    render(<WhatsAppFlowsBuilder />);
    const drafts = await screen.findAllByText('Rascunho');
    expect(drafts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no flows', async () => {
    setupMock([]);
    render(<WhatsAppFlowsBuilder />);
    expect(await screen.findByText('Nenhum WhatsApp Flow')).toBeInTheDocument();
  });

  it('opens create dialog when Novo Flow is clicked', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');

    await userEvent.click(screen.getByText('Novo Flow'));
    expect(screen.getByText('Novo WhatsApp Flow')).toBeInTheDocument();
  });

  it('does not create flow with empty name', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');

    await userEvent.click(screen.getByText('Novo Flow'));
    await userEvent.click(screen.getByText('Criar'));

    // Should not insert
    const calls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'whatsapp_flows');
    expect(calls.length).toBe(1); // only the initial fetch
  });

  it('creates flow with valid name', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');

    await userEvent.click(screen.getByText('Novo Flow'));
    await userEvent.type(screen.getByPlaceholderText('Ex: Cadastro de Lead'), 'New Flow');
    await userEvent.click(screen.getByText('Criar'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Flow criado!' }));
    });
  });

  it('enters flow editor when flow card is clicked', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');

    await userEvent.click(screen.getByText('Cadastro Lead'));

    // Should show the editor view with flow name as title
    await waitFor(() => {
      expect(screen.getByText('Editor de WhatsApp Flow')).toBeInTheDocument();
    });
  });

  it('shows screen tabs in editor', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Tela 1')).toBeInTheDocument();
    });
  });

  it('shows component palette in editor', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Componentes')).toBeInTheDocument();
      expect(screen.getByText('Campo de Texto')).toBeInTheDocument();
    });
  });

  it('renders flow components in preview', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Bem-vindo')).toBeInTheDocument();
      expect(screen.getByText('Preencha abaixo')).toBeInTheDocument();
      expect(screen.getByText('Enviar')).toBeInTheDocument();
    });
  });

  it('back button returns to flow list', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Editor de WhatsApp Flow')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('← Voltar'));
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Flows')).toBeInTheDocument();
    });
  });

  it('handles flow creation error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'whatsapp_flows') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Nenhum WhatsApp Flow');

    await userEvent.click(screen.getByText('Novo Flow'));
    await userEvent.type(screen.getByPlaceholderText('Ex: Cadastro de Lead'), 'Test');
    await userEvent.click(screen.getByText('Criar'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });

  it('cancel closes create dialog', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');

    await userEvent.click(screen.getByText('Novo Flow'));
    expect(screen.getByText('Novo WhatsApp Flow')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Novo WhatsApp Flow')).not.toBeInTheDocument();
    });
  });

  it('displays preview/edit toggle in editor', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  it('shows add screen button in editor', async () => {
    render(<WhatsAppFlowsBuilder />);
    await screen.findByText('Cadastro Lead');
    await userEvent.click(screen.getByText('Cadastro Lead'));

    await waitFor(() => {
      expect(screen.getByText('Tela')).toBeInTheDocument();
    });
  });
});
