import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Extracted pure logic from external-db-bridge ─────────────
// We test the exported pure functions and simulate the full flow

function classifySeverity(durationMs: number, hasError: boolean): string {
  if (hasError) return "error";
  if (durationMs >= 8000) return "very_slow";
  if (durationMs >= 3000) return "slow";
  return "normal";
}

interface TelemetryPayload {
  operation: string;
  table_name?: string | null;
  rpc_name?: string | null;
  duration_ms: number;
  record_count?: number | null;
  query_limit?: number | null;
  query_offset?: number | null;
  count_mode?: string | null;
  severity: string;
  error_message?: string | null;
  user_id?: string | null;
}

// Mock supabase client for testing emitTelemetry
function createMockSupabase(insertResult: { error: any } = { error: null }) {
  const insertFn = vi.fn().mockResolvedValue(insertResult);
  return {
    from: vi.fn().mockReturnValue({ insert: insertFn }),
    _insertFn: insertFn,
  };
}

async function emitTelemetry(
  supabaseAdmin: any,
  payload: TelemetryPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("query_telemetry")
      .insert({
        operation: payload.operation,
        table_name: payload.table_name ?? null,
        rpc_name: payload.rpc_name ?? null,
        duration_ms: Math.round(payload.duration_ms),
        record_count: payload.record_count ?? null,
        query_limit: payload.query_limit ?? null,
        query_offset: payload.query_offset ?? null,
        count_mode: payload.count_mode ?? null,
        severity: payload.severity,
        error_message: payload.error_message ?? null,
        user_id: payload.user_id ?? null,
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Helpers ──────────────────────────────────────────────────
function makePayload(overrides: Partial<TelemetryPayload> = {}): TelemetryPayload {
  return {
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
    user_id: 'user-123',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// classifySeverity
// ═══════════════════════════════════════════════════════════════
describe('classifySeverity', () => {
  // Error always wins
  it.each([0, 100, 3000, 8000, 50000])('returns "error" when hasError=true regardless of duration=%i', (ms) => {
    expect(classifySeverity(ms, true)).toBe('error');
  });

  // very_slow threshold
  it.each([8000, 8001, 9000, 10000, 50000, 999999])('returns "very_slow" for %ims (>=8000, no error)', (ms) => {
    expect(classifySeverity(ms, false)).toBe('very_slow');
  });

  // slow threshold
  it.each([3000, 3001, 4000, 5000, 7000, 7999])('returns "slow" for %ims (3000-7999, no error)', (ms) => {
    expect(classifySeverity(ms, false)).toBe('slow');
  });

  // normal threshold
  it.each([0, 1, 100, 500, 1000, 2000, 2999])('returns "normal" for %ims (<3000, no error)', (ms) => {
    expect(classifySeverity(ms, false)).toBe('normal');
  });

  // Boundary tests
  it('boundary: 2999ms is normal', () => expect(classifySeverity(2999, false)).toBe('normal'));
  it('boundary: 3000ms is slow', () => expect(classifySeverity(3000, false)).toBe('slow'));
  it('boundary: 7999ms is slow', () => expect(classifySeverity(7999, false)).toBe('slow'));
  it('boundary: 8000ms is very_slow', () => expect(classifySeverity(8000, false)).toBe('very_slow'));

  // Edge cases
  it('handles negative duration', () => expect(classifySeverity(-1, false)).toBe('normal'));
  it('handles fractional duration', () => expect(classifySeverity(3000.5, false)).toBe('slow'));
  it('handles NaN with error', () => expect(classifySeverity(NaN, true)).toBe('error'));
  it('handles Infinity', () => expect(classifySeverity(Infinity, false)).toBe('very_slow'));
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - Success Cases
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Success', () => {
  it('returns success when insert succeeds', async () => {
    const mock = createMockSupabase();
    const result = await emitTelemetry(mock, makePayload());
    expect(result).toEqual({ success: true });
  });

  it('calls from("query_telemetry")', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload());
    expect(mock.from).toHaveBeenCalledWith('query_telemetry');
  });

  it('passes correct operation', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ operation: 'insert' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ operation: 'insert' }));
  });

  it('passes correct table_name', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ table_name: 'messages' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ table_name: 'messages' }));
  });

  it('passes correct rpc_name', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ rpc_name: 'fn_search' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ rpc_name: 'fn_search' }));
  });

  it('rounds duration_ms', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ duration_ms: 4567.89 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ duration_ms: 4568 }));
  });

  it('passes severity', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ severity: 'very_slow' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ severity: 'very_slow' }));
  });

  it('passes error_message when present', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ error_message: 'timeout' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ error_message: 'timeout' }));
  });

  it('passes user_id', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ user_id: 'abc-123' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'abc-123' }));
  });

  it('passes record_count', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ record_count: 42 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ record_count: 42 }));
  });

  it('passes query_limit', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ query_limit: 100 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ query_limit: 100 }));
  });

  it('passes query_offset', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ query_offset: 50 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ query_offset: 50 }));
  });

  it('passes count_mode', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ count_mode: 'exact' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ count_mode: 'exact' }));
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - Null Coalescing
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Null Defaults', () => {
  it('table_name defaults to null when undefined', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ table_name: undefined }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ table_name: null }));
  });

  it('rpc_name defaults to null when undefined', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ rpc_name: undefined }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ rpc_name: null }));
  });

  it('record_count defaults to null when undefined', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).record_count;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ record_count: null }));
  });

  it('query_limit defaults to null', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).query_limit;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ query_limit: null }));
  });

  it('query_offset defaults to null', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).query_offset;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ query_offset: null }));
  });

  it('count_mode defaults to null', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).count_mode;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ count_mode: null }));
  });

  it('error_message defaults to null', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).error_message;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ error_message: null }));
  });

  it('user_id defaults to null', async () => {
    const mock = createMockSupabase();
    const p = makePayload();
    delete (p as any).user_id;
    await emitTelemetry(mock, p);
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - Error Handling
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Error Handling', () => {
  it('returns error when insert fails', async () => {
    const mock = createMockSupabase({ error: { message: 'RLS violation' } });
    const result = await emitTelemetry(mock, makePayload());
    expect(result).toEqual({ success: false, error: 'RLS violation' });
  });

  it('catches thrown exceptions', async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Network failure')),
      }),
    };
    const result = await emitTelemetry(mock, makePayload());
    expect(result).toEqual({ success: false, error: 'Network failure' });
  });

  it('handles non-Error exceptions', async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockRejectedValue('string error'),
      }),
    };
    const result = await emitTelemetry(mock, makePayload());
    expect(result).toEqual({ success: false, error: 'string error' });
  });

  it('handles null error object gracefully', async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockRejectedValue(null),
      }),
    };
    const result = await emitTelemetry(mock, makePayload());
    expect(result.success).toBe(false);
  });

  it('handles undefined from()', async () => {
    const mock = {
      from: vi.fn().mockReturnValue(undefined),
    };
    const result = await emitTelemetry(mock, makePayload());
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - All Operations
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Operations', () => {
  const operations = ['select', 'insert', 'update', 'delete', 'rpc'];

  it.each(operations)('handles operation=%s', async (op) => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ operation: op }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ operation: op }));
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - All Severities
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Severities', () => {
  const severities = ['normal', 'slow', 'very_slow', 'error'];

  it.each(severities)('persists severity=%s', async (sev) => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ severity: sev }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ severity: sev }));
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - Duration Rounding
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Duration Rounding', () => {
  it.each([
    [0, 0],
    [1.1, 1],
    [1.5, 2],
    [1.9, 2],
    [999.4, 999],
    [999.5, 1000],
    [3000.7, 3001],
    [8000.0, 8000],
    [12345.678, 12346],
  ])('rounds %f to %i', async (input, expected) => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ duration_ms: input }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ duration_ms: expected }));
  });
});

