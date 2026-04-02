/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock VoipContext
vi.mock('@/contexts/VoipContext', () => ({
  useVoipContext: () => ({
    isReady: true,
    makeCall: vi.fn(),
    activeCall: null,
    connections: [],
  }),
  VoipProvider: ({ children }: any) => <>{children}</>,
}));

// Mock supabase — must use inline data, not external variables
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                contact_id: 'c1',
                agent_id: 'a1',
                direction: 'inbound',
                status: 'ended',
                started_at: '2026-04-02T10:00:00Z',
                answered_at: '2026-04-02T10:00:05Z',
                ended_at: '2026-04-02T10:02:05Z',
                duration_seconds: 120,
                notes: null,
                created_at: '2026-04-02T10:00:00Z',
                contacts: { name: 'João Silva', phone: '+5511999990000' },
                profiles: { name: 'Agent Ana' },
              },
              {
                id: '2',
                contact_id: 'c2',
                agent_id: 'a1',
                direction: 'outbound',
                status: 'missed',
                started_at: '2026-04-02T11:00:00Z',
                answered_at: null,
                ended_at: '2026-04-02T11:00:30Z',
                duration_seconds: 0,
                notes: null,
                created_at: '2026-04-02T11:00:00Z',
                contacts: { name: 'Maria Santos', phone: '+5511888880000' },
                profiles: { name: 'Agent Ana' },
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/calls/CallDialog', () => ({
  CallDialog: () => null,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, actions }: any) => <div><h1>{title}</h1>{actions}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { CallsView } from '../CallsView';

describe('CallsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByText('Chamadas')).toBeInTheDocument();
    });
  });

  it('shows VoIP connected badge', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByText('VoIP Conectado')).toBeInTheDocument();
    });
  });

  it('renders call history after loading', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });
  });

  it('shows stats cards', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByText('Total Hoje')).toBeInTheDocument();
      expect(screen.getByText('Atendidas')).toBeInTheDocument();
      expect(screen.getByText('Perdidas')).toBeInTheDocument();
      expect(screen.getByText('Duração Média')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByLabelText('Buscar chamadas')).toBeInTheDocument();
    });
  });

  it('opens dialer dialog', async () => {
    render(<CallsView />);
    await waitFor(() => {
      expect(screen.getByText('Nova Chamada')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Nova Chamada'));
    expect(screen.getByLabelText('Número de telefone')).toBeInTheDocument();
  });
});
