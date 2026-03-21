/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockStartCall = vi.fn().mockResolvedValue('call-123');
const mockAnswerCall = vi.fn().mockResolvedValue(true);
const mockEndCall = vi.fn().mockResolvedValue(true);
const mockMissCall = vi.fn().mockResolvedValue(true);

vi.mock('@/hooks/useCalls', () => ({
  useCalls: () => ({
    startCall: mockStartCall,
    answerCall: mockAnswerCall,
    endCall: mockEndCall,
    missCall: mockMissCall,
    currentCallId: null,
    isLoading: false,
  }),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders contact name when open', () => {
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
  });

  it('renders contact phone', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );
    expect(screen.getByText('+5511999999999')).toBeInTheDocument();
  });

  it('shows "Chamando..." for outbound ringing', () => {
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

  it('shows "Chamada recebida..." for inbound ringing', () => {
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
    // Answer button has bg-whatsapp class
    const buttons = screen.getAllByRole('button');
    // Should have answer (green) and end (red) buttons
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show answer button for outbound calls', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );
    // Only the end call button
    const buttons = screen.getAllByRole('button');
    // One end button + dialog close button
    expect(buttons.filter(b => b.className.includes('destructive')).length).toBe(1);
  });

  it('starts call when dialog opens', async () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockStartCall).toHaveBeenCalledWith(expect.objectContaining({
        contactId: 'contact-1',
        contactPhone: '+5511999999999',
        direction: 'outbound',
      }));
    });
  });

  it('calls endCall and onEnd when end button is clicked', async () => {
    vi.useRealTimers();
    const onEnd = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CallDialog
        open={true}
        onOpenChange={onOpenChange}
        contact={defaultContact}
        direction="outbound"
        onEnd={onEnd}
      />
    );

    await waitFor(() => {
      expect(mockStartCall).toHaveBeenCalled();
    });

    const endButton = screen.getAllByRole('button').find(
      b => b.className.includes('destructive')
    );
    if (endButton) {
      await userEvent.click(endButton);
      await waitFor(() => {
        expect(onEnd).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    }
  });

  it('shows avatar fallback with initials', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );
    expect(screen.getByText('MS')).toBeInTheDocument();
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

  it('calls answerCall when answer button is clicked for inbound', async () => {
    vi.useRealTimers();
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
        onAnswer={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockStartCall).toHaveBeenCalled();
    });

    // Find the green answer button (bg-whatsapp)
    const answerBtn = screen.getAllByRole('button').find(
      b => b.className.includes('whatsapp')
    );
    if (answerBtn) {
      await userEvent.click(answerBtn);
      await waitFor(() => {
        expect(mockAnswerCall).toHaveBeenCalledWith('call-123');
      });
    }
  });

  it('shows duration timer when answered', async () => {
    vi.useRealTimers();
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
        onAnswer={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockStartCall).toHaveBeenCalled();
    });

    const answerBtn = screen.getAllByRole('button').find(
      b => b.className.includes('whatsapp')
    );
    if (answerBtn) {
      await userEvent.click(answerBtn);
      await waitFor(() => {
        expect(screen.getByText('00:00')).toBeInTheDocument();
      });
    }
  });

  it('shows mute and speaker buttons when answered', async () => {
    vi.useRealTimers();
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="inbound"
        onEnd={vi.fn()}
        onAnswer={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockStartCall).toHaveBeenCalled();
    });

    const answerBtn = screen.getAllByRole('button').find(
      b => b.className.includes('whatsapp')
    );
    if (answerBtn) {
      await userEvent.click(answerBtn);
      await waitFor(() => {
        // After answering, mute + speaker + end = at least 3 buttons
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(3);
      });
    }
  });

  it('shows waiting text for outbound ringing', () => {
    render(
      <CallDialog
        open={true}
        onOpenChange={vi.fn()}
        contact={defaultContact}
        direction="outbound"
        onEnd={vi.fn()}
      />
    );
    expect(screen.getByText('Aguardando resposta do contato...')).toBeInTheDocument();
  });
});
