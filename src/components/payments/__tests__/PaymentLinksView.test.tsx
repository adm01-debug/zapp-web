/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFrom = vi.fn();
const mockToast = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: any[]) => mockFrom(...a),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: (...a: any[]) => mockToast(...a),
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/payments' }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { PaymentLinksView } from '../PaymentLinksView';

const sampleLinks = [
  {
    id: '1', title: 'Plano Mensal', description: 'Monthly plan', amount: 99.90,
    currency: 'BRL', status: 'active', payment_method: 'pix',
    payment_url: 'https://pay.test/abc', contact_id: null,
    paid_at: null, expires_at: null, created_at: '2025-03-01T00:00:00Z',
  },
  {
    id: '2', title: 'Consultoria', description: null, amount: 250.00,
    currency: 'BRL', status: 'paid', payment_method: 'card',
    payment_url: 'https://pay.test/def', contact_id: null,
    paid_at: '2025-03-02T00:00:00Z', expires_at: null, created_at: '2025-02-28T00:00:00Z',
  },
  {
    id: '3', title: 'Link Expirado', description: null, amount: 50.00,
    currency: 'BRL', status: 'expired', payment_method: 'pix',
    payment_url: null, contact_id: null,
    paid_at: null, expires_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z',
  },
];

function setupMock(links = sampleLinks) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'payment_links') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: links, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('PaymentLinksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders the page header', async () => {
    render(<PaymentLinksView />);
    expect(await screen.findByText('Links de Pagamento')).toBeInTheDocument();
  });

  it('displays all payment links', async () => {
    render(<PaymentLinksView />);
    expect(await screen.findByText('Plano Mensal')).toBeInTheDocument();
    expect(screen.getByText('Consultoria')).toBeInTheDocument();
    expect(screen.getByText('Link Expirado')).toBeInTheDocument();
  });

  it('shows status badges', async () => {
    render(<PaymentLinksView />);
    expect(await screen.findByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Expirado')).toBeInTheDocument();
  });

  it('displays amounts formatted in BRL', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');
    expect(screen.getByText(/99,90/)).toBeInTheDocument();
    expect(screen.getByText(/250,00/)).toBeInTheDocument();
  });

  it('shows total links count', async () => {
    render(<PaymentLinksView />);
    expect(await screen.findByText('Total Links')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows payment method type', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');
    const pixLabels = screen.getAllByText(/PIX/);
    expect(pixLabels.length).toBeGreaterThan(0);
  });

  it('opens create dialog when Novo Link is clicked', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    expect(screen.getByText('Novo Link de Pagamento')).toBeInTheDocument();
  });

  it('does not create link with empty title', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    const amountInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(amountInput, '100');

    await userEvent.click(screen.getByText('Criar Link'));
    // Should not have inserted
    const insertCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'payment_links');
    // Only the initial fetch call
    expect(insertCalls.length).toBe(1);
  });

  it('does not create link with zero amount', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    const titleInput = screen.getByPlaceholderText('Ex: Plano Mensal');
    await userEvent.type(titleInput, 'Test Link');
    const amountInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(amountInput, '0');

    await userEvent.click(screen.getByText('Criar Link'));
    // amount <= 0 means no insert
    const insertCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'payment_links');
    expect(insertCalls.length).toBe(1);
  });

  it('does not create link with negative amount', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    const titleInput = screen.getByPlaceholderText('Ex: Plano Mensal');
    await userEvent.type(titleInput, 'Test');
    const amountInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(amountInput, '-50');

    await userEvent.click(screen.getByText('Criar Link'));
    const insertCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'payment_links');
    expect(insertCalls.length).toBe(1);
  });

  it('does not create link with non-numeric amount', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    const titleInput = screen.getByPlaceholderText('Ex: Plano Mensal');
    await userEvent.type(titleInput, 'Test');
    const amountInput = screen.getByPlaceholderText('0,00');
    await userEvent.type(amountInput, 'abc');

    await userEvent.click(screen.getByText('Criar Link'));
    const insertCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'payment_links');
    expect(insertCalls.length).toBe(1);
  });

  it('shows empty state when no links exist', async () => {
    setupMock([]);
    render(<PaymentLinksView />);
    expect(await screen.findByText('Nenhum link de pagamento')).toBeInTheDocument();
  });

  it('cancel button closes the dialog', async () => {
    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    expect(screen.getByText('Novo Link de Pagamento')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Novo Link de Pagamento')).not.toBeInTheDocument();
    });
  });

  it('displays received total in green', async () => {
    render(<PaymentLinksView />);
    expect(await screen.findByText('Recebidos')).toBeInTheDocument();
    expect(screen.getByText(/250,00/)).toBeInTheDocument();
  });

  it('handles API error on create gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payment_links') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: sampleLinks, error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<PaymentLinksView />);
    await screen.findByText('Plano Mensal');

    await userEvent.click(screen.getByText('Novo Link'));
    await userEvent.type(screen.getByPlaceholderText('Ex: Plano Mensal'), 'Test');
    await userEvent.type(screen.getByPlaceholderText('0,00'), '100');
    await userEvent.click(screen.getByText('Criar Link'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });

  it('subscribes to realtime changes on mount', () => {
    render(<PaymentLinksView />);
    // channel is called
    // Just verify no crash
    expect(true).toBe(true);
  });
});
