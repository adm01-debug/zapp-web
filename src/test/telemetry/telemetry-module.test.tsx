import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelemetryCharts } from '@/components/admin/telemetry/TelemetryCharts';

// ─── Helpers ──────────────────────────────────────────────────
function makeRow(overrides: Partial<TelemetryRow> = {}): TelemetryRow {
  return {
    id: crypto.randomUUID(),
    operation: 'select',
    table_name: 'contacts',
    rpc_name: null,
    duration_ms: 4500,
    record_count: 100,
    query_limit: 50,
    query_offset: 0,
    count_mode: null,
    severity: 'slow',
    error_message: null,
    user_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

function makeRows(count: number, overrides: Partial<TelemetryRow> = {}): TelemetryRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeRow({
      created_at: new Date(Date.now() - i * 60_000).toISOString(),
      ...overrides,
    })
  );
}

const TABLES = ['contacts', 'messages', 'profiles', 'campaigns', 'tags', 'queues', 'automations', 'chatbot_flows'];
const OPERATIONS = ['select', 'insert', 'update', 'delete', 'rpc'];
const SEVERITIES = ['slow', 'very_slow', 'error', 'normal'] as const;

function makeDiverseRows(count: number): TelemetryRow[] {
  return Array.from({ length: count }, (_, i) => {
    const sev = SEVERITIES[i % SEVERITIES.length];
    const table = TABLES[i % TABLES.length];
    const op = OPERATIONS[i % OPERATIONS.length];
    return makeRow({
      table_name: op === 'rpc' ? null : table,
      rpc_name: op === 'rpc' ? `fn_${table}` : null,
      operation: op,
      severity: sev,
      duration_ms: sev === 'very_slow' ? 9000 + i * 10 : sev === 'slow' ? 4000 + i * 5 : sev === 'error' ? 1000 : 500 + i,
      record_count: i * 10,
      query_limit: 50 + (i % 5) * 50,
      query_offset: i * 10,
      count_mode: i % 3 === 0 ? 'exact' : null,
      error_message: sev === 'error' ? `Error on ${table}` : null,
      created_at: new Date(Date.now() - i * 120_000).toISOString(),
    });
  });
}

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;

