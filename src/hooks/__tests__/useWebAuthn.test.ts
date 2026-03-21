/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockUseAuth = vi.fn();
const mockFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
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

import { useWebAuthn } from '@/hooks/useWebAuthn';
import { toast } from 'sonner';

describe('useWebAuthn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'test@test.com', user_metadata: { name: 'John' } } });
    // Default mock for from()
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    });
  });

  it('initializes with loading false', () => {
    const { result } = renderHook(() => useWebAuthn());
    expect(result.current.loading).toBe(false);
  });

  it('initializes with empty passkeys', () => {
    const { result } = renderHook(() => useWebAuthn());
    expect(result.current.passkeys).toEqual([]);
  });

  it('isSupported returns false when PublicKeyCredential is undefined', () => {
    const { result } = renderHook(() => useWebAuthn());
    // In jsdom, PublicKeyCredential is not defined
    expect(result.current.isSupported()).toBe(false);
  });

  it('isSupported returns true when PublicKeyCredential exists', () => {
    (window as any).PublicKeyCredential = function () {};
    const { result } = renderHook(() => useWebAuthn());
    expect(result.current.isSupported()).toBe(true);
    delete (window as any).PublicKeyCredential;
  });

  it('isPlatformAuthenticatorAvailable returns false when not supported', async () => {
    const { result } = renderHook(() => useWebAuthn());
    const available = await result.current.isPlatformAuthenticatorAvailable();
    expect(available).toBe(false);
  });

  it('fetchPasskeys queries passkey_credentials table', async () => {
    const { result } = renderHook(() => useWebAuthn());

    await act(async () => {
      await result.current.fetchPasskeys();
    });

    expect(mockFrom).toHaveBeenCalledWith('passkey_credentials');
  });

  it('fetchPasskeys does nothing when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWebAuthn());

    await act(async () => {
      await result.current.fetchPasskeys();
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('registerPasskey fails when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWebAuthn());

    let res: any;
    await act(async () => {
      res = await result.current.registerPasskey();
    });

    expect(res.success).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('registerPasskey fails when WebAuthn not supported', async () => {
    const { result } = renderHook(() => useWebAuthn());

    let res: any;
    await act(async () => {
      res = await result.current.registerPasskey();
    });

    expect(res.success).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('WebAuthn não é suportado neste navegador');
  });

  it('authenticateWithPasskey fails when not supported', async () => {
    const { result } = renderHook(() => useWebAuthn());

    let res: any;
    await act(async () => {
      res = await result.current.authenticateWithPasskey();
    });

    expect(res.success).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('WebAuthn não é suportado neste navegador');
  });

  it('deletePasskey fails when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWebAuthn());

    let res: any;
    await act(async () => {
      res = await result.current.deletePasskey('pk1');
    });

    expect(res.success).toBe(false);
  });

  it('deletePasskey calls supabase delete', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      delete: mockDelete,
    });

    const { result } = renderHook(() => useWebAuthn());

    await act(async () => {
      await result.current.deletePasskey('pk1');
    });

    expect(mockFrom).toHaveBeenCalledWith('passkey_credentials');
    expect(toast.success).toHaveBeenCalledWith('Passkey removida com sucesso');
  });

  it('renamePasskey fails when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWebAuthn());

    let res: any;
    await act(async () => {
      res = await result.current.renamePasskey('pk1', 'New Name');
    });

    expect(res.success).toBe(false);
  });

  it('renamePasskey calls supabase update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      update: mockUpdate,
    });

    const { result } = renderHook(() => useWebAuthn());

    await act(async () => {
      await result.current.renamePasskey('pk1', 'My Key');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ friendly_name: 'My Key' });
    expect(toast.success).toHaveBeenCalledWith('Passkey renomeada');
  });

  it('exposes all expected methods', () => {
    const { result } = renderHook(() => useWebAuthn());
    expect(typeof result.current.isSupported).toBe('function');
    expect(typeof result.current.isPlatformAuthenticatorAvailable).toBe('function');
    expect(typeof result.current.fetchPasskeys).toBe('function');
    expect(typeof result.current.registerPasskey).toBe('function');
    expect(typeof result.current.authenticateWithPasskey).toBe('function');
    expect(typeof result.current.deletePasskey).toBe('function');
    expect(typeof result.current.renamePasskey).toBe('function');
  });
});