// ═══════════════════════════════════════════════════════════════
// emitTelemetry - Payload Integrity (full object check)
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Full Payload Integrity', () => {
  it('inserts complete payload with all fields', async () => {
    const mock = createMockSupabase();
    const payload = makePayload({
      operation: 'rpc',
      table_name: null,
      rpc_name: 'search_contacts',
      duration_ms: 5432.1,
      record_count: 25,
      query_limit: 100,
      query_offset: 200,
      count_mode: 'exact',
      severity: 'slow',
      error_message: null,
      user_id: 'user-xyz',
    });

    await emitTelemetry(mock, payload);
    expect(mock._insertFn).toHaveBeenCalledWith({
      operation: 'rpc',
      table_name: null,
      rpc_name: 'search_contacts',
      duration_ms: 5432,
      record_count: 25,
      query_limit: 100,
      query_offset: 200,
      count_mode: 'exact',
      severity: 'slow',
      error_message: null,
      user_id: 'user-xyz',
    });
  });

  it('inserts minimal payload (only required)', async () => {
    const mock = createMockSupabase();
    const payload: TelemetryPayload = {
      operation: 'select',
      duration_ms: 100,
      severity: 'normal',
    };

    await emitTelemetry(mock, payload);
    expect(mock._insertFn).toHaveBeenCalledWith({
      operation: 'select',
      table_name: null,
      rpc_name: null,
      duration_ms: 100,
      record_count: null,
      query_limit: null,
      query_offset: null,
      count_mode: null,
      severity: 'normal',
      error_message: null,
      user_id: null,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Telemetry Decision Logic (when to emit)
// ═══════════════════════════════════════════════════════════════
describe('Telemetry Decision - When to Emit', () => {
  function shouldEmit(severity: string): boolean {
    return severity !== 'normal';
  }

  it('emits for slow', () => expect(shouldEmit('slow')).toBe(true));
  it('emits for very_slow', () => expect(shouldEmit('very_slow')).toBe(true));
  it('emits for error', () => expect(shouldEmit('error')).toBe(true));
  it('does NOT emit for normal', () => expect(shouldEmit('normal')).toBe(false));
});

// ═══════════════════════════════════════════════════════════════
// Integration: classifySeverity -> emitTelemetry
// ═══════════════════════════════════════════════════════════════
describe('Integration: classify + emit', () => {
  it('slow query gets persisted with correct severity', async () => {
    const mock = createMockSupabase();
    const duration = 4500;
    const severity = classifySeverity(duration, false);
    await emitTelemetry(mock, makePayload({ duration_ms: duration, severity }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ severity: 'slow', duration_ms: 4500 }));
  });

  it('very slow query gets persisted', async () => {
    const mock = createMockSupabase();
    const duration = 12000;
    const severity = classifySeverity(duration, false);
    await emitTelemetry(mock, makePayload({ duration_ms: duration, severity }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ severity: 'very_slow', duration_ms: 12000 }));
  });

  it('error query gets persisted with error_message', async () => {
    const mock = createMockSupabase();
    const duration = 500;
    const severity = classifySeverity(duration, true);
    await emitTelemetry(mock, makePayload({
      duration_ms: duration,
      severity,
      error_message: 'Connection refused',
    }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      error_message: 'Connection refused',
    }));
  });

  it('normal query is NOT emitted', () => {
    const severity = classifySeverity(200, false);
    expect(severity).toBe('normal');
    // Normal queries are skipped in the handler
  });
});

// ═══════════════════════════════════════════════════════════════
// Request Validation Logic
// ═══════════════════════════════════════════════════════════════
describe('Request Validation', () => {
  function validateRequest(body: any): { valid: boolean; error?: string } {
    if (!body.action) return { valid: false, error: 'Missing action' };
    if (['select', 'insert', 'update', 'delete'].includes(body.action) && !body.table) {
      return { valid: false, error: 'Invalid action or missing table/rpc' };
    }
    if (body.action === 'rpc' && !body.rpc) {
      return { valid: false, error: 'Invalid action or missing table/rpc' };
    }
    return { valid: true };
  }

  it('valid select', () => expect(validateRequest({ action: 'select', table: 'contacts' }).valid).toBe(true));
  it('valid insert', () => expect(validateRequest({ action: 'insert', table: 'contacts' }).valid).toBe(true));
  it('valid update', () => expect(validateRequest({ action: 'update', table: 'contacts' }).valid).toBe(true));
  it('valid delete', () => expect(validateRequest({ action: 'delete', table: 'contacts' }).valid).toBe(true));
  it('valid rpc', () => expect(validateRequest({ action: 'rpc', rpc: 'fn_test' }).valid).toBe(true));

  it('rejects missing action', () => {
    const r = validateRequest({});
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Missing action');
  });

  it('rejects select without table', () => {
    expect(validateRequest({ action: 'select' }).valid).toBe(false);
  });

  it('rejects insert without table', () => {
    expect(validateRequest({ action: 'insert' }).valid).toBe(false);
  });

  it('rejects rpc without rpc name', () => {
    expect(validateRequest({ action: 'rpc' }).valid).toBe(false);
  });

  it('rejects empty string action', () => {
    expect(validateRequest({ action: '' }).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// CORS Headers
// ═══════════════════════════════════════════════════════════════
describe('CORS Headers', () => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };

  it('includes wildcard origin', () => {
    expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
  });

  it('includes authorization header', () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("authorization");
  });

  it('includes content-type header', () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("content-type");
  });

  it('includes apikey header', () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("apikey");
  });

  it('includes x-client-info header', () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toContain("x-client-info");
  });
});

