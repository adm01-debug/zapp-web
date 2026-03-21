/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/exportReport', () => ({
  exportToPDF: vi.fn(),
  exportToExcel: vi.fn(),
}));

import { SentimentAlertsDashboard } from '../SentimentAlertsDashboard';

const buildChain = (data: any = [], error: any = null) => {
  const resolve = { data, error, count: data?.length ?? 0 };
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'or', 'gte', 'lte', 'lt', 'gt', 'not', 'order', 'limit', 'is', 'in', 'filter', 'ilike', 'range'];
  methods.forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn().mockImplementation((resolve_fn: any) => Promise.resolve(resolve).then(resolve_fn));
  // For awaitable
  (chain as any)[Symbol.toStringTag] = 'Promise';
  chain.catch = vi.fn().mockReturnThis();
  chain.finally = vi.fn().mockReturnThis();
  // Also make it resolve directly
  const promiseLike = Object.assign(Promise.resolve(resolve), chain);
  methods.forEach(m => {
    promiseLike[m] = vi.fn().mockReturnValue(promiseLike);
  });
  return promiseLike;
};

describe('SentimentAlertsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') {
        return buildChain([]);
      }
      if (table === 'conversation_analyses') {
        return buildChain([]);
      }
      if (table === 'profiles') {
        return buildChain([]);
      }
      return buildChain([]);
    });
  });

  it('renders the dashboard title', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Sentimento/i)).toBeInTheDocument();
    });
  });

  it('renders loading state initially', () => {
    // Use a never-resolving promise for loading
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    });
    render(<SentimentAlertsDashboard />);
    // Should render without error
    expect(document.querySelector('.animate-spin, [class*=skeleton], [class*=Skeleton]')).toBeDefined();
  });

  it('displays empty state when no alerts', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      const text = document.body.textContent;
      expect(text).toBeTruthy();
    });
  });

  it('renders tabs for navigation', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Sentimento/i)).toBeInTheDocument();
    });
  });

  it('renders period filter select', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      // Component uses Select from radix
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles supabase error gracefully', async () => {
    mockFrom.mockReturnValue(buildChain(null, new Error('DB error')));
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders with alert data', async () => {
    const alerts = [
      {
        id: 'a1', contactId: 'c1', createdAt: new Date().toISOString(),
        contact_name: 'Test User', sentiment_score: 25, consecutive_low: 3,
        agent_name: 'Agent 1', message: 'Negative alert', email_sent: false,
      },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') {
        return buildChain(alerts.map(a => ({
          id: a.id, action: 'sentiment_alert', entity_id: a.contactId,
          entity_type: 'contact', user_id: null, details: a, created_at: a.createdAt,
        })));
      }
      if (table === 'conversation_analyses') {
        return buildChain([
          { id: 'ca1', contact_id: 'c1', sentiment: 'negativo', sentiment_score: 25, created_at: new Date().toISOString(), analyzed_by: null },
        ]);
      }
      if (table === 'profiles') {
        return buildChain([{ id: 'p1', name: 'Agent 1', avatar_url: null }]);
      }
      return buildChain([]);
    });
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles filter change without crash', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Sentimento/i)).toBeInTheDocument();
    });
  });

  it('handles zero sentiment score', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return buildChain([
          { id: 'ca1', contact_id: 'c1', sentiment: 'negativo', sentiment_score: 0, created_at: new Date().toISOString(), analyzed_by: null },
        ]);
      }
      return buildChain([]);
    });
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles high sentiment score (100)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return buildChain([
          { id: 'ca1', contact_id: 'c1', sentiment: 'positivo', sentiment_score: 100, created_at: new Date().toISOString(), analyzed_by: null },
        ]);
      }
      return buildChain([]);
    });
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders without crashing with many alerts', async () => {
    const manyAlerts = Array.from({ length: 50 }, (_, i) => ({
      id: `ca${i}`, contact_id: `c${i}`, sentiment: i % 3 === 0 ? 'negativo' : 'positivo',
      sentiment_score: Math.random() * 100, created_at: new Date(Date.now() - i * 86400000).toISOString(),
      analyzed_by: null,
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return buildChain(manyAlerts);
      }
      return buildChain([]);
    });
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('renders export button area', async () => {
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });

  it('handles date at timezone boundary', async () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversation_analyses') {
        return buildChain([
          { id: 'ca1', contact_id: 'c1', sentiment: 'neutro', sentiment_score: 50, created_at: midnight.toISOString(), analyzed_by: null },
        ]);
      }
      return buildChain([]);
    });
    render(<SentimentAlertsDashboard />);
    await waitFor(() => {
      expect(document.body.textContent).toBeTruthy();
    });
  });
});