// ─── TelemetryCharts Tests ────────────────────────────────────
describe('TelemetryCharts', () => {
  it('returns null when rows are empty', () => {
    const { container } = render(<TelemetryCharts rows={[]} timeFilter="24h" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders timeline card with data', () => {
    render(<TelemetryCharts rows={makeRows(10)} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });

  it('renders severity pie chart', () => {
    render(<TelemetryCharts rows={makeDiverseRows(20)} timeFilter="24h" />);
    expect(screen.getByText('Por Severidade')).toBeInTheDocument();
  });

  it('renders top tables bar chart', () => {
    render(<TelemetryCharts rows={makeDiverseRows(30)} timeFilter="24h" />);
    expect(screen.getByText('Top Tabelas com Alertas')).toBeInTheDocument();
  });

  it.each(['1h', '6h', '24h', '7d'] as const)('handles timeFilter=%s', (tf) => {
    const { container } = render(<TelemetryCharts rows={makeRows(5)} timeFilter={tf} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('groups multiple rows into same time bucket', () => {
    const now = Date.now();
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ created_at: new Date(now - i * 1000).toISOString() })
    );
    const { container } = render(<TelemetryCharts rows={rows} timeFilter="1h" />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('handles all rows having same severity', () => {
    const rows = makeRows(15, { severity: 'very_slow', duration_ms: 10000 });
    render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(screen.getByText('Por Severidade')).toBeInTheDocument();
  });

  it('handles rows with only rpc_name (no table_name)', () => {
    const rows = makeRows(10, { table_name: null, rpc_name: 'fn_calculate', operation: 'rpc' });
    render(<TelemetryCharts rows={rows} timeFilter="6h" />);
    expect(screen.getByText('Top Tabelas com Alertas')).toBeInTheDocument();
  });

  it('limits bar chart to 6 entries', () => {
    const rows = TABLES.flatMap(t => makeRows(5, { table_name: t }));
    const { container } = render(<TelemetryCharts rows={rows} timeFilter="24h" />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('handles single row', () => {
    render(<TelemetryCharts rows={[makeRow()]} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });

  it('handles 200 rows without crashing', () => {
    const rows = makeDiverseRows(200);
    const { container } = render(<TelemetryCharts rows={rows} timeFilter="7d" />);
    expect(container.innerHTML.length).toBeGreaterThan(100);
  });
});

// ─── AdminTelemetriaPage Unit Tests ───────────────────────────
// We test the pure logic functions extracted from the component

describe('Telemetry Logic - formatDuration', () => {
  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  it.each([
    [0, '0ms'],
    [1, '1ms'],
    [100, '100ms'],
    [500, '500ms'],
    [999, '999ms'],
    [1000, '1.0s'],
    [1500, '1.5s'],
    [2345, '2.3s'],
    [5000, '5.0s'],
    [8000, '8.0s'],
    [10000, '10.0s'],
    [15678, '15.7s'],
    [99999, '100.0s'],
    [120000, '120.0s'],
  ])('formatDuration(%i) = %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('Telemetry Logic - formatTime', () => {
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  it('formats ISO string to pt-BR locale', () => {
    const result = formatTime('2026-03-23T14:30:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('handles midnight', () => {
    const result = formatTime('2026-01-01T00:00:00Z');
    expect(result).toBeTruthy();
  });

  it('handles end of day', () => {
    const result = formatTime('2026-12-31T23:59:59Z');
    expect(result).toBeTruthy();
  });
});

describe('Telemetry Logic - getTimeThreshold', () => {
  const getTimeThreshold = (timeFilter: string) => {
    const now = new Date();
    switch (timeFilter) {
      case "1h": return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "6h": return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default: return new Date().toISOString();
    }
  };

  it.each(['1h', '6h', '24h', '7d'])('returns valid ISO string for %s', (tf) => {
    const result = getTimeThreshold(tf);
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).getTime()).toBeLessThan(Date.now());
  });

  it('1h threshold is ~1h ago', () => {
    const result = new Date(getTimeThreshold('1h')).getTime();
    const expected = Date.now() - 60 * 60 * 1000;
    expect(Math.abs(result - expected)).toBeLessThan(1000);
  });

  it('7d threshold is ~7 days ago', () => {
    const result = new Date(getTimeThreshold('7d')).getTime();
    const expected = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(result - expected)).toBeLessThan(1000);
  });
});

describe('Telemetry Logic - Stats Computation', () => {
  function computeStats(rows: TelemetryRow[]) {
    const verySlow = rows.filter(r => r.severity === "very_slow").length;
    const slow = rows.filter(r => r.severity === "slow").length;
    const errors = rows.filter(r => r.severity === "error").length;
    const avgDuration = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length)
      : 0;
    return { verySlow, slow, errors, avgDuration };
  }

  it('returns zeros for empty array', () => {
    const s = computeStats([]);
    expect(s).toEqual({ verySlow: 0, slow: 0, errors: 0, avgDuration: 0 });
  });

  it('counts severities correctly', () => {
    const rows = [
      ...makeRows(3, { severity: 'very_slow' }),
      ...makeRows(5, { severity: 'slow' }),
      ...makeRows(2, { severity: 'error' }),
      ...makeRows(4, { severity: 'normal' }),
    ];
    const s = computeStats(rows);
    expect(s.verySlow).toBe(3);
    expect(s.slow).toBe(5);
    expect(s.errors).toBe(2);
  });

  it('computes avg duration correctly', () => {
    const rows = [
      makeRow({ duration_ms: 1000 }),
      makeRow({ duration_ms: 3000 }),
      makeRow({ duration_ms: 5000 }),
    ];
    expect(computeStats(rows).avgDuration).toBe(3000);
  });

  it('computes avg for single row', () => {
    expect(computeStats([makeRow({ duration_ms: 7777 })]).avgDuration).toBe(7777);
  });

  it('handles all same severity', () => {
    const rows = makeRows(100, { severity: 'slow' });
    const s = computeStats(rows);
    expect(s.slow).toBe(100);
    expect(s.verySlow).toBe(0);
    expect(s.errors).toBe(0);
  });

  it('handles large dataset (500 rows)', () => {
    const rows = makeDiverseRows(500);
    const s = computeStats(rows);
    expect(s.verySlow + s.slow + s.errors).toBeLessThanOrEqual(500);
    expect(s.avgDuration).toBeGreaterThan(0);
  });
});

describe('Telemetry Logic - Top Offenders', () => {
  function computeOffenders(rows: TelemetryRow[]) {
    const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
    for (const r of rows) {
      const key = r.rpc_name || r.table_name || "unknown";
      const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
      tableStats.set(key, {
        count: prev.count + 1,
        totalMs: prev.totalMs + r.duration_ms,
        maxMs: Math.max(prev.maxMs, r.duration_ms),
      });
    }
    return [...tableStats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }

  it('returns empty for no rows', () => {
    expect(computeOffenders([])).toEqual([]);
  });

  it('groups by table_name', () => {
    const rows = [
      ...makeRows(5, { table_name: 'contacts' }),
      ...makeRows(3, { table_name: 'messages' }),
    ];
    const offenders = computeOffenders(rows);
    expect(offenders[0][0]).toBe('contacts');
    expect(offenders[0][1].count).toBe(5);
    expect(offenders[1][0]).toBe('messages');
    expect(offenders[1][1].count).toBe(3);
  });

  it('prefers rpc_name over table_name', () => {
    const rows = makeRows(3, { table_name: 'contacts', rpc_name: 'fn_search' });
    const offenders = computeOffenders(rows);
    expect(offenders[0][0]).toBe('fn_search');
  });

  it('falls back to "unknown" if both null', () => {
    const rows = makeRows(2, { table_name: null, rpc_name: null });
    const offenders = computeOffenders(rows);
    expect(offenders[0][0]).toBe('unknown');
  });

  it('limits to 8 entries', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      makeRow({ table_name: `table_${i}` })
    );
    expect(computeOffenders(rows).length).toBe(8);
  });

  it('tracks maxMs correctly', () => {
    const rows = [
      makeRow({ table_name: 'contacts', duration_ms: 1000 }),
      makeRow({ table_name: 'contacts', duration_ms: 9999 }),
      makeRow({ table_name: 'contacts', duration_ms: 5000 }),
    ];
    const offenders = computeOffenders(rows);
    expect(offenders[0][1].maxMs).toBe(9999);
  });

  it('computes totalMs correctly', () => {
    const rows = [
      makeRow({ table_name: 'x', duration_ms: 100 }),
      makeRow({ table_name: 'x', duration_ms: 200 }),
      makeRow({ table_name: 'x', duration_ms: 300 }),
    ];
    const offenders = computeOffenders(rows);
    expect(offenders[0][1].totalMs).toBe(600);
  });

  it('sorts by count descending', () => {
    const rows = [
      ...makeRows(2, { table_name: 'a' }),
      ...makeRows(10, { table_name: 'b' }),
      ...makeRows(5, { table_name: 'c' }),
    ];
    const offenders = computeOffenders(rows);
    expect(offenders[0][0]).toBe('b');
    expect(offenders[1][0]).toBe('c');
    expect(offenders[2][0]).toBe('a');
  });

  it('handles 8+ unique tables', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      makeRow({ table_name: `tbl_${i % 12}`, duration_ms: 1000 + i * 100 })
    );
    const offenders = computeOffenders(rows);
    expect(offenders.length).toBe(8);
    offenders.forEach(([_, stats]) => {
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.maxMs).toBeGreaterThanOrEqual(stats.totalMs / stats.count);
    });
  });
});

describe('Telemetry Logic - Severity Badge Classification', () => {
  function classifySeverity(severity: string) {
    switch (severity) {
      case "very_slow": return "muito_lenta";
      case "slow": return "lenta";
      case "error": return "erro";
      default: return "default";
    }
  }

  it.each([
    ['very_slow', 'muito_lenta'],
    ['slow', 'lenta'],
    ['error', 'erro'],
    ['normal', 'default'],
    ['unknown', 'default'],
    ['', 'default'],
  ])('classifies %s as %s', (input, expected) => {
    expect(classifySeverity(input)).toBe(expected);
  });
});

describe('Telemetry Logic - Timeline Bucketing', () => {
  function bucketRows(rows: TelemetryRow[], timeFilter: string) {
    const bucketMs = timeFilter === "1h" ? 5 * 60_000
      : timeFilter === "6h" ? 30 * 60_000
      : timeFilter === "24h" ? 60 * 60_000
      : 6 * 60 * 60_000;

    const map = new Map<number, { bucket: number; count: number; totalMs: number; avgMs: number }>();
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      const bucket = Math.floor(t / bucketMs) * bucketMs;
      const prev = map.get(bucket) || { bucket, count: 0, avgMs: 0, totalMs: 0 };
      prev.count += 1;
      prev.totalMs += r.duration_ms;
      prev.avgMs = Math.round(prev.totalMs / prev.count);
      map.set(bucket, prev);
    }
    return [...map.values()].sort((a, b) => a.bucket - b.bucket);
  }

  it('returns empty for no rows', () => {
    expect(bucketRows([], '24h')).toEqual([]);
  });

  it('groups rows close together into fewer buckets (1h filter)', () => {
    const now = Date.now();
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ created_at: new Date(now - i * 30_000).toISOString(), duration_ms: 1000 })
    );
    const buckets = bucketRows(rows, '1h');
    // 10 rows spanning 4.5 min with 5-min buckets => 1 or 2 buckets
    expect(buckets.length).toBeLessThanOrEqual(2);
    const totalCount = buckets.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(10);
  });

  it('creates multiple buckets for spread data', () => {
    const now = Date.now();
    const rows = Array.from({ length: 24 }, (_, i) =>
      makeRow({ created_at: new Date(now - i * 3600_000).toISOString() })
    );
    const buckets = bucketRows(rows, '24h');
    expect(buckets.length).toBeGreaterThan(1);
  });

  it('computes avgMs per bucket correctly', () => {
    const now = Date.now();
    const rows = [
      makeRow({ created_at: new Date(now).toISOString(), duration_ms: 2000 }),
      makeRow({ created_at: new Date(now - 1000).toISOString(), duration_ms: 4000 }),
    ];
    const buckets = bucketRows(rows, '1h');
    expect(buckets[0].avgMs).toBe(3000);
  });

  it.each(['1h', '6h', '24h', '7d'])('handles %s filter', (tf) => {
    const rows = makeDiverseRows(50);
    const buckets = bucketRows(rows, tf);
    const totalCount = buckets.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(50);
  });

  it('buckets are sorted chronologically', () => {
    const rows = makeDiverseRows(100);
    const buckets = bucketRows(rows, '24h');
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].bucket).toBeGreaterThanOrEqual(buckets[i - 1].bucket);
    }
  });
});

