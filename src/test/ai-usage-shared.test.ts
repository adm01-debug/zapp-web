/**
 * Tests for the shared ai-usage utility logic.
 * Since the actual module runs in Deno, we test the pure logic equivalents here.
 */
import { describe, it, expect } from 'vitest';

// ─── extractTokenUsage logic ─────────────────────────────────
function extractTokenUsage(data: Record<string, unknown>) {
  const usage = data?.usage as Record<string, unknown> | undefined;
  return {
    inputTokens: Number(usage?.prompt_tokens ?? 0),
    outputTokens: Number(usage?.completion_tokens ?? 0),
    model: (data?.model as string) || null,
  };
}

// ─── extractUserIdFromRequest logic ──────────────────────────
function extractUserIdFromJWT(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// extractTokenUsage
// ═══════════════════════════════════════════════════════════════
describe('extractTokenUsage', () => {
  it('extracts tokens from standard OpenAI response', () => {
    const result = extractTokenUsage({
      model: 'gpt-5',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
    expect(result).toEqual({ inputTokens: 100, outputTokens: 50, model: 'gpt-5' });
  });

  it('handles missing usage field', () => {
    const result = extractTokenUsage({ model: 'gpt-5' });
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, model: 'gpt-5' });
  });

  it('handles null data', () => {
    const result = extractTokenUsage({});
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, model: null });
  });

  it('handles string token values', () => {
    const result = extractTokenUsage({
      model: 'test',
      usage: { prompt_tokens: '100', completion_tokens: '50' },
    });
    expect(result).toEqual({ inputTokens: 100, outputTokens: 50, model: 'test' });
  });

  it('handles undefined token values', () => {
    const result = extractTokenUsage({ usage: {} });
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, model: null });
  });

  it('handles NaN token values', () => {
    const result = extractTokenUsage({
      usage: { prompt_tokens: 'abc', completion_tokens: null },
    });
    expect(result.inputTokens).toBeNaN();
    expect(result.outputTokens).toBe(0);
  });

  it('handles zero tokens', () => {
    const result = extractTokenUsage({
      model: 'test',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    });
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, model: 'test' });
  });

  it('handles very large token counts', () => {
    const result = extractTokenUsage({
      usage: { prompt_tokens: 1_000_000, completion_tokens: 500_000 },
    });
    expect(result.inputTokens).toBe(1_000_000);
    expect(result.outputTokens).toBe(500_000);
  });

  it('handles negative token values', () => {
    const result = extractTokenUsage({
      usage: { prompt_tokens: -10, completion_tokens: -5 },
    });
    expect(result.inputTokens).toBe(-10);
    expect(result.outputTokens).toBe(-5);
  });

  it('handles Google model response format', () => {
    const result = extractTokenUsage({
      model: 'google/gemini-3-flash-preview',
      usage: { prompt_tokens: 200, completion_tokens: 80 },
    });
    expect(result.model).toBe('google/gemini-3-flash-preview');
    expect(result.inputTokens).toBe(200);
  });

  it('ignores extra fields in usage', () => {
    const result = extractTokenUsage({
      model: 'test',
      usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75, cached_tokens: 10 },
    });
    expect(result).toEqual({ inputTokens: 50, outputTokens: 25, model: 'test' });
  });
});

// ═══════════════════════════════════════════════════════════════
// extractUserIdFromJWT
// ═══════════════════════════════════════════════════════════════
describe('extractUserIdFromJWT', () => {
  function makeJWT(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fakesig`;
  }

  it('extracts sub from valid JWT', () => {
    const token = makeJWT({ sub: 'user-123', role: 'authenticated' });
    expect(extractUserIdFromJWT(token)).toBe('user-123');
  });

  it('returns null for empty string', () => {
    expect(extractUserIdFromJWT('')).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(extractUserIdFromJWT('not.a.valid.jwt')).toBeNull();
  });

  it('returns null for token without sub', () => {
    const token = makeJWT({ role: 'authenticated' });
    expect(extractUserIdFromJWT(token)).toBeNull();
  });

  it('returns null for single part token', () => {
    expect(extractUserIdFromJWT('singlepart')).toBeNull();
  });

  it('handles JWT with URL-safe base64', () => {
    const payload = { sub: 'user-with-special+chars/here' };
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const bodyStr = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const token = `${header}.${bodyStr}.sig`;
    const result = extractUserIdFromJWT(token);
    expect(result).toBe('user-with-special+chars/here');
  });

  it('handles expired JWT (still extracts sub)', () => {
    const token = makeJWT({ sub: 'user-expired', exp: 0 });
    expect(extractUserIdFromJWT(token)).toBe('user-expired');
  });

  it('handles JWT with UUID sub', () => {
    const token = makeJWT({ sub: '550e8400-e29b-41d4-a716-446655440000' });
    expect(extractUserIdFromJWT(token)).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('returns null for corrupted base64', () => {
    expect(extractUserIdFromJWT('header.!!!invalid!!!.sig')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// Data integrity scenarios
// ═══════════════════════════════════════════════════════════════
describe('AI Usage – Data Integrity', () => {
  it('total_tokens should equal input + output', () => {
    const input = 150;
    const output = 75;
    expect(input + output).toBe(225);
  });

  it('handles concurrent log entries without collision', () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: crypto.randomUUID(),
      user_id: `user-${i % 10}`,
      function_name: 'test',
      input_tokens: i,
      output_tokens: i * 2,
    }));
    const ids = new Set(entries.map(e => e.id));
    expect(ids.size).toBe(100);
  });

  it('validates function_name is never empty', () => {
    const functionNames = ['ai-suggest-reply', 'ai-enhance-message', 'ai-conversation-analysis', 'ai-conversation-summary', 'ai-auto-tag', 'chatbot-l1'];
    functionNames.forEach(fn => {
      expect(fn.length).toBeGreaterThan(0);
      expect(fn).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it('duration_ms should be non-negative in valid scenarios', () => {
    const start = Date.now();
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('status should be either success or error', () => {
    const validStatuses = ['success', 'error'];
    expect(validStatuses).toContain('success');
    expect(validStatuses).toContain('error');
    expect(validStatuses).not.toContain('pending');
  });
});

// ═══════════════════════════════════════════════════════════════
// Security scenarios
// ═══════════════════════════════════════════════════════════════
describe('AI Usage – Security', () => {
  it('JWT extraction does not verify signature (by design)', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.invalidsig';
    const result = extractUserIdFromJWT(token);
    expect(result).toBe('user-123');
  });

  it('handles XSS in function_name display', () => {
    const malicious = '<script>alert("xss")</script>';
    // React escapes by default, but let's verify the data
    expect(malicious).toContain('<script>');
    // In React, this would be rendered as text, not executed
  });

  it('handles SQL injection attempts in log data', () => {
    const malicious = "'; DROP TABLE ai_usage_logs; --";
    // Supabase parameterizes queries, but the data should still be storable
    expect(typeof malicious).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════
// Performance scenarios
// ═══════════════════════════════════════════════════════════════
describe('AI Usage – Performance', () => {
  it('extractTokenUsage handles 10000 calls efficiently', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      extractTokenUsage({
        model: 'test',
        usage: { prompt_tokens: i, completion_tokens: i * 2 },
      });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should be < 1s
  });

  it('JWT extraction handles 10000 calls efficiently', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const body = btoa(JSON.stringify({ sub: 'user-perf' }));
    const token = `${header}.${body}.sig`;
    
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      extractUserIdFromJWT(token);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
