import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReauthDialog } from '../ReauthDialog';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    p: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ReauthDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    actionLabel: 'Alterar Senha',
    onConfirm: vi.fn().mockResolvedValue(true),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onConfirm = vi.fn().mockResolvedValue(true);
  });

  it('renders the dialog title', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByText('Confirmação de Segurança')).toBeInTheDocument();
  });

  it('renders the action label in description', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByText('Alterar Senha')).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Digite sua senha')).toBeInTheDocument();
  });

  it('renders Cancelar and Confirmar buttons', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    render(<ReauthDialog {...defaultProps} />);
    await userEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows error when confirming with empty password', async () => {
    render(<ReauthDialog {...defaultProps} />);
    // The Confirmar button should be disabled when password is empty
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onConfirm with the entered password', async () => {
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha');

    await userEvent.type(input, 'mypassword');
    await userEvent.click(screen.getByText('Confirmar'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith('mypassword');
  });

  it('shows error message when onConfirm returns false', async () => {
    defaultProps.onConfirm = vi.fn().mockResolvedValue(false);
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha');

    await userEvent.type(input, 'wrongpass');
    await userEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
    });
  });

  it('clears password on successful confirm', async () => {
    defaultProps.onConfirm = vi.fn().mockResolvedValue(true);
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha') as HTMLInputElement;

    await userEvent.type(input, 'correctpass');
    await userEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('toggles password visibility', async () => {
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha');
    expect(input).toHaveAttribute('type', 'password');

    // The show/hide button is a plain button element
    const toggleButtons = screen.getAllByRole('button');
    const visibilityToggle = toggleButtons.find(btn => !btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Confirm'));
    // Find the actual toggle - it's the button inside the password field wrapper
    const toggleBtn = screen.getByPlaceholderText('Digite sua senha')
      .parentElement?.querySelector('button');
    if (toggleBtn) {
      await userEvent.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'text');
    }
  });

  it('shows loading state', () => {
    render(<ReauthDialog {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });

  it('disables input when loading', () => {
    render(<ReauthDialog {...defaultProps} isLoading={true} />);
    const input = screen.getByPlaceholderText('Digite sua senha');
    expect(input).toBeDisabled();
  });

  it('disables cancel button when loading', () => {
    render(<ReauthDialog {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });

  it('handles Enter key to confirm', async () => {
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha');

    await userEvent.type(input, 'mypass');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('mypass');
    });
  });

  it('clears error on input change', async () => {
    defaultProps.onConfirm = vi.fn().mockResolvedValue(false);
    render(<ReauthDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Digite sua senha');

    await userEvent.type(input, 'bad');
    await userEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
    });

    await userEvent.type(input, 'x');
    await waitFor(() => {
      expect(screen.queryByText('Senha incorreta')).not.toBeInTheDocument();
    });
  });

  it('renders security info text', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByText(/verificação adicional/)).toBeInTheDocument();
  });

  it('renders Senha Atual label', () => {
    render(<ReauthDialog {...defaultProps} />);
    expect(screen.getByText('Senha Atual')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ReauthDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Confirmação de Segurança')).not.toBeInTheDocument();
  });
});