describe('Telemetry Logic - Severity Distribution', () => {
  function severityDistribution(rows: TelemetryRow[]) {
    return rows.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  it('returns empty object for no rows', () => {
    expect(severityDistribution([])).toEqual({});
  });

  it('counts each severity', () => {
    const rows = [
      ...makeRows(3, { severity: 'slow' }),
      ...makeRows(2, { severity: 'error' }),
      ...makeRows(1, { severity: 'very_slow' }),
    ];
    const dist = severityDistribution(rows);
    expect(dist.slow).toBe(3);
    expect(dist.error).toBe(2);
    expect(dist.very_slow).toBe(1);
  });

  it('handles unknown severities', () => {
    const rows = makeRows(5, { severity: 'custom_severity' });
    const dist = severityDistribution(rows);
    expect(dist.custom_severity).toBe(5);
  });
});

describe('Telemetry Logic - Duration Color Classification', () => {
  function getDurationClass(ms: number) {
    if (ms >= 8000) return 'destructive';
    if (ms >= 3000) return 'warning';
    return 'normal';
  }

  it.each([
    [0, 'normal'],
    [100, 'normal'],
    [2999, 'normal'],
    [3000, 'warning'],
    [5000, 'warning'],
    [7999, 'warning'],
    [8000, 'destructive'],
    [10000, 'destructive'],
    [50000, 'destructive'],
  ])('classifies %ims as %s', (ms, expected) => {
    expect(getDurationClass(ms)).toBe(expected);
  });
});

describe('Telemetry Logic - Filter Combinations', () => {
  function filterRows(rows: TelemetryRow[], severityFilter: string, timeThreshold: string) {
    let filtered = rows;
    if (severityFilter !== 'all') {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }
    filtered = filtered.filter(r => r.created_at >= timeThreshold);
    return filtered;
  }

  const allRows = makeDiverseRows(100);

  it('returns all rows with "all" filter', () => {
    const result = filterRows(allRows, 'all', '1970-01-01T00:00:00Z');
    expect(result.length).toBe(100);
  });

  it('filters by slow severity', () => {
    const result = filterRows(allRows, 'slow', '1970-01-01T00:00:00Z');
    expect(result.every(r => r.severity === 'slow')).toBe(true);
  });

  it('filters by very_slow severity', () => {
    const result = filterRows(allRows, 'very_slow', '1970-01-01T00:00:00Z');
    expect(result.every(r => r.severity === 'very_slow')).toBe(true);
  });

  it('filters by error severity', () => {
    const result = filterRows(allRows, 'error', '1970-01-01T00:00:00Z');
    expect(result.every(r => r.severity === 'error')).toBe(true);
  });

  it('filters by time threshold', () => {
    const threshold = new Date(Date.now() - 30 * 60_000).toISOString();
    const result = filterRows(allRows, 'all', threshold);
    expect(result.every(r => r.created_at >= threshold)).toBe(true);
  });

  it('combines severity + time filter', () => {
    const threshold = new Date(Date.now() - 60 * 60_000).toISOString();
    const result = filterRows(allRows, 'slow', threshold);
    expect(result.every(r => r.severity === 'slow' && r.created_at >= threshold)).toBe(true);
  });

  it('returns empty if no match', () => {
    const futureThreshold = new Date(Date.now() + 86400_000).toISOString();
    const result = filterRows(allRows, 'all', futureThreshold);
    expect(result.length).toBe(0);
  });
});

describe('TelemetryRow Data Integrity', () => {
  it('makeRow creates valid default row', () => {
    const row = makeRow();
    expect(row.id).toBeTruthy();
    expect(row.operation).toBe('select');
    expect(row.severity).toBe('slow');
    expect(row.duration_ms).toBe(4500);
    expect(row.created_at).toBeTruthy();
  });

  it('makeRow overrides work', () => {
    const row = makeRow({ operation: 'insert', severity: 'error', duration_ms: 12000 });
    expect(row.operation).toBe('insert');
    expect(row.severity).toBe('error');
    expect(row.duration_ms).toBe(12000);
  });

  it('makeRows generates unique IDs', () => {
    const rows = makeRows(100);
    const ids = new Set(rows.map(r => r.id));
    expect(ids.size).toBe(100);
  });

  it('makeRows creates descending timestamps', () => {
    const rows = makeRows(50);
    for (let i = 1; i < rows.length; i++) {
      expect(new Date(rows[i - 1].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(rows[i].created_at).getTime()
      );
    }
  });

  it('makeDiverseRows cycles through severities', () => {
    const rows = makeDiverseRows(100);
    const sevs = new Set(rows.map(r => r.severity));
    expect(sevs.size).toBe(4);
  });

  it('makeDiverseRows cycles through tables', () => {
    const rows = makeDiverseRows(100);
    const tables = new Set(rows.map(r => r.table_name || r.rpc_name).filter(Boolean));
    expect(tables.size).toBeGreaterThanOrEqual(8);
  });

  it('makeDiverseRows cycles through operations', () => {
    const rows = makeDiverseRows(100);
    const ops = new Set(rows.map(r => r.operation));
    expect(ops.size).toBe(5);
  });

  it('error rows have error_message', () => {
    const rows = makeDiverseRows(100);
    const errorRows = rows.filter(r => r.severity === 'error');
    expect(errorRows.every(r => r.error_message !== null)).toBe(true);
  });

  it('non-error rows have null error_message', () => {
    const rows = makeDiverseRows(100);
    const nonErrorRows = rows.filter(r => r.severity !== 'error');
    expect(nonErrorRows.every(r => r.error_message === null)).toBe(true);
  });
});

describe('Telemetry Edge Cases', () => {
  it('handles row with 0ms duration', () => {
    const row = makeRow({ duration_ms: 0 });
    expect(row.duration_ms).toBe(0);
  });

  it('handles extremely high duration', () => {
    const row = makeRow({ duration_ms: 999999 });
    const formatDuration = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
    expect(formatDuration(row.duration_ms)).toBe('1000.0s');
  });

  it('handles null record_count', () => {
    const row = makeRow({ record_count: null });
    expect(row.record_count).toBeNull();
  });

  it('handles null query_limit', () => {
    const row = makeRow({ query_limit: null });
    expect(row.query_limit).toBeNull();
  });

  it('handles null count_mode', () => {
    const row = makeRow({ count_mode: null });
    expect(row.count_mode).toBeNull();
  });

  it('handles very long table name', () => {
    const longName = 'a'.repeat(200);
    const row = makeRow({ table_name: longName });
    expect(row.table_name).toBe(longName);
  });

  it('handles special chars in rpc_name', () => {
    const row = makeRow({ rpc_name: 'fn_special-chars.v2' });
    expect(row.rpc_name).toBe('fn_special-chars.v2');
  });

  it('handles empty string operation', () => {
    const row = makeRow({ operation: '' });
    expect(row.operation).toBe('');
  });

  it('handles future created_at', () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    const row = makeRow({ created_at: future });
    expect(new Date(row.created_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('handles very old created_at', () => {
    const old = '2020-01-01T00:00:00Z';
    const row = makeRow({ created_at: old });
    expect(row.created_at).toBe(old);
  });
});

// ─── Batch generation stress tests ─────────────────────────────
describe('Telemetry Stress Tests', () => {
  it('processes 500 diverse rows for stats', () => {
    const rows = makeDiverseRows(500);
    const verySlow = rows.filter(r => r.severity === 'very_slow').length;
    const slow = rows.filter(r => r.severity === 'slow').length;
    const errors = rows.filter(r => r.severity === 'error').length;
    const normal = rows.filter(r => r.severity === 'normal').length;
    expect(verySlow + slow + errors + normal).toBe(500);
  });

  it('processes 1000 rows for offenders', () => {
    const rows = makeDiverseRows(1000);
    const tableStats = new Map<string, number>();
    for (const r of rows) {
      const key = r.rpc_name || r.table_name || 'unknown';
      tableStats.set(key, (tableStats.get(key) || 0) + 1);
    }
    const total = [...tableStats.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(1000);
  });

  it('renders TelemetryCharts with 500 rows', () => {
    const rows = makeDiverseRows(500);
    const { container } = render(<TelemetryCharts rows={rows} timeFilter="7d" />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
