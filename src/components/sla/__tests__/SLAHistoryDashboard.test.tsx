/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const mockUseSLAHistory = vi.fn();

vi.mock('@/hooks/useSLAHistory', () => ({
  useSLAHistory: (...args: any[]) => mockUseSLAHistory(...args),
}));

vi.mock('@/components/reports/ExportButton', () => ({
  ExportButton: () => <button data-testid="export-btn">Export</button>,
}));

// Mock recharts
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
}));

import { SLAHistoryDashboard } from '../SLAHistoryDashboard';

const emptyData = {
  dailyData: [],
  totals: { firstResponseBreaches: 0, resolutionBreaches: 0, totalBreaches: 0, totalConversations: 0, overallSLARate: 100 },
  trends: {
    firstResponse: { direction: 'stable', percentage: 0 },
    resolution: { direction: 'stable', percentage: 0 },
    overall: { direction: 'stable', percentage: 0 },
  },
  worstDays: [],
  bestDays: [],
};

const populatedData = {
  dailyData: [
    { date: '2024-01-01', dateLabel: '01 Jan', firstResponseBreaches: 2, resolutionBreaches: 1, totalBreaches: 3, totalConversations: 10, slaRate: 85 },
    { date: '2024-01-02', dateLabel: '02 Jan', firstResponseBreaches: 0, resolutionBreaches: 0, totalBreaches: 0, totalConversations: 8, slaRate: 100 },
  ],
  totals: { firstResponseBreaches: 2, resolutionBreaches: 1, totalBreaches: 3, totalConversations: 18, overallSLARate: 91.7 },
  trends: {
    firstResponse: { direction: 'down', percentage: 50 },
    resolution: { direction: 'stable', percentage: 0 },
    overall: { direction: 'up', percentage: 10 },
  },
  worstDays: [
    { date: '2024-01-01', dateLabel: '01 Jan', firstResponseBreaches: 2, resolutionBreaches: 1, totalBreaches: 3, totalConversations: 10, slaRate: 85 },
  ],
  bestDays: [
    { date: '2024-01-02', dateLabel: '02 Jan', firstResponseBreaches: 0, resolutionBreaches: 0, totalBreaches: 0, totalConversations: 8, slaRate: 100 },
  ],
};

describe('SLAHistoryDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loading', () => {
    mockUseSLAHistory.mockReturnValue({ data: null, loading: true });
    render(<SLAHistoryDashboard />);
    expect(document.querySelector('[class*="skeleton"], [class*="Skeleton"]')).toBeTruthy();
  });

  it('renders dashboard content after loading', async () => {
    mockUseSLAHistory.mockReturnValue({ data: emptyData, loading: false });
    render(<SLAHistoryDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('SLA');
    });
  });

  it('renders period selection buttons', () => {
    mockUseSLAHistory.mockReturnValue({ data: emptyData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(screen.getByText('7 dias')).toBeInTheDocument();
    expect(screen.getByText('30 dias')).toBeInTheDocument();
  });

  it('renders export button', () => {
    mockUseSLAHistory.mockReturnValue({ data: emptyData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(screen.getByTestId('export-btn')).toBeInTheDocument();
  });

  it('displays zero breaches for empty data', () => {
    mockUseSLAHistory.mockReturnValue({ data: emptyData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('0');
  });

  it('renders charts with data', () => {
    mockUseSLAHistory.mockReturnValue({ data: populatedData, loading: false });
    render(<SLAHistoryDashboard />);
    const charts = screen.getAllByTestId('chart-container');
    expect(charts.length).toBeGreaterThan(0);
  });

  it('displays breach totals from populated data', () => {
    mockUseSLAHistory.mockReturnValue({ data: populatedData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('2');
  });

  it('renders trend indicators', () => {
    mockUseSLAHistory.mockReturnValue({ data: populatedData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('50.0%');
  });

  it('handles null data gracefully', () => {
    mockUseSLAHistory.mockReturnValue({ data: null, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('passes period to hook', () => {
    mockUseSLAHistory.mockReturnValue({ data: emptyData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(mockUseSLAHistory).toHaveBeenCalled();
  });

  it('renders worst days section', () => {
    mockUseSLAHistory.mockReturnValue({ data: populatedData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('01 Jan');
  });

  it('renders best days section', () => {
    mockUseSLAHistory.mockReturnValue({ data: populatedData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('02 Jan');
  });

  it('handles stable trend display', () => {
    const stableData = {
      ...populatedData,
      trends: {
        firstResponse: { direction: 'stable', percentage: 0 },
        resolution: { direction: 'stable', percentage: 0 },
        overall: { direction: 'stable', percentage: 0 },
      },
    };
    mockUseSLAHistory.mockReturnValue({ data: stableData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toContain('0.0%');
  });

  it('handles large dataset in daily data', () => {
    const largeDailyData = Array.from({ length: 90 }, (_, i) => ({
      date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
      dateLabel: `${(i % 30) + 1} Jan`,
      firstResponseBreaches: i % 5,
      resolutionBreaches: i % 3,
      totalBreaches: (i % 5) + (i % 3),
      totalConversations: 10 + i,
      slaRate: 85 + (i % 15),
    }));
    const largeData = { ...populatedData, dailyData: largeDailyData };
    mockUseSLAHistory.mockReturnValue({ data: largeData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('handles zero total conversations', () => {
    const zeroData = {
      ...emptyData,
      totals: { ...emptyData.totals, totalConversations: 0 },
    };
    mockUseSLAHistory.mockReturnValue({ data: zeroData, loading: false });
    render(<SLAHistoryDashboard />);
    expect(document.body.textContent).toBeTruthy();
  });
});
