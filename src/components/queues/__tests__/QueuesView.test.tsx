/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/queues' }),
}));

const mockQueuesData: any[] = [];
let mockLoading = false;
const mockCreateQueue = vi.fn();
const mockDeleteQueue = vi.fn();
const mockAddMember = vi.fn();
const mockRemoveMember = vi.fn();

vi.mock('@/hooks/useQueues', () => ({
  useQueues: () => ({
    queues: mockQueuesData,
    loading: mockLoading,
    createQueue: mockCreateQueue,
    deleteQueue: mockDeleteQueue,
    addMember: mockAddMember,
    removeMember: mockRemoveMember,
  }),
}));

vi.mock('@/hooks/useQueueGoals', () => ({
  useQueueGoals: () => ({ goals: {} }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  StaggeredList: ({ children, ...props }: any) => <div>{children}</div>,
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { QueuesView } from '../QueuesView';

const sampleQueues = [
  {
    id: 'q1', name: 'Suporte', description: 'Technical Support', color: '#3B82F6',
    is_active: true, max_wait_time_minutes: 30, priority: 1,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    members: [
      { id: 'm1', queue_id: 'q1', profile_id: 'p1', is_active: true, created_at: '2024-01-01',
        profile: { id: 'p1', name: 'Agent A', avatar_url: null, is_active: true } },
    ],
    waiting_count: 5,
  },
  {
    id: 'q2', name: 'Vendas', description: null, color: '#10B981',
    is_active: true, max_wait_time_minutes: 15, priority: 2,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    members: [],
    waiting_count: 0,
  },
];

describe('QueuesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueuesData.length = 0;
    mockQueuesData.push(...sampleQueues);
    mockLoading = false;
  });

  it('renders the page title', () => {
    render(<QueuesView />);
    expect(screen.getByText('Filas de Atendimento')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<QueuesView />);
    expect(screen.getByText(/Organize e distribua/)).toBeInTheDocument();
  });

  it('renders queue cards', () => {
    render(<QueuesView />);
    expect(screen.getByText('Suporte')).toBeInTheDocument();
    expect(screen.getByText('Vendas')).toBeInTheDocument();
  });

  it('renders queue description', () => {
    render(<QueuesView />);
    expect(screen.getByText('Technical Support')).toBeInTheDocument();
  });

  it('shows waiting count', () => {
    render(<QueuesView />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows member count', () => {
    render(<QueuesView />);
    // Agent count for q1 = 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows max wait time', () => {
    render(<QueuesView />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('renders "Nova Fila" button', () => {
    render(<QueuesView />);
    expect(screen.getByText('Nova Fila')).toBeInTheDocument();
  });

  it('shows "Adicionar Nova Fila" card', () => {
    render(<QueuesView />);
    expect(screen.getByText('Adicionar Nova Fila')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    mockLoading = true;
    mockQueuesData.length = 0;
    render(<QueuesView />);
    // Skeletons render as Skeleton components
    expect(screen.queryByText('Suporte')).not.toBeInTheDocument();
  });

  it('shows no agents message when queue has no members', () => {
    render(<QueuesView />);
    expect(screen.getByText('Nenhum atendente')).toBeInTheDocument();
  });

  it('renders agent avatar for queues with members', () => {
    render(<QueuesView />);
    // Agent A avatar fallback
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders Dashboard SLA button', () => {
    render(<QueuesView />);
    expect(screen.getByText('Dashboard SLA')).toBeInTheDocument();
  });

  it('renders Comparar Filas button', () => {
    render(<QueuesView />);
    expect(screen.getByText('Comparar Filas')).toBeInTheDocument();
  });

  it('navigates to SLA dashboard on button click', () => {
    render(<QueuesView />);
    fireEvent.click(screen.getByText('Dashboard SLA'));
    expect(mockNavigate).toHaveBeenCalledWith('/sla');
  });

  it('navigates to comparison dashboard on button click', () => {
    render(<QueuesView />);
    fireEvent.click(screen.getByText('Comparar Filas'));
    expect(mockNavigate).toHaveBeenCalledWith('/queues/comparison');
  });

  it('renders Aguardando and Atendentes labels', () => {
    render(<QueuesView />);
    const aguardando = screen.getAllByText('Aguardando');
    const atendentes = screen.getAllByText('Atendentes');
    expect(aguardando.length).toBeGreaterThanOrEqual(2);
    expect(atendentes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders with empty queues list', () => {
    mockQueuesData.length = 0;
    render(<QueuesView />);
    expect(screen.getByText('Adicionar Nova Fila')).toBeInTheDocument();
  });

  it('renders max wait time section', () => {
    render(<QueuesView />);
    const maxWait = screen.getAllByText('Tempo máximo de espera');
    expect(maxWait.length).toBe(2);
  });
});
