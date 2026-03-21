/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFetchFactors = vi.fn();
const mockUnenroll = vi.fn();

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => ({
    factors: mockFactors,
    fetchFactors: mockFetchFactors,
    unenroll: mockUnenroll,
    loading: mockLoading,
    isMFAEnabled: mockIsMFAEnabled,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, exit, layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MFAEnroll sub-component
vi.mock('../MFAEnroll', () => ({
  MFAEnroll: ({ onSuccess, onCancel }: any) => (
    <div data-testid="mfa-enroll">
      <button onClick={onSuccess}>Enroll Success</button>
      <button onClick={onCancel}>Enroll Cancel</button>
    </div>
  ),
}));

let mockFactors: any[] = [];
let mockLoading = false;
let mockIsMFAEnabled = false;

import { MFASettings } from '../MFASettings';

describe('MFASettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFactors = [];
    mockLoading = false;
    mockIsMFAEnabled = false;
  });

  it('renders the card title', () => {
    render(<MFASettings />);
    expect(screen.getByText('Autenticação de Dois Fatores (2FA)')).toBeInTheDocument();
  });

  it('shows Inativo badge when MFA not enabled', () => {
    render(<MFASettings />);
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('shows Ativo badge when MFA is enabled', () => {
    mockIsMFAEnabled = true;
    render(<MFASettings />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('shows recommendation warning when MFA not enabled', () => {
    render(<MFASettings />);
    expect(screen.getByText('Recomendado ativar 2FA')).toBeInTheDocument();
  });

  it('does not show recommendation when MFA is enabled', () => {
    mockIsMFAEnabled = true;
    render(<MFASettings />);
    expect(screen.queryByText('Recomendado ativar 2FA')).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockLoading = true;
    const { container } = render(<MFASettings />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Configurar 2FA" button when MFA not enabled', () => {
    render(<MFASettings />);
    expect(screen.getByText('Configurar 2FA')).toBeInTheDocument();
  });

  it('renders "Adicionar outro método" button when MFA is enabled', () => {
    mockIsMFAEnabled = true;
    render(<MFASettings />);
    expect(screen.getByText('Adicionar outro método')).toBeInTheDocument();
  });

  it('calls fetchFactors on mount', () => {
    render(<MFASettings />);
    expect(mockFetchFactors).toHaveBeenCalled();
  });

  it('renders factor list', () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'My Phone', status: 'verified' },
    ];
    mockIsMFAEnabled = true;
    render(<MFASettings />);
    expect(screen.getByText('My Phone')).toBeInTheDocument();
    expect(screen.getByText(/Verificado/)).toBeInTheDocument();
  });

  it('renders default name for factor without friendly_name', () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: null, status: 'verified' },
    ];
    render(<MFASettings />);
    expect(screen.getByText('App Autenticador')).toBeInTheDocument();
  });

  it('shows unverified status', () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Test', status: 'unverified' },
    ];
    render(<MFASettings />);
    expect(screen.getByText(/Não verificado/)).toBeInTheDocument();
  });

  it('renders delete button for each factor', () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Test', status: 'verified' },
    ];
    render(<MFASettings />);
    // The delete button has a Trash2 icon
    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('destructive')
    );
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('opens remove confirmation dialog when delete is clicked', async () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Test', status: 'verified' },
    ];
    render(<MFASettings />);

    const deleteBtn = screen.getAllByRole('button').find(btn =>
      btn.className.includes('destructive')
    );
    if (deleteBtn) {
      await userEvent.click(deleteBtn);
    }

    await waitFor(() => {
      expect(screen.getByText('Remover Autenticação 2FA?')).toBeInTheDocument();
    });
  });

  it('calls unenroll when removal is confirmed', async () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Test', status: 'verified' },
    ];
    render(<MFASettings />);

    const deleteBtn = screen.getAllByRole('button').find(btn =>
      btn.className.includes('destructive')
    );
    if (deleteBtn) await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Remover')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Remover'));

    await waitFor(() => {
      expect(mockUnenroll).toHaveBeenCalledWith('f1');
    });
  });

  it('shows cancel button in remove dialog', async () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Test', status: 'verified' },
    ];
    render(<MFASettings />);

    const deleteBtn = screen.getAllByRole('button').find(btn =>
      btn.className.includes('destructive')
    );
    if (deleteBtn) await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  it('renders multiple factors', () => {
    mockFactors = [
      { id: 'f1', factor_type: 'totp', friendly_name: 'Phone 1', status: 'verified' },
      { id: 'f2', factor_type: 'totp', friendly_name: 'Phone 2', status: 'verified' },
    ];
    render(<MFASettings />);
    expect(screen.getByText('Phone 1')).toBeInTheDocument();
    expect(screen.getByText('Phone 2')).toBeInTheDocument();
  });

  it('description changes based on MFA status', () => {
    render(<MFASettings />);
    expect(screen.getByText('Adicione uma camada extra de segurança')).toBeInTheDocument();
  });

  it('shows protected description when enabled', () => {
    mockIsMFAEnabled = true;
    render(<MFASettings />);
    expect(screen.getByText('Sua conta está protegida com 2FA')).toBeInTheDocument();
  });
});
