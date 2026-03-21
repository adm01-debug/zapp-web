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
  useLocation: () => ({ pathname: '/meta-capi' }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { MetaCAPIView } from '../MetaCAPIView';

const sampleEvents = [
  {
    id: 'e1', event_name: 'Purchase', event_time: '2025-03-01T12:00:00Z',
    contact_id: null, pixel_id: '123', action_source: 'chat',
    custom_data: { value: 99.9 }, sent_to_meta: true, created_at: '2025-03-01T12:00:00Z',
  },
  {
    id: 'e2', event_name: 'Lead', event_time: '2025-03-02T12:00:00Z',
    contact_id: null, pixel_id: '123', action_source: 'website',
    custom_data: {}, sent_to_meta: false, created_at: '2025-03-02T12:00:00Z',
  },
  {
    id: 'e3', event_name: 'ViewContent', event_time: '2025-03-03T12:00:00Z',
    contact_id: null, pixel_id: null, action_source: 'chat',
    custom_data: {}, sent_to_meta: true, created_at: '2025-03-03T12:00:00Z',
  },
];

const sampleSettings = [
  { key: 'meta_pixel_id', value: '9876543' },
  { key: 'meta_capi_auto_track', value: 'true' },
];

function setupMock(events = sampleEvents, settings = sampleSettings) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'meta_capi_events') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: events, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'global_settings') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: settings, error: null }),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('MetaCAPIView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page header', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Meta Conversions API')).toBeInTheDocument();
  });

  it('shows total events count', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Total Eventos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows sent to Meta count', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Enviados ao Meta')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays pixel ID from settings', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('9876543')).toBeInTheDocument();
  });

  it('shows auto-tracking status', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Ativo')).toBeInTheDocument();
  });

  it('shows auto-tracking as Inativo when disabled', async () => {
    setupMock(sampleEvents, [
      { key: 'meta_pixel_id', value: '' },
      { key: 'meta_capi_auto_track', value: 'false' },
    ]);
    render(<MetaCAPIView />);
    expect(await screen.findByText('Inativo')).toBeInTheDocument();
  });

  it('displays event type cards', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Visualização')).toBeInTheDocument();
    expect(screen.getByText('Contato')).toBeInTheDocument();
  });

  it('shows event counts per type', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Compra');
    // Purchase has 1, Lead has 1, ViewContent has 1
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(3);
  });

  it('displays recent events', async () => {
    render(<MetaCAPIView />);
    expect(await screen.findByText('Purchase')).toBeInTheDocument();
    // Lead event_name text
    const leadItems = screen.getAllByText('Lead');
    expect(leadItems.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ViewContent')).toBeInTheDocument();
  });

  it('shows Enviado badge for sent events', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Purchase');
    const enviadoBadges = screen.getAllByText('Enviado');
    expect(enviadoBadges.length).toBe(2);
  });

  it('shows Pendente badge for unsent events', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Purchase');
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('shows empty state when no events', async () => {
    setupMock([]);
    render(<MetaCAPIView />);
    expect(await screen.findByText('Nenhum evento registrado')).toBeInTheDocument();
  });

  it('opens config dialog when Configurar is clicked', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Meta Conversions API');

    await userEvent.click(screen.getByText('Configurar'));
    expect(screen.getByText('Configurar Meta CAPI')).toBeInTheDocument();
  });

  it('shows pixel ID input in config dialog', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Meta Conversions API');

    await userEvent.click(screen.getByText('Configurar'));
    expect(screen.getByPlaceholderText('Ex: 123456789')).toBeInTheDocument();
  });

  it('sends test event when event type card is clicked', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Compra');

    // Click on Compra card
    await userEvent.click(screen.getByText('Compra'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('meta_capi_events');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining('Purchase'),
      }));
    });
  });

  it('shows Não configurado when pixel ID is empty', async () => {
    setupMock(sampleEvents, []);
    render(<MetaCAPIView />);
    expect(await screen.findByText('Não configurado')).toBeInTheDocument();
  });

  it('displays action source in event details', async () => {
    render(<MetaCAPIView />);
    await screen.findByText('Purchase');
    const chatSources = screen.getAllByText(/chat/);
    expect(chatSources.length).toBeGreaterThanOrEqual(1);
  });

  it('handles event send error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meta_capi_events') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
        };
      }
      if (table === 'global_settings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<MetaCAPIView />);
    await screen.findByText('Compra');
    await userEvent.click(screen.getByText('Compra'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
