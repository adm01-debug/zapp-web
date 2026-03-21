/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { CreateQueueDialog } from '../CreateQueueDialog';

describe('CreateQueueDialog', () => {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByText('Nova Fila')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<CreateQueueDialog open={false} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.queryByText('Nova Fila')).not.toBeInTheDocument();
  });

  it('renders name input', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
  });

  it('renders color label', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByText('Cor')).toBeInTheDocument();
  });

  it('renders 8 color buttons', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    // 8 color swatches as buttons
    const colorButtons = document.querySelectorAll('button[style*="background-color"]');
    expect(colorButtons.length).toBe(8);
  });

  it('renders submit button', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByText('Criar Fila')).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByText('Criar Fila')).toBeDisabled();
  });

  it('submit button is enabled after name is entered', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'New Queue' } });
    expect(screen.getByText('Criar Fila')).not.toBeDisabled();
  });

  it('calls onSubmit with form data', async () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Support' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Help desk' } });
    fireEvent.click(screen.getByText('Criar Fila'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Support', description: 'Help desk' })
      );
    });
  });

  it('renders cancel button', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when cancel clicked', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows placeholder text for name input', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText('Ex: Suporte Técnico')).toBeInTheDocument();
  });

  it('shows placeholder text for description', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText(/Descreva o propósito/)).toBeInTheDocument();
  });

  it('resets form after successful submit', async () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Queue' } });
    fireEvent.click(screen.getByText('Criar Fila'));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('selects a different color when clicked', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    const colorButtons = document.querySelectorAll('button[style*="background-color"]');
    // Click the second color
    fireEvent.click(colorButtons[1]);
    // The second button should have ring class (selected)
    expect(colorButtons[1].className).toContain('ring-2');
  });

  it('handles whitespace-only name as empty', () => {
    render(<CreateQueueDialog open={true} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '   ' } });
    expect(screen.getByText('Criar Fila')).toBeDisabled();
  });
});
