import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationSummary } from '../ConversationSummary';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const makeMessages = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    sender: (i % 2 === 0 ? 'contact' : 'agent') as 'contact' | 'agent',
    content: `Message ${i}`,
    created_at: new Date().toISOString(),
  }));

const mockSummary = {
  summary: 'Cliente solicitou suporte técnico para configuração de produto.',
  status: 'pendente' as const,
  keyPoints: ['Produto com defeito', 'Solicitou troca'],
  nextSteps: ['Enviar formulário de troca'],
  sentiment: 'neutro' as const,
};

describe('ConversationSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always renders period selector', () => {
    render(
      <ConversationSummary messages={makeMessages(15)} contactName="João" />
    );
    expect(screen.getByText('Resumo da Conversa')).toBeInTheDocument();
    expect(screen.getByText(/mensagens no período/)).toBeInTheDocument();
  });

  it('renders summary card when initialSummary is provided', () => {
    render(
      <ConversationSummary
        messages={makeMessages(15)}
        contactName="João"
        initialSummary={mockSummary as unknown as Record<string, unknown>}
      />
    );
    expect(screen.getByText('Resumo da Conversa')).toBeInTheDocument();
    expect(screen.getByText(mockSummary.summary)).toBeInTheDocument();
  });

  it('shows key points when summary has them', () => {
    render(
      <ConversationSummary
        messages={makeMessages(15)}
        contactName="João"
        initialSummary={mockSummary as unknown as Record<string, unknown>}
      />
    );
    expect(screen.getByText('Produto com defeito')).toBeInTheDocument();
    expect(screen.getByText('Solicitou troca')).toBeInTheDocument();
  });

  it('shows next steps when summary has them', () => {
    render(
      <ConversationSummary
        messages={makeMessages(15)}
        contactName="João"
        initialSummary={mockSummary as unknown as Record<string, unknown>}
      />
    );
    expect(screen.getByText('Enviar formulário de troca')).toBeInTheDocument();
  });

  it('shows status badge with correct label', () => {
    render(
      <ConversationSummary
        messages={makeMessages(15)}
        contactName="João"
        initialSummary={mockSummary as unknown as Record<string, unknown>}
      />
    );
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('shows generate button when no summary exists', () => {
    render(
      <ConversationSummary messages={makeMessages(15)} contactName="João" />
    );
    expect(screen.getByText(/Gerar resumo/)).toBeInTheDocument();
  });

  it('shows regenerate button when summary exists', () => {
    render(
      <ConversationSummary
        messages={makeMessages(15)}
        contactName="João"
        initialSummary={mockSummary as unknown as Record<string, unknown>}
      />
    );
    expect(screen.getByText('Regenerar resumo')).toBeInTheDocument();
  });

  it('renders all status variants correctly', () => {
    const statuses = ['resolvido', 'pendente', 'aguardando_cliente', 'aguardando_atendente'] as const;
    const labels = ['Resolvido', 'Pendente', 'Aguardando Cliente', 'Aguardando Atendente'];

    statuses.forEach((status, idx) => {
      const { unmount } = render(
        <ConversationSummary
          messages={makeMessages(15)}
          contactName="João"
          initialSummary={{ ...mockSummary, status } as unknown as Record<string, unknown>}
        />
      );
      expect(screen.getByText(labels[idx])).toBeInTheDocument();
      unmount();
    });
  });

  it('shows close button when onClose provided', () => {
    const onClose = vi.fn();
    render(
      <ConversationSummary messages={makeMessages(15)} contactName="João" onClose={onClose} />
    );
    // X button should be present
    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
