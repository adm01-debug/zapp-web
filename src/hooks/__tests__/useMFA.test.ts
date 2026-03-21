/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockListFactors = vi.fn();
const mockEnroll = vi.fn();
const mockChallenge = vi.fn();
const mockVerify = vi.fn();
const mockUnenroll = vi.fn();
const mockGetAuthenticatorAssuranceLevel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: () => mockListFactors(),
        enroll: (opts: any) => mockEnroll(opts),
        challenge: (opts: any) => mockChallenge(opts),
        verify: (opts: any) => mockVerify(opts),
        unenroll: (opts: any) => mockUnenroll(opts),
        getAuthenticatorAssuranceLevel: () => mockGetAuthenticatorAssuranceLevel(),
      },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn() },
}));

import { useMFA } from '@/hooks/useMFA';
import { toast } from 'sonner';

describe('useMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });
  });

  it('initializes with loading false', () => {
    const { result } = renderHook(() => useMFA());
    expect(result.current.loading).toBe(false);
  });

  it('initializes with empty factors', () => {
    const { result } = renderHook(() => useMFA());
    expect(result.current.factors).toEqual([]);
  });

  it('initializes with isMFAEnabled false', () => {
    const { result } = renderHook(() => useMFA());
    expect(result.current.isMFAEnabled).toBe(false);
  });

  it('initializes with enrollmentData null', () => {
    const { result } = renderHook(() => useMFA());
    expect(result.current.enrollmentData).toBeNull();
  });

  it('fetchFactors calls listFactors and sets factors', async () => {
    const factors = [
      { id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'Phone' },
    ];
    mockListFactors.mockResolvedValue({ data: { totp: factors }, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.fetchFactors();
    });

    expect(result.current.factors).toEqual(factors);
  });

  it('fetchFactors handles error', async () => {
    mockListFactors.mockResolvedValue({ data: null, error: new Error('Failed') });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      const returned = await result.current.fetchFactors();
      expect(returned).toEqual([]);
    });
  });

  it('isMFAEnabled is true when a verified factor exists', async () => {
    mockListFactors.mockResolvedValue({
      data: { totp: [{ id: 'f1', status: 'verified' }] },
      error: null,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.fetchFactors();
    });

    expect(result.current.isMFAEnabled).toBe(true);
  });

  it('isMFAEnabled is false when factor is unverified', async () => {
    mockListFactors.mockResolvedValue({
      data: { totp: [{ id: 'f1', status: 'unverified' }] },
      error: null,
    });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.fetchFactors();
    });

    expect(result.current.isMFAEnabled).toBe(false);
  });

  it('enrollTOTP calls enroll and sets enrollmentData', async () => {
    const enrollData = {
      id: 'f2',
      type: 'totp',
      totp: { qr_code: 'qr', secret: 'secret', uri: 'otpauth://...' },
    };
    mockEnroll.mockResolvedValue({ data: enrollData, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      const data = await result.current.enrollTOTP('My App');
      expect(data).toEqual(enrollData);
    });

    expect(result.current.enrollmentData).toEqual(enrollData);
    expect(mockEnroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'My App',
    });
  });

  it('enrollTOTP uses default name', async () => {
    mockEnroll.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.enrollTOTP();
    });

    expect(mockEnroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });
  });

  it('enrollTOTP shows error toast on failure', async () => {
    mockEnroll.mockResolvedValue({ data: null, error: new Error('Enroll failed') });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.enrollTOTP();
      } catch {
        // expected
      }
    });

    expect(toast.error).toHaveBeenCalledWith('Enroll failed');
  });

  it('verifyTOTP challenges then verifies', async () => {
    mockChallenge.mockResolvedValue({ data: { id: 'ch1' }, error: null });
    mockVerify.mockResolvedValue({ data: { success: true }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.verifyTOTP('f1', '123456');
    });

    expect(mockChallenge).toHaveBeenCalledWith({ factorId: 'f1' });
    expect(mockVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      challengeId: 'ch1',
      code: '123456',
    });
    expect(toast.success).toHaveBeenCalledWith('MFA verificado com sucesso!');
  });

  it('verifyTOTP throws on challenge error', async () => {
    mockChallenge.mockResolvedValue({ data: null, error: new Error('Challenge failed') });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.verifyTOTP('f1', '123456');
      } catch (e: any) {
        expect(e.message).toBe('Challenge failed');
      }
    });
  });

  it('verifyTOTP clears enrollmentData on success', async () => {
    mockEnroll.mockResolvedValue({
      data: { id: 'f2', type: 'totp', totp: { qr_code: 'qr', secret: 's', uri: 'u' } },
      error: null,
    });
    mockChallenge.mockResolvedValue({ data: { id: 'ch1' }, error: null });
    mockVerify.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.enrollTOTP();
    });
    expect(result.current.enrollmentData).not.toBeNull();

    await act(async () => {
      await result.current.verifyTOTP('f2', '123456');
    });
    expect(result.current.enrollmentData).toBeNull();
  });

  it('unenroll calls supabase unenroll', async () => {
    mockUnenroll.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      await result.current.unenroll('f1');
    });

    expect(mockUnenroll).toHaveBeenCalledWith({ factorId: 'f1' });
    expect(toast.success).toHaveBeenCalledWith('MFA removido com sucesso');
  });

  it('unenroll shows error toast on failure', async () => {
    mockUnenroll.mockResolvedValue({ error: new Error('Unenroll failed') });

    const { result } = renderHook(() => useMFA());

    await act(async () => {
      try {
        await result.current.unenroll('f1');
      } catch {
        // expected
      }
    });

    expect(toast.error).toHaveBeenCalledWith('Unenroll failed');
  });

  it('getAssuranceLevel returns data', async () => {
    const assuranceData = { currentLevel: 'aal1', nextLevel: 'aal2' };
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({ data: assuranceData, error: null });

    const { result } = renderHook(() => useMFA());

    let level: any;
    await act(async () => {
      level = await result.current.getAssuranceLevel();
    });

    expect(level).toEqual(assuranceData);
  });

  it('getAssuranceLevel returns null on error', async () => {
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: new Error('fail') });

    const { result } = renderHook(() => useMFA());

    let level: any;
    await act(async () => {
      level = await result.current.getAssuranceLevel();
    });

    expect(level).toBeNull();
  });

  it('exposes all expected properties', () => {
    const { result } = renderHook(() => useMFA());
    expect(typeof result.current.fetchFactors).toBe('function');
    expect(typeof result.current.enrollTOTP).toBe('function');
    expect(typeof result.current.verifyTOTP).toBe('function');
    expect(typeof result.current.unenroll).toBe('function');
    expect(typeof result.current.getAssuranceLevel).toBe('function');
    expect(typeof result.current.isMFAEnabled).toBe('boolean');
    expect(typeof result.current.loading).toBe('boolean');
    expect(Array.isArray(result.current.factors)).toBe(true);
  });
});
