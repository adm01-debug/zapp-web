/**
 * Tests for AI Usage Tracking improvements:
 * 1. CSV field escaping (RFC 4180)
 * 2. Pagination logic
 * 3. profile_id resolution logic
 */
import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// CSV ESCAPING — RFC 4180 Compliance
// ═══════════════════════════════════════════════════════════════

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? '-');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

describe('CSV Escaping – RFC 4180', () => {
  it('passes through simple string', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('passes through number', () => {
    expect(escapeCsvField(42)).toBe('42');
  });

  it('converts null to dash', () => {
    expect(escapeCsvField(null)).toBe('-');
  });

  it('converts undefined to dash', () => {
    expect(escapeCsvField(undefined)).toBe('-');
  });

  it('wraps value with comma in quotes', () => {
    expect(escapeCsvField('Silva, João')).toBe('"Silva, João"');
  });

  it('wraps value with double-quote and escapes it', () => {
    expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""');
  });

  it('wraps value with newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps value with carriage return', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });

  it('handles comma + quotes combined', () => {
    expect(escapeCsvField('"Nome", Sobrenome')).toBe('"""Nome"", Sobrenome"');
  });

  it('handles empty string', () => {
    expect(escapeCsvField('')).toBe('');
  });

  it('handles string with only comma', () => {
    expect(escapeCsvField(',')).toBe('","');
  });

  it('handles string with only double-quote', () => {
    expect(escapeCsvField('"')).toBe('""""');
  });

  it('handles number 0', () => {
    expect(escapeCsvField(0)).toBe('0');
  });

  it('handles negative number', () => {
    expect(escapeCsvField(-100)).toBe('-100');
  });

  it('handles float number', () => {
    expect(escapeCsvField(3.14)).toBe('3.14');
  });

  it('handles very long string without special chars', () => {
    const long = 'a'.repeat(10000);
    expect(escapeCsvField(long)).toBe(long);
  });

  it('handles very long string with comma', () => {
    const long = 'a'.repeat(5000) + ',' + 'b'.repeat(5000);
    const result = escapeCsvField(long);
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('"')).toBe(true);
  });

  it('handles unicode characters', () => {
    expect(escapeCsvField('Ação')).toBe('Ação');
  });

  it('handles unicode with comma', () => {
    expect(escapeCsvField('São Paulo, SP')).toBe('"São Paulo, SP"');
  });

  it('handles emoji', () => {
    expect(escapeCsvField('✓ OK')).toBe('✓ OK');
  });

  it('handles tab character (no wrapping needed)', () => {
    expect(escapeCsvField('col1\tcol2')).toBe('col1\tcol2');
  });

  it('handles CRLF', () => {
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('handles NaN', () => {
    expect(escapeCsvField(NaN)).toBe('NaN');
  });

  it('handles Infinity', () => {
    expect(escapeCsvField(Infinity)).toBe('Infinity');
  });
});

// ═══════════════════════════════════════════════════════════════
// PAGINATION LOGIC
// ═══════════════════════════════════════════════════════════════

const LOGS_PER_PAGE = 50;

function paginate<T>(items: T[], page: number): T[] {
  return items.slice(page * LOGS_PER_PAGE, (page + 1) * LOGS_PER_PAGE);
}

function totalPages(totalItems: number): number {
  return Math.max(1, Math.ceil(totalItems / LOGS_PER_PAGE));
}

describe('Pagination Logic', () => {
  const items = Array.from({ length: 237 }, (_, i) => i);

  it('page 0 returns first 50 items', () => {
    const page = paginate(items, 0);
    expect(page.length).toBe(50);
    expect(page[0]).toBe(0);
    expect(page[49]).toBe(49);
  });

  it('page 1 returns items 50-99', () => {
    const page = paginate(items, 1);
    expect(page.length).toBe(50);
    expect(page[0]).toBe(50);
    expect(page[49]).toBe(99);
  });

  it('last page returns remaining items', () => {
    const page = paginate(items, 4); // 200-236 = 37 items
    expect(page.length).toBe(37);
    expect(page[0]).toBe(200);
    expect(page[36]).toBe(236);
  });

  it('beyond last page returns empty', () => {
    expect(paginate(items, 5)).toEqual([]);
    expect(paginate(items, 100)).toEqual([]);
  });

  it('empty array returns empty on page 0', () => {
    expect(paginate([], 0)).toEqual([]);
  });

  it('calculates total pages for 237 items', () => {
    expect(totalPages(237)).toBe(5);
  });

  it('calculates total pages for exactly 50 items', () => {
    expect(totalPages(50)).toBe(1);
  });

  it('calculates total pages for 51 items', () => {
    expect(totalPages(51)).toBe(2);
  });

  it('calculates total pages for 0 items', () => {
    expect(totalPages(0)).toBe(1); // At least 1 page
  });

  it('calculates total pages for 1 item', () => {
    expect(totalPages(1)).toBe(1);
  });

  it('calculates total pages for 1000 items', () => {
    expect(totalPages(1000)).toBe(20);
  });

  it('page display range is correct for page 0', () => {
    const page = 0;
    const total = 237;
    const from = page * LOGS_PER_PAGE + 1;
    const to = Math.min((page + 1) * LOGS_PER_PAGE, total);
    expect(from).toBe(1);
    expect(to).toBe(50);
  });

  it('page display range is correct for last page', () => {
    const page = 4;
    const total = 237;
    const from = page * LOGS_PER_PAGE + 1;
    const to = Math.min((page + 1) * LOGS_PER_PAGE, total);
    expect(from).toBe(201);
    expect(to).toBe(237);
  });

  it('negative page returns empty (defensive)', () => {
    expect(paginate(items, -1)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// PROFILE ID RESOLUTION LOGIC
// ═══════════════════════════════════════════════════════════════

describe('Profile ID Resolution Logic', () => {
  it('returns null for null userId', async () => {
    // Simulating resolveProfileId behavior
    const resolveProfileId = (userId: string | null) => {
      if (!userId) return null;
      return 'profile-xxx';
    };
    expect(resolveProfileId(null)).toBeNull();
  });

  it('returns null for undefined userId', () => {
    const resolveProfileId = (userId: string | null | undefined) => {
      if (!userId) return null;
      return 'profile-xxx';
    };
    expect(resolveProfileId(undefined)).toBeNull();
  });

  it('returns null for empty string userId', () => {
    const resolveProfileId = (userId: string | null | undefined) => {
      if (!userId) return null;
      return 'profile-xxx';
    };
    expect(resolveProfileId('')).toBeNull();
  });

  it('prefers explicit profileId over resolved one', () => {
    const entry = { profileId: 'explicit-id', userId: 'user-123' };
    const resolved = entry.profileId || 'resolved-from-db';
    expect(resolved).toBe('explicit-id');
  });

  it('falls back to resolved profileId when not provided', () => {
    const entry = { profileId: null, userId: 'user-123' };
    const resolved = entry.profileId || 'resolved-from-db';
    expect(resolved).toBe('resolved-from-db');
  });

  it('handles undefined profileId fallback', () => {
    const entry = { profileId: undefined, userId: 'user-123' };
    const resolved = entry.profileId || 'resolved-from-db';
    expect(resolved).toBe('resolved-from-db');
  });
});

// ═══════════════════════════════════════════════════════════════
// CSV FULL ROW GENERATION
// ═══════════════════════════════════════════════════════════════

describe('CSV Full Row Generation', () => {
  function buildCsvRow(data: {
    date: string;
    userName: string | null;
    functionName: string;
    model: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    durationMs: number | null;
    status: string;
  }): string {
    return [
      escapeCsvField(data.date),
      escapeCsvField(data.userName),
      escapeCsvField(data.functionName),
      escapeCsvField(data.model),
      data.inputTokens,
      data.outputTokens,
      data.totalTokens,
      data.durationMs || '-',
      data.status,
    ].join(',');
  }

  it('generates clean row for normal data', () => {
    const row = buildCsvRow({
      date: '06/04/2026 20:30:00',
      userName: 'João Silva',
      functionName: 'Sugestão de Resposta',
      model: 'gemini-3-flash-preview',
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
      durationMs: 500,
      status: 'success',
    });
    expect(row).toBe('06/04/2026 20:30:00,João Silva,Sugestão de Resposta,gemini-3-flash-preview,100,20,120,500,success');
  });

  it('escapes user name with comma', () => {
    const row = buildCsvRow({
      date: '06/04/2026 20:30:00',
      userName: 'Silva, João Pedro',
      functionName: 'Auto-Tag',
      model: null,
      inputTokens: 50,
      outputTokens: 10,
      totalTokens: 60,
      durationMs: null,
      status: 'success',
    });
    expect(row).toContain('"Silva, João Pedro"');
    expect(row).toContain('-'); // null model and durationMs
  });

  it('handles all null optional fields', () => {
    const row = buildCsvRow({
      date: '06/04/2026 20:30:00',
      userName: null,
      functionName: 'unknown-fn',
      model: null,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      durationMs: null,
      status: 'error',
    });
    const parts = row.split(',');
    expect(parts[1]).toBe('-'); // null userName
    expect(parts[3]).toBe('-'); // null model
    expect(parts[7]).toBe('-'); // null durationMs
  });

  it('handles function name with quotes', () => {
    const row = buildCsvRow({
      date: '06/04/2026 20:30:00',
      userName: 'Admin',
      functionName: 'custom "AI" function',
      model: 'gpt-5',
      inputTokens: 200,
      outputTokens: 50,
      totalTokens: 250,
      durationMs: 1000,
      status: 'success',
    });
    expect(row).toContain('"custom ""AI"" function"');
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES & INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases & Stress Tests', () => {
  it('CSV handles 10000 rows without error', () => {
    const rows = Array.from({ length: 10000 }, (_, i) =>
      [escapeCsvField(`user-${i}`), i, i * 2].join(',')
    );
    const csv = rows.join('\n');
    expect(csv.split('\n').length).toBe(10000);
  });

  it('pagination handles exactly LOGS_PER_PAGE items', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(paginate(items, 0).length).toBe(50);
    expect(paginate(items, 1).length).toBe(0);
  });

  it('CSV escaping handles SQL injection attempt', () => {
    const malicious = "Robert'); DROP TABLE users;--";
    const escaped = escapeCsvField(malicious);
    // No special chars that need CSV escaping, but value is preserved safely
    expect(escaped).toBe(malicious);
  });

  it('CSV escaping handles XSS attempt', () => {
    const xss = '<script>alert("xss")</script>';
    const escaped = escapeCsvField(xss);
    expect(escaped).toContain('"'); // quotes are escaped
  });

  it('CSV escaping handles HTML entities', () => {
    expect(escapeCsvField('a&b')).toBe('a&b');
    expect(escapeCsvField('a<b')).toBe('a<b');
  });

  it('pagination with fractional page (defensive)', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    // Math.floor is implicit in slice
    const page = paginate(items, 0.5);
    expect(page.length).toBeLessThanOrEqual(50);
  });

  it('large token values in CSV row', () => {
    const row = [escapeCsvField('user'), 999999999, 999999999, 1999999998].join(',');
    expect(row).toContain('999999999');
  });
});
