/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---- mocks ----
const mockConnections = [
  {
    id: 'conn1', name: 'WhatsApp Vendas', phone_number: '+55 11 99999-0001',
    instance_id: 'vendas_123456', status: 'connected', qr_code: null,
    is_default: true, created_at: '2024-01-01T00:00:00Z',
    battery_level: 85, is_plugged: false, retry_count: 0, max_retries: 5,
  },
  {
    id: 'conn2', name: 'WhatsApp Suporte', phone_number: '+55 11 99999-0002',
    instance_id: 'suporte_123456', status: 'disconnected', qr_code: null,
    is_default: false, created_at: '2024-01-02T00:00:00Z',
    battery_level: null, is_plugged: null, retry_count: 2, max_retries: 5,
  },
  {
    id: 'conn3', name: 'WhatsApp Marketing', phone_number: '+55 11 99999-0003',
    instance_id: null, status: 'pending', qr_code: 'base64qrcode',
    is_default: false, created_at: '2024-01-03T00:00:00Z',
    battery_level: null, is_plugged: null, retry_count: 0, max_retries: 5,
  },
];

const {
  mockCreateInstance,
  mockConnectInstance,
  mockGetInstanceStatus,
  mockDisconnectInstance,
  mockDeleteInstance,
  mockFrom,
  mockChannel,
} = vi.hoisted(() => ({
  mockCreateInstance: vi.fn().mockResolvedValue({}),
  mockConnectInstance: vi.fn().mockResolvedValue({ qrcode: { base64: 'qr123' } }),
  mockGetInstanceStatus: vi.fn().mockResolvedValue({ state: 'close' }),
  mockDisconnectInstance: vi.fn().mockResolvedValue({}),
  mockDeleteInstance: vi.fn().mockResolvedValue({}),
  mockFrom: vi.fn(),
  mockChannel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
}));

vi.mock('@/hooks/useEvolutionApi', () => ({
  useEvolutionApi: () => ({
    isLoading: false,
    createInstance: mockCreateInstance,
    connectInstance: mockConnectInstance,
    getInstanceStatus: mockGetInstanceStatus,
    disconnectInstance: mockDisconnectInstance,
    deleteInstance: mockDeleteInstance,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}));

mockFrom.mockImplementation((table: string) => {
  if (table === 'whatsapp_connections') {
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockConnections, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'new1', name: 'New', phone_number: '123',
              status: 'disconnected', instance_id: 'new_inst',
              is_default: false, created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({ error: null }),
        }),
        neq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  return {
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useActionFeedback', () => ({
  useActionFeedback: () => ({ showFeedback: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  StaggeredList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description, onAction, actionLabel }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));

vi.mock('./BusinessHoursDialog', () => ({
  BusinessHoursDialog: () => null,
}));

vi.mock('./BusinessHoursIndicator', () => ({
  BusinessHoursIndicator: () => null,
}));

vi.mock('./ConnectionQueuesDialog', () => ({
  ConnectionQueuesDialog: () => null,
}));

vi.mock('./InstanceSettingsDialog', () => ({
  InstanceSettingsDialog: () => null,
}));

vi.mock('./IntegrationsPanel', () => ({
  IntegrationsPanel: () => null,
}));

import { ConnectionsView } from '../ConnectionsView';

function renderView() {
  return render(<ConnectionsView />);
}

describe('ConnectionsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Conexões WhatsApp')).toBeInTheDocument();
    });
  });

  it('renders connection names after loading', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Vendas')).toBeInTheDocument();
    });
    expect(screen.getByText('WhatsApp Suporte')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Marketing')).toBeInTheDocument();
  });

  it('shows connected status indicator', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument();
    });
  });

  it('shows disconnected status indicator', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Desconectado')).toBeInTheDocument();
    });
  });

  it('shows pending status indicator', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Aguardando QR')).toBeInTheDocument();
    });
  });

  it('shows default badge on default connection', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Padrão')).toBeInTheDocument();
    });
  });

  it('shows phone numbers', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('+55 11 99999-0001')).toBeInTheDocument();
    });
  });

  it('shows instance ID when present', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('vendas_123456')).toBeInTheDocument();
    });
  });

  it('shows battery level when present', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('shows retry count when > 0', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Retry 2/5')).toBeInTheDocument();
    });
  });

  // ---- Stats ----

  it('displays stat cards', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Total de Conexões')).toBeInTheDocument();
      expect(screen.getByText('Conectadas')).toBeInTheDocument();
      expect(screen.getByText('Desconectadas')).toBeInTheDocument();
    });
  });

  it('shows correct total count', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // ---- Nova Conexao Dialog ----

  it('opens add connection dialog', async () => {
    renderView();
    await waitFor(() => expect(screen.getByText('Nova Conexão')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Nova Conexão'));
    expect(screen.getByText('Adicionar Nova Conexão')).toBeInTheDocument();
  });

  it('shows form fields in add dialog', async () => {
    renderView();
    await waitFor(() => expect(screen.getByText('Nova Conexão')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Nova Conexão'));
    expect(screen.getByPlaceholderText(/WhatsApp Vendas/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+55/)).toBeInTheDocument();
  });

  // ---- Buttons ----

  it('shows Conectar button for disconnected connections', async () => {
    renderView();
    await waitFor(() => {
      const connectBtns = screen.getAllByText('Conectar');
      expect(connectBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Desconectar button for connected connections', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });
  });

  it('shows Copiar ID buttons', async () => {
    renderView();
    await waitFor(() => {
      const copyBtns = screen.getAllByText('Copiar ID');
      expect(copyBtns.length).toBe(3);
    });
  });

  // ---- Loading state ----

  it('shows loading spinner initially', () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    }));
    renderView();
    expect(screen.getByText(/Carregando conexões/)).toBeInTheDocument();
  });
});

describe('ConnectionsView - empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));
  });

  it('shows empty state when no connections', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Nenhuma conexão configurada')).toBeInTheDocument();
  });

  it('shows add button in empty state', async () => {
    renderView();
    await waitFor(() => {
      expect(screen.getByText('Adicionar Conexão')).toBeInTheDocument();
    });
  });
});
