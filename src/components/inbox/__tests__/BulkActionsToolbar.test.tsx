/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
}));

vi.mock('../TransferDialog', () => ({
  TransferDialog: ({ open, onTransfer }: any) =>
    open ? (
      <div data-testid="transfer-dialog">
        <button data-testid="do-transfer" onClick={() => onTransfer('agent', 'a1', 'note')}>Transfer</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: React.forwardRef(({ children, asChild }: any, _ref: any) => asChild ? children : <span>{children}</span>),
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

import { BulkActionsToolbar } from '../BulkActionsToolbar';

describe('BulkActionsToolbar', () => {
  const baseProps = {
    selectedCount: 3,
    onMarkAsRead: vi.fn(),
    onTransfer: vi.fn(),
    onArchive: vi.fn(),
    onClearSelection: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkActionsToolbar {...baseProps} selectedCount={0} />);
    expect(container.textContent).toBe('');
  });

  it('renders toolbar when selectedCount > 0', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByText('3 selecionados')).toBeInTheDocument();
  });

  it('shows singular text for 1 selected', () => {
    render(<BulkActionsToolbar {...baseProps} selectedCount={1} />);
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
  });

  it('renders mark as read button', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByLabelText('Marcar como lido')).toBeInTheDocument();
  });

  it('calls onMarkAsRead when button clicked', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Marcar como lido'));
    expect(baseProps.onMarkAsRead).toHaveBeenCalledTimes(1);
  });

  it('renders transfer button', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByLabelText('Transferir')).toBeInTheDocument();
  });

  it('renders archive button', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByLabelText('Arquivar')).toBeInTheDocument();
  });

  it('calls onArchive when archive clicked', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Arquivar'));
    expect(baseProps.onArchive).toHaveBeenCalledTimes(1);
  });

  it('renders clear selection button', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByLabelText('Limpar seleção')).toBeInTheDocument();
  });

  it('calls onClearSelection when clear clicked', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Limpar seleção'));
    expect(baseProps.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons when isLoading', () => {
    render(<BulkActionsToolbar {...baseProps} isLoading={true} />);
    expect(screen.getByLabelText('Marcar como lido')).toBeDisabled();
    expect(screen.getByLabelText('Transferir')).toBeDisabled();
    expect(screen.getByLabelText('Arquivar')).toBeDisabled();
  });

  it('action buttons are enabled when not loading', () => {
    render(<BulkActionsToolbar {...baseProps} isLoading={false} />);
    expect(screen.getByLabelText('Marcar como lido')).not.toBeDisabled();
    expect(screen.getByLabelText('Arquivar')).not.toBeDisabled();
  });

  it('clicking transfer opens transfer dialog', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.queryByTestId('transfer-dialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Transferir'));
    expect(screen.getByTestId('transfer-dialog')).toBeInTheDocument();
  });

  it('transfer dialog calls onTransfer with correct params', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Transferir'));
    fireEvent.click(screen.getByTestId('do-transfer'));
    expect(baseProps.onTransfer).toHaveBeenCalledWith('agent', 'a1', 'note');
  });

  it('renders plural count badge for 5 items', () => {
    render(<BulkActionsToolbar {...baseProps} selectedCount={5} />);
    expect(screen.getByText('5 selecionados')).toBeInTheDocument();
  });

  it('renders inline text for mark as read', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByText('Marcar como lido')).toBeInTheDocument();
  });

  it('renders inline text for transfer', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByText('Transferir')).toBeInTheDocument();
  });

  it('renders inline text for archive', () => {
    render(<BulkActionsToolbar {...baseProps} />);
    expect(screen.getByText('Arquivar')).toBeInTheDocument();
  });
});
