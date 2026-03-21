/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [
      { id: 'a1', name: 'Agent 1', is_active: true, avatar_url: null },
      { id: 'a2', name: 'Agent 2', is_active: false, avatar_url: null },
    ],
  }),
}));

vi.mock('@/hooks/useQueues', () => ({
  useQueues: () => ({
    queues: [
      { id: 'q1', name: 'Suporte', color: '#ff0000' },
      { id: 'q2', name: 'Vendas', color: '#00ff00' },
    ],
  }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../PrivateNotes', () => ({
  PrivateNotes: () => <div data-testid="private-notes" />,
}));

vi.mock('../ConversationHistory', () => ({
  ConversationHistory: () => <div data-testid="conversation-history" />,
}));

vi.mock('@/components/contacts/CustomFieldsSection', () => ({
  CustomFieldsSection: () => <div data-testid="custom-fields" />,
}));

import { ContactDetails } from '../ContactDetails';

const baseConversation = {
  id: 'conv1',
  contact: {
    id: 'c1',
    name: 'Maria Costa',
    phone: '+5511999990001',
    email: 'maria@example.com',
    avatar: 'https://example.com/maria.jpg',
    tags: ['vip', 'premium'],
    createdAt: new Date('2023-06-15'),
  },
  lastMessage: undefined,
  unreadCount: 2,
  status: 'open' as const,
  priority: 'medium' as const,
  tags: ['urgent'],
  createdAt: new Date('2023-06-15'),
  updatedAt: new Date('2024-01-01'),
};

describe('ContactDetails', () => {
  const onClose = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders the header', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Detalhes do Contato')).toBeInTheDocument();
  });

  it('renders contact name', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Maria Costa')).toBeInTheDocument();
  });

  it('renders contact phone number', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    const phones = screen.getAllByText('+5511999990001');
    expect(phones.length).toBeGreaterThan(0);
  });

  it('renders contact email', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
  });

  it('renders call button', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Ligar')).toBeInTheDocument();
  });

  it('renders email button', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders close button and calls onClose', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    const closeButtons = screen.getAllByRole('button');
    // The X button is the one with destructive hover
    const xButton = closeButtons.find(b => b.className.includes('destructive'));
    expect(xButton).toBeDefined();
    fireEvent.click(xButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders contact tags', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('vip')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
  });

  it('renders conversation tags', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders Tags section heading', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders Informações section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Informações')).toBeInTheDocument();
  });

  it('renders Atribuição section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Atribuição')).toBeInTheDocument();
  });

  it('renders Estatísticas section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Estatísticas')).toBeInTheDocument();
  });

  it('renders Mensagens count in stats', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Mensagens')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders Tempo médio in stats', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText('Tempo médio')).toBeInTheDocument();
    expect(screen.getByText('3min')).toBeInTheDocument();
  });

  it('renders private notes section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByTestId('private-notes')).toBeInTheDocument();
  });

  it('renders conversation history section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByTestId('conversation-history')).toBeInTheDocument();
  });

  it('renders custom fields section', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByTestId('custom-fields')).toBeInTheDocument();
  });

  it('displays creation date', () => {
    render(<ContactDetails conversation={baseConversation as any} onClose={onClose} />);
    expect(screen.getByText(/Cliente desde/)).toBeInTheDocument();
  });
});