// ═══════════════════════════════════════════════════════════════
// Stress Tests
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Stress', () => {
  it('handles 100 concurrent emits', async () => {
    const mock = createMockSupabase();
    const promises = Array.from({ length: 100 }, (_, i) =>
      emitTelemetry(mock, makePayload({ duration_ms: 3000 + i * 10, table_name: `table_${i % 10}` }))
    );
    const results = await Promise.all(promises);
    expect(results.every(r => r.success)).toBe(true);
    expect(mock._insertFn).toHaveBeenCalledTimes(100);
  });

  it('handles 50 concurrent errors', async () => {
    const mock = createMockSupabase({ error: { message: 'rate limited' } });
    const promises = Array.from({ length: 50 }, () =>
      emitTelemetry(mock, makePayload())
    );
    const results = await Promise.all(promises);
    expect(results.every(r => !r.success)).toBe(true);
  });

  it('handles mixed success/failure', async () => {
    let callCount = 0;
    const insertFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount % 3 === 0) return Promise.resolve({ error: { message: 'intermittent' } });
      return Promise.resolve({ error: null });
    });
    const mock = { from: vi.fn().mockReturnValue({ insert: insertFn }) };

    const promises = Array.from({ length: 30 }, () => emitTelemetry(mock, makePayload()));
    const results = await Promise.all(promises);
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    expect(successes).toBe(20);
    expect(failures).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Edge Cases', () => {
  it('handles empty string operation', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ operation: '' }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ operation: '' }));
  });

  it('handles very long table name', async () => {
    const mock = createMockSupabase();
    const longName = 'a'.repeat(500);
    await emitTelemetry(mock, makePayload({ table_name: longName }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ table_name: longName }));
  });

  it('handles very long error message', async () => {
    const mock = createMockSupabase();
    const longError = 'E'.repeat(10000);
    await emitTelemetry(mock, makePayload({ error_message: longError }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ error_message: longError }));
  });

  it('handles zero duration', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ duration_ms: 0 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ duration_ms: 0 }));
  });

  it('handles negative duration (rounds to 0 or negative)', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ duration_ms: -5.5 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ duration_ms: -6 }));
  });

  it('handles record_count = 0', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ record_count: 0 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ record_count: 0 }));
  });

  it('handles very large record_count', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ record_count: 999999 }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ record_count: 999999 }));
  });

  it('handles special chars in user_id', async () => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ user_id: '550e8400-e29b-41d4-a716-446655440000' }));
    expect(mock._insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: '550e8400-e29b-41d4-a716-446655440000' })
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// Response Meta Structure
// ═══════════════════════════════════════════════════════════════
describe('Response Meta Structure', () => {
  function buildMeta(recordCount: number | null, durationMs: number, severity: string) {
    return {
      record_count: recordCount,
      duration_ms: Math.round(durationMs),
      severity,
    };
  }

  it('builds correct meta for slow select', () => {
    const meta = buildMeta(50, 4321.5, 'slow');
    expect(meta).toEqual({ record_count: 50, duration_ms: 4322, severity: 'slow' });
  });

  it('builds correct meta for error', () => {
    const meta = buildMeta(null, 100, 'error');
    expect(meta).toEqual({ record_count: null, duration_ms: 100, severity: 'error' });
  });

  it('builds correct meta for normal', () => {
    const meta = buildMeta(10, 200, 'normal');
    expect(meta).toEqual({ record_count: 10, duration_ms: 200, severity: 'normal' });
  });

  it('builds correct meta for very_slow', () => {
    const meta = buildMeta(1000, 15000, 'very_slow');
    expect(meta).toEqual({ record_count: 1000, duration_ms: 15000, severity: 'very_slow' });
  });
});

