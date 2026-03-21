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

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

import { TranscriptionsHistoryView } from '../TranscriptionsHistoryView';

const now = new Date();
const todayISO = now.toISOString();

const sampleMessages = [
  {
    id: 'm1', content: 'audio1', transcription: 'Hello, how can I help you?',
    media_url: 'https://audio.test/1.ogg', created_at: todayISO, contact_id: 'c1',
    contacts: { name: 'Maria Silva', phone: '+5511999999999', avatar_url: null },
  },
  {
    id: 'm2', content: 'audio2', transcription: 'I need support with billing',
    media_url: 'https://audio.test/2.ogg', created_at: todayISO, contact_id: 'c1',
    contacts: { name: 'Maria Silva', phone: '+5511999999999', avatar_url: null },
  },
  {
    id: 'm3', content: 'audio3', transcription: 'Order placed successfully',
    media_url: null, created_at: todayISO, contact_id: 'c2',
    contacts: { name: 'João Santos', phone: '+5511888888888', avatar_url: null },
  },
];

function setupMock(messages = sampleMessages) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'messages') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: messages, error: null }),
            }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
}

describe('TranscriptionsHistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page title', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('Histórico de Transcrições')).toBeInTheDocument();
  });

  it('shows transcription count', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText(/3 transcrições de 2 contatos/)).toBeInTheDocument();
  });

  it('groups transcriptions by contact', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Santos')).toBeInTheDocument();
  });

  it('shows contact phone numbers', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('+5511999999999')).toBeInTheDocument();
    expect(screen.getByText('+5511888888888')).toBeInTheDocument();
  });

  it('shows transcription count per contact', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('2 transcrições')).toBeInTheDocument();
    expect(screen.getByText('1 transcrições')).toBeInTheDocument();
  });

  it('shows empty state when no transcriptions', async () => {
    setupMock([]);
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('Nenhuma transcrição ainda')).toBeInTheDocument();
  });

  it('displays search input', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByPlaceholderText('Buscar em transcrições...')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    render(<TranscriptionsHistoryView />);
    await screen.findByText('Maria Silva');

    const searchInput = screen.getByPlaceholderText('Buscar em transcrições...');
    await userEvent.type(searchInput, 'billing');

    // Only Maria's group should remain (transcription matches)
    await waitFor(() => {
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.queryByText('João Santos')).not.toBeInTheDocument();
    });
  });

  it('filters by contact name', async () => {
    render(<TranscriptionsHistoryView />);
    await screen.findByText('Maria Silva');

    const searchInput = screen.getByPlaceholderText('Buscar em transcrições...');
    await userEvent.type(searchInput, 'João');

    await waitFor(() => {
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
      expect(screen.getByText('João Santos')).toBeInTheDocument();
    });
  });

  it('shows no results empty state when search matches nothing', async () => {
    render(<TranscriptionsHistoryView />);
    await screen.findByText('Maria Silva');

    const searchInput = screen.getByPlaceholderText('Buscar em transcrições...');
    await userEvent.type(searchInput, 'xyznonexistent');

    expect(await screen.findByText('Nenhum resultado encontrado')).toBeInTheDocument();
  });

  it('has expand all and collapse all buttons', async () => {
    render(<TranscriptionsHistoryView />);
    await screen.findByText('Maria Silva');

    expect(screen.getByText('Expandir todos')).toBeInTheDocument();
    expect(screen.getByText('Recolher todos')).toBeInTheDocument();
  });

  it('has date filter select', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('Todo período')).toBeInTheDocument();
  });

  it('has refresh button', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('Atualizar')).toBeInTheDocument();
  });

  it('refresh button triggers refetch', async () => {
    render(<TranscriptionsHistoryView />);
    await screen.findByText('Maria Silva');

    const refreshBtn = screen.getByText('Atualizar');
    await userEvent.click(refreshBtn);

    // Should have called from('messages') again
    expect(mockFrom).toHaveBeenCalledWith('messages');
  });

  it('handles API error gracefully', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }),
    }));

    render(<TranscriptionsHistoryView />);
    // Should show empty state, not crash
    expect(await screen.findByText('Nenhuma transcrição ainda')).toBeInTheDocument();
  });

  it('shows contact avatar fallback initials', async () => {
    render(<TranscriptionsHistoryView />);
    expect(await screen.findByText('M')).toBeInTheDocument(); // Maria
    expect(screen.getByText('J')).toBeInTheDocument(); // João
  });
});
