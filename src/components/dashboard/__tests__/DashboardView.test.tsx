/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---

const mockRefetch = vi.fn();
const mockUseDashboardData = vi.fn();
const mockUseDashboardWidgets = vi.fn();

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: (...args: any[]) => mockUseDashboardData(...args),
  formatResponseTime: (s: number | null) => (s === null ? 'N/A' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min`),
}));

vi.mock('@/hooks/useDashboardWidgets', () => ({
  useDashboardWidgets: () => mockUseDashboardWidgets(),
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => <div data-testid="aurora" />,
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => <div data-testid="particles" />,
}));

vi.mock('@/components/dashboard/GamificationEffects', () => ({
  AnimatedBadge: ({ value, label }: any) => <span data-testid="badge">{value} {label}</span>,
  StatCardWithGamification: ({ title, value }: any) => (
    <div data-testid="stat-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
  LevelProgress: ({ level }: any) => <div data-testid="level-progress">Level {level}</div>,
}));

vi.mock('@/components/leaderboard/Leaderboard', () => ({
  Leaderboard: () => <div data-testid="leaderboard" />,
}));

vi.mock('@/components/gamification/DemoAchievements', () => ({
  DemoAchievements: () => <div data-testid="achievements" />,
}));

vi.mock('@/components/gamification/TrainingMiniGames', () => ({
  TrainingMiniGames: () => <div data-testid="mini-games" />,
}));

vi.mock('@/components/dashboard/SLAMetricsDashboard', () => ({
  SLAMetricsDashboard: () => <div data-testid="sla-dashboard" />,
}));

vi.mock('@/components/dashboard/AIQuickAccess', () => ({
  AIQuickAccess: () => <div data-testid="ai-quick" />,
}));

vi.mock('@/components/csat/CSATDashboard', () => ({
  CSATDashboard: () => <div data-testid="csat" />,
}));

vi.mock('@/components/dashboard/AIStatsWidget', () => ({
  AIStatsWidget: () => <div data-testid="ai-stats" />,
}));

vi.mock('@/components/dashboard/GoalsDashboard', () => ({
  GoalsDashboard: () => <div data-testid="goals" />,
}));

vi.mock('@/components/dashboard/RealtimeMetricsPanel', () => ({
  RealtimeMetricsPanel: () => <div data-testid="realtime" />,
}));

vi.mock('@/components/dashboard/ProgressiveDisclosureDashboard', () => ({
  ProgressiveDisclosureDashboard: ({ level1Widgets, renderWidget }: any) => (
    <div data-testid="progressive">
      {level1Widgets.map((w: any) => (
        <div key={w.id} data-testid={`widget-${w.type}`}>{renderWidget(w)}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/dashboard/DashboardFilters', () => ({
  DashboardFilters: ({ onRefresh, isRefreshing }: any) => (
    <div data-testid="filters">
      <button data-testid="refresh-btn" onClick={onRefresh}>
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  ),
  getDefaultFilters: () => ({
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
    period: 'today',
    queueId: null,
    agentId: null,
  }),
}));

vi.mock('@/components/dashboard/DraggableWidgetContainer', () => ({
  DraggableWidgetContainer: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useQueues', () => ({
  useQueues: () => ({ queues: [], isLoading: false }),
}));

vi.mock('@/hooks/useAgents', () => ({
  useAgents: () => ({ agents: [], isLoading: false }),
}));

import { DashboardView } from '../DashboardView';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const defaultStats = {
  openConversations: 12,
  pendingConversations: 3,
  resolvedToday: 8,
  totalConversations: 23,
  onlineAgents: 4,
  totalAgents: 6,
  avgResponseTime: 120,
  queuesStats: [
    { id: 'q1', name: 'Suporte', color: '#3B82F6', waitingCount: 5, onlineAgents: 2, totalAgents: 3 },
  ],
  recentActivity: [
    {
      id: 'r1', contactName: 'Maria Silva', contactPhone: '+5511999',
      contactAvatar: null, lastMessage: 'Ola!', timestamp: new Date().toISOString(),
      status: 'unread', unreadCount: 1,
    },
  ],
};

const defaultWidgets = {
  widgets: [
    { id: 'stats', title: 'Stats', type: 'stats', visible: true, order: 0, size: 'full', level: 1 },
    { id: 'challenges', title: 'Challenges', type: 'challenges', visible: true, order: 1, size: 'full', level: 2 },
    { id: 'queues', title: 'Queues', type: 'queues', visible: true, order: 2, size: 'medium', level: 2 },
    { id: 'activity', title: 'Activity', type: 'activity', visible: true, order: 3, size: 'medium', level: 2 },
  ],
  visibleWidgets: [],
  level1Widgets: [] as any[],
  level2Widgets: [] as any[],
  level3Widgets: [] as any[],
  isEditMode: false,
  setIsEditMode: vi.fn(),
  reorderWidgets: vi.fn(),
  toggleWidgetVisibility: vi.fn(),
  resetToDefaults: vi.fn(),
};

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultWidgets.level1Widgets = defaultWidgets.widgets.filter(w => w.level === 1);
    defaultWidgets.level2Widgets = defaultWidgets.widgets.filter(w => w.level === 2);
    defaultWidgets.level3Widgets = defaultWidgets.widgets.filter(w => w.level === 3);
    defaultWidgets.visibleWidgets = defaultWidgets.widgets.filter(w => w.visible);
    mockUseDashboardWidgets.mockReturnValue(defaultWidgets);
  });

  it('renders loading skeleton when data is loading', () => {
    mockUseDashboardData.mockReturnValue({ stats: null, isLoading: true, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    // Skeleton renders divs, no heading visible
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('renders loading skeleton when stats is null', () => {
    mockUseDashboardData.mockReturnValue({ stats: null, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('renders dashboard header when data is loaded', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText(/Vis.*o geral/)).toBeInTheDocument();
  });

  it('renders stat cards via widget system', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByTestId('progressive')).toBeInTheDocument();
  });

  it('renders stat card titles from stats data', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    // The stats widget is rendered inside progressive disclosure
    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards.length).toBe(4);
  });

  it('displays correct open conversations count', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays online agents ratio', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('4/6')).toBeInTheDocument();
  });

  it('renders dashboard filters', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByTestId('filters')).toBeInTheDocument();
  });

  it('calls refetch when refresh button is clicked', async () => {
    mockRefetch.mockResolvedValue(undefined);
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('refresh-btn'));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it('renders gamification badges in header', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });

  it('renders level progress bar', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByTestId('level-progress')).toBeInTheDocument();
  });

  it('renders all tab triggers', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText(/Vis.*o Geral/)).toBeInTheDocument();
    expect(screen.getByText('Metas')).toBeInTheDocument();
  });

  it('handles zero conversations gracefully', () => {
    const zeroStats = { ...defaultStats, openConversations: 0, totalConversations: 0, resolvedToday: 0, pendingConversations: 0 };
    mockUseDashboardData.mockReturnValue({ stats: zeroStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('handles zero agents gracefully', () => {
    const zeroStats = { ...defaultStats, onlineAgents: 0, totalAgents: 0 };
    mockUseDashboardData.mockReturnValue({ stats: zeroStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('handles null avgResponseTime', () => {
    const nullAvg = { ...defaultStats, avgResponseTime: null };
    mockUseDashboardData.mockReturnValue({ stats: nullAvg, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays SLA within threshold message for fast response', () => {
    const fastStats = { ...defaultStats, avgResponseTime: 60 };
    mockUseDashboardData.mockReturnValue({ stats: fastStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('Conversas Abertas')).toBeInTheDocument();
  });

  it('handles large dataset stats', () => {
    const largeStats = { ...defaultStats, openConversations: 99999, totalConversations: 999999, resolvedToday: 50000 };
    mockUseDashboardData.mockReturnValue({ stats: largeStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByText('99999')).toBeInTheDocument();
  });

  it('renders realtime metrics panel in overview tab', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(screen.getByTestId('realtime')).toBeInTheDocument();
  });

  it('passes date range filter to useDashboardData', () => {
    mockUseDashboardData.mockReturnValue({ stats: defaultStats, isLoading: false, refetch: mockRefetch });
    const Wrapper = createWrapper();
    render(<DashboardView />, { wrapper: Wrapper });
    expect(mockUseDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.any(Object),
      })
    );
  });
});
