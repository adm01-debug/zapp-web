/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMakeCall = vi.fn();
const mockAnswerIncoming = vi.fn();
const mockRejectIncoming = vi.fn();
const mockHangUp = vi.fn();
const mockToggleMute = vi.fn();

vi.mock('@/contexts/VoipContext', () => ({
  useVoipContext: () => ({
    isReady: true,
    activeCall: null,
    incomingOffer: null,
    makeCall: mockMakeCall,
    answerIncoming: mockAnswerIncoming,
    rejectIncoming: mockRejectIncoming,
    hangUp: mockHangUp,
    toggleMute: mockToggleMute,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

import { CallDialog } from '../CallDialog';

const defaultContact = {
  id: 'contact-1',
  name: 'Maria Silva',
  phone: '+5511999999999',
  avatar: undefined,
};

describe('CallDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contact info when open', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('+5511999999999')).toBeInTheDocument();
  });

  it('shows VoIP badge when connected', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByText('VoIP')).toBeInTheDocument();
  });

  it('shows calling status for outbound', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByText('Chamando...')).toBeInTheDocument();
  });

  it('shows incoming call status for inbound', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByText('Chamada recebida...')).toBeInTheDocument();
  });

  it('shows answer button for inbound calls', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Atender chamada')).toBeInTheDocument();
  });

  it('shows end/reject button', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Encerrar chamada')).toBeInTheDocument();
  });

  it('calls hangUp when end button is clicked on outbound', async () => {
    const user = userEvent.setup();
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText('Encerrar chamada'));
    expect(mockHangUp).toHaveBeenCalledTimes(1);
  });

  it('calls rejectIncoming when reject button is clicked on inbound', async () => {
    const user = userEvent.setup();
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText('Rejeitar chamada'));
    expect(mockRejectIncoming).toHaveBeenCalledTimes(1);
  });

  it('initiates outbound call via makeCall', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(mockMakeCall).toHaveBeenCalledWith('+5511999999999', 'contact-1', 'Maria Silva');
  });

  it('does not render when closed', () => {
    render(
      <CallDialog
        open={false}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
  });
});
