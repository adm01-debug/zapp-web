import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

import { checkAccountLocked, recordFailedAttempt, clearAttempts } from '@/lib/loginAttempts';

describe('loginAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAccountLocked', () => {
    it('returns not locked for unknown email', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_locked: false, locked_until: null, attempts: 0 }],
        error: null,
      });

      const result = await checkAccountLocked('unknown@test.com');
      expect(result.isLocked).toBe(false);
    });

    it('returns locked with expiry time', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      mockRpc.mockResolvedValue({
        data: [{ is_locked: true, locked_until: futureDate, attempts: 5 }],
        error: null,
      });

      const result = await checkAccountLocked('locked@test.com');
      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toBe(futureDate);
    });

    it('handles RPC error gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error('Network failure'),
      });

      const result = await checkAccountLocked('test@test.com');
      // Should not throw, return safe default
      expect(result).toBeDefined();
    });
  });

  describe('recordFailedAttempt', () => {
    it('records first failed attempt', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_locked: false, locked_until: null, attempts: 1 }],
        error: null,
      });

      const result = await recordFailedAttempt('test@test.com');
      expect(mockRpc).toHaveBeenCalledWith('record_failed_login', expect.objectContaining({
        p_email: 'test@test.com',
      }));
    });

    it('returns locked after max attempts', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      mockRpc.mockResolvedValue({
        data: [{ is_locked: true, locked_until: futureDate, attempts: 5 }],
        error: null,
      });

      const result = await recordFailedAttempt('test@test.com');
      expect(result.isLocked).toBe(true);
    });
  });

  describe('clearAttempts', () => {
    it('clears login attempts for email', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await clearAttempts('test@test.com');
      expect(mockRpc).toHaveBeenCalledWith('clear_login_attempts', { p_email: 'test@test.com' });
    });
  });
});
