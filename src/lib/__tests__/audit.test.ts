import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { logAuditAction } from '@/lib/audit';

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it('inserts audit log entry', async () => {
    await logAuditAction({
      userId: 'u1',
      action: 'login',
      entityType: 'auth',
      entityId: 'u1',
      details: { method: 'password' },
    });

    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
  });

  it('handles insert error without throwing', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    });

    // Should not throw
    await expect(logAuditAction({
      userId: 'u1',
      action: 'login',
    })).resolves.not.toThrow();
  });

  it('includes optional fields when provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAuditAction({
      userId: 'u1',
      action: 'delete_contact',
      entityType: 'contact',
      entityId: 'c1',
      details: { contactName: 'John' },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete_contact',
      entity_type: 'contact',
      entity_id: 'c1',
    }));
  });
});
