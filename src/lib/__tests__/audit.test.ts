import { describe, it, expect, vi, beforeEach } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { logAudit } from '@/lib/audit';

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
    });
  });

  it('inserts audit log entry', async () => {
    await logAudit({
      action: 'login',
      entityType: 'auth',
      entityId: 'u1',
      details: { method: 'password' },
    });

    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
  });

  it('does not insert when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await logAudit({ action: 'login' });

    // from should not be called since no user
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('handles insert error without throwing', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    });

    // Should not throw
    await expect(logAudit({ action: 'login' })).resolves.not.toThrow();
  });

  it('includes optional fields when provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({
      action: 'contact_created',
      entityType: 'contact',
      entityId: 'c1',
      details: { contactName: 'John' },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        action: 'contact_created',
        entity_type: 'contact',
        entity_id: 'c1',
      }),
    ]));
  });

  it('defaults entityType to null when not provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'logout' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ entity_type: null }),
    ]));
  });

  it('defaults entityId to null when not provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'logout' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ entity_id: null }),
    ]));
  });

  it('defaults details to empty object when not provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'login' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ details: {} }),
    ]));
  });

  it('includes user_agent in audit log', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'login' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ user_agent: expect.any(String) }),
    ]));
  });

  it('includes user_id in audit log', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'login' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ user_id: 'u1' }),
    ]));
  });

  it('handles exception in getUser gracefully', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth error'));
    await expect(logAudit({ action: 'login' })).resolves.not.toThrow();
  });

  it('supports message_sent action', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await logAudit({ action: 'message_sent', entityType: 'message', entityId: 'm1' });

    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ action: 'message_sent' }),
    ]));
  });
});
