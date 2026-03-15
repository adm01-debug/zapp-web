import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockAuth = {
  mfa: {
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    listFactors: vi.fn(),
    unenroll: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: mockAuth,
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useMFA } from '@/hooks/useMFA';

describe('useMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
      error: null,
    });
    mockAuth.mfa.listFactors.mockResolvedValue({
      data: { totp: [], phone: [] },
      error: null,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useMFA());
    expect(result.current.loading).toBe(false);
    expect(result.current.isMFAEnabled).toBe(false);
  });

  it('enrollTOTP calls mfa.enroll with totp factor', async () => {
    mockAuth.mfa.enroll.mockResolvedValue({
      data: { id: 'f1', type: 'totp', totp: { qr_code: 'data:image/svg+xml;...', secret: 'ABCDEF', uri: 'otpauth://...' } },
      error: null,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.enrollTOTP();
    });

    expect(mockAuth.mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp' });
  });

  it('verifyTOTP calls challenge then verify', async () => {
    mockAuth.mfa.challenge.mockResolvedValue({
      data: { id: 'challenge-1' },
      error: null,
    });
    mockAuth.mfa.verify.mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.verifyTOTP('factor-1', '123456');
    });

    expect(mockAuth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(mockAuth.mfa.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
  });

  it('unenroll calls mfa.unenroll', async () => {
    mockAuth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.unenroll('factor-1');
    });

    expect(mockAuth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'factor-1' });
  });

  it('handles enroll error gracefully', async () => {
    mockAuth.mfa.enroll.mockResolvedValue({
      data: null,
      error: new Error('MFA enrollment failed'),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.enrollTOTP();
      } catch {
        // Expected to throw
      }
    });
  });

  it('handles verify error gracefully', async () => {
    mockAuth.mfa.challenge.mockResolvedValue({
      data: { id: 'challenge-1' },
      error: null,
    });
    mockAuth.mfa.verify.mockResolvedValue({
      data: null,
      error: new Error('Invalid OTP'),
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.verifyTOTP('factor-1', '000000');
      } catch {
        // Expected to throw
      }
    });
  });

  it('fetchFactors retrieves TOTP factors', async () => {
    mockAuth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'My Authenticator', created_at: '', updated_at: '' }],
        phone: [],
      },
      error: null,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.fetchFactors();
    });

    expect(result.current.factors).toHaveLength(1);
    expect(result.current.isMFAEnabled).toBe(true);
  });
});
