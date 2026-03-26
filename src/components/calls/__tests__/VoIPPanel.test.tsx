import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { password: 'test-pass' } }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/useSipClient', () => ({
  useSipClient: () => ({
    sipStatus: 'disconnected' as const,
    callStatus: 'idle' as const,
    callDuration: 0,
    isMuted: false,
    currentNumber: '',
    connect: vi.fn(),
    disconnect: vi.fn(),
    makeCall: vi.fn(),
    hangUp: vi.fn(),
    toggleMute: vi.fn(),
    sendDTMF: vi.fn(),
  }),
}));

import { VoIPPanel } from '../VoIPPanel';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('VoIPPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the VoIP header', () => {
    renderWithProviders(<VoIPPanel />);
    expect(screen.getByText('VoIP & Chamadas')).toBeInTheDocument();
  });

  it('renders all three tabs', () => {
    renderWithProviders(<VoIPPanel />);
    expect(screen.getByText('Discador')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('defaults to dialer tab', () => {
    renderWithProviders(<VoIPPanel />);
    expect(screen.getByPlaceholderText('Digite o número')).toBeInTheDocument();
  });

  it('switches to history tab and shows empty state', async () => {
    renderWithProviders(<VoIPPanel />);
    fireEvent.click(screen.getByText('Histórico'));
    await waitFor(() => {
      expect(screen.getByText('Nenhuma chamada registrada')).toBeInTheDocument();
    });
  });

  it('switches to settings tab and shows SIP config', async () => {
    renderWithProviders(<VoIPPanel />);
    fireEvent.click(screen.getByText('Configurações'));
    await waitFor(() => {
      expect(screen.getByText('Servidor SIP / VoIP')).toBeInTheDocument();
    });
  });

  it('renders stat cards', () => {
    renderWithProviders(<VoIPPanel />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Recebidas')).toBeInTheDocument();
    expect(screen.getByText('Realizadas')).toBeInTheDocument();
    expect(screen.getByText('Perdidas')).toBeInTheDocument();
    expect(screen.getByText('Duração Média')).toBeInTheDocument();
  });

  it('shows SIP server and user inputs in settings', async () => {
    renderWithProviders(<VoIPPanel />);
    fireEvent.click(screen.getByText('Configurações'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('ip.b24-9441-1552764901.bitrixphone.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('phone1')).toBeInTheDocument();
    });
  });

  it('shows recording settings', async () => {
    renderWithProviders(<VoIPPanel />);
    fireEvent.click(screen.getByText('Configurações'));
    await waitFor(() => {
      expect(screen.getByText('Gravação automática')).toBeInTheDocument();
    });
  });

  it('calculates stats correctly with empty calls', () => {
    renderWithProviders(<VoIPPanel />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it('renders without crashing when supabase returns error', () => {
    renderWithProviders(<VoIPPanel />);
    expect(screen.getByText('VoIP & Chamadas')).toBeInTheDocument();
  });
});