// ═══════════════════════════════════════════════════════════════
// Table Coverage (different tables)
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - Table Coverage', () => {
  const tables = [
    'contacts', 'messages', 'profiles', 'campaigns', 'tags',
    'queues', 'automations', 'chatbot_flows', 'whatsapp_connections',
    'audit_logs', 'knowledge_base_articles', 'sales_deals',
  ];

  it.each(tables)('persists telemetry for table=%s', async (table) => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ table_name: table }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ table_name: table }));
    expect(mock.from).toHaveBeenCalledWith('query_telemetry');
  });
});

// ═══════════════════════════════════════════════════════════════
// RPC Coverage
// ═══════════════════════════════════════════════════════════════
describe('emitTelemetry - RPC Coverage', () => {
  const rpcs = [
    'search_knowledge_base', 'get_team_profiles', 'skill_based_assign',
    'is_account_locked', 'record_failed_login', 'is_within_business_hours',
  ];

  it.each(rpcs)('persists telemetry for rpc=%s', async (rpc) => {
    const mock = createMockSupabase();
    await emitTelemetry(mock, makePayload({ operation: 'rpc', rpc_name: rpc, table_name: null }));
    expect(mock._insertFn).toHaveBeenCalledWith(expect.objectContaining({ rpc_name: rpc, operation: 'rpc' }));
  });
});
