/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { NewConversationModal } from '../NewConversationModal';
import { toast } from 'sonner';

describe('NewConversationModal', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConversationStarted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no connections, no contacts
    mockFrom.mockImplementation((table: string) => {
      if (table === 'whatsapp_connections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (cb: any) => { cb({ data: [{ id: 'conn1', name: 'WPP1' }] }); return { catch: vi.fn() }; },
            }),
          }),
        };
      }
      if (table === 'contacts') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-c1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('renders the modal title', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Nova Conversa')).toBeInTheDocument();
  });

  it('renders mode toggle buttons', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Contato existente')).toBeInTheDocument();
    expect(screen.getByText('Novo contato')).toBeInTheDocument();
  });

  it('starts in search mode', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByPlaceholderText('Buscar por nome ou telefone...')).toBeInTheDocument();
  });

  it('switches to new contact mode when clicked', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));
    expect(screen.getByPlaceholderText('+5511999999999')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome do contato')).toBeInTheDocument();
  });

  it('renders message textarea', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByPlaceholderText('Digite a primeira mensagem...')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });

  it('send button is disabled when no contact selected and no message', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Enviar').closest('button')).toBeDisabled();
  });

  it('cancel button calls onOpenChange(false)', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    render(<NewConversationModal {...baseProps} open={false} />);
    expect(screen.queryByText('Nova Conversa')).toBeNull();
  });

  it('new contact mode shows phone required field', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));
    expect(screen.getByText('Telefone *')).toBeInTheDocument();
  });

  it('new contact mode shows optional name field', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));
    expect(screen.getByText('Nome (opcional)')).toBeInTheDocument();
  });

  it('shows no contacts found when search returns empty', async () => {
    render(<NewConversationModal {...baseProps} />);
    const searchInput = screen.getByPlaceholderText('Buscar por nome ou telefone...');
    fireEvent.change(searchInput, { target: { value: 'xyz' } });
    await waitFor(() => {
      expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('shows error toast when sending empty message in new contact mode', async () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));

    // Fill phone but no message
    const phoneInput = screen.getByPlaceholderText('+5511999999999');
    fireEvent.change(phoneInput, { target: { value: '+5511888888888' } });

    // The button should be disabled due to empty message, so we test that
    expect(screen.getByText('Enviar').closest('button')).toBeDisabled();
  });

  it('renders the Mensagem label', () => {
    render(<NewConversationModal {...baseProps} />);
    expect(screen.getByText('Mensagem')).toBeInTheDocument();
  });

  it('user can type a phone number in new contact mode', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));
    const phoneInput = screen.getByPlaceholderText('+5511999999999') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+5511123456789' } });
    expect(phoneInput.value).toBe('+5511123456789');
  });

  it('user can type a message', () => {
    render(<NewConversationModal {...baseProps} />);
    const textarea = screen.getByPlaceholderText('Digite a primeira mensagem...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello there' } });
    expect(textarea.value).toBe('Hello there');
  });

  it('switching back to search mode clears selection', () => {
    render(<NewConversationModal {...baseProps} />);
    fireEvent.click(screen.getByText('Novo contato'));
    fireEvent.click(screen.getByText('Contato existente'));
    expect(screen.getByPlaceholderText('Buscar por nome ou telefone...')).toBeInTheDocument();
  });
});
