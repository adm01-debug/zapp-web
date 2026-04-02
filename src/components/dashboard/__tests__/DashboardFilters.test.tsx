/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks
vi.mock('@/hooks/useQueues', () => ({
  useQueues: () => ({
    queues: [
      { id: 'q1', name: 'Suporte', color: '#3B82F6' },
      { id: 'q2', name: 'Vendas', color: '#10B981' },
    ],
  }),
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [
      { id: 'a1', name: 'Ana' },
      { id: 'a2', name: 'Bruno' },
    ],
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  },
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <>{children}</>,
  PopoverTrigger: React.forwardRef(({ children, asChild }: any, _ref: any) => asChild ? children : <span>{children}</span>),
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

import { DashboardFilters, getDefaultFilters } from '../DashboardFilters';

describe('DashboardFilters', () => {
  const defaultFilters = getDefaultFilters();
  let onFiltersChange: ReturnType<typeof vi.fn>;
  let onRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onFiltersChange = vi.fn();
    onRefresh = vi.fn();
  });

  it('renders period selector and filter controls', () => {
    render(
      <DashboardFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
      />
    );
    // Period selector should be present
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh is provided', () => {
    render(
      <DashboardFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        onRefresh={onRefresh}
      />
    );
    const refreshBtn = screen.getAllByRole('button').find(
      (b) => b.querySelector('svg.w-4.h-4')
    );
    expect(refreshBtn).toBeDefined();
  });

  it('does not render refresh button when onRefresh is omitted', () => {
    const { container } = render(
      <DashboardFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
      />
    );
    // No spinning refresh icon
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('shows active filters badge when filters are applied', () => {
    render(
      <DashboardFilters
        filters={{ ...defaultFilters, queueId: 'q1' }}
        onFiltersChange={onFiltersChange}
      />
    );
    expect(screen.getByText(/1 filtro/)).toBeInTheDocument();
  });

  it('shows plural filter count for multiple active filters', () => {
    render(
      <DashboardFilters
        filters={{ ...defaultFilters, queueId: 'q1', agentId: 'a1', period: 'week', dateRange: defaultFilters.dateRange }}
        onFiltersChange={onFiltersChange}
      />
    );
    expect(screen.getByText(/filtros/)).toBeInTheDocument();
  });

  it('clears filters when active filters badge is clicked', () => {
    render(
      <DashboardFilters
        filters={{ ...defaultFilters, queueId: 'q1' }}
        onFiltersChange={onFiltersChange}
      />
    );
    fireEvent.click(screen.getByText(/1 filtro/));
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const resetFilters = onFiltersChange.mock.calls[0][0];
    expect(resetFilters.queueId).toBeNull();
    expect(resetFilters.agentId).toBeNull();
    expect(resetFilters.period).toBe('today');
  });

  it('getDefaultFilters returns correct defaults', () => {
    const filters = getDefaultFilters();
    expect(filters.period).toBe('today');
    expect(filters.queueId).toBeNull();
    expect(filters.agentId).toBeNull();
    expect(filters.dateRange.from).toBeInstanceOf(Date);
    expect(filters.dateRange.to).toBeInstanceOf(Date);
  });
});
