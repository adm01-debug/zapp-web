/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockUseAuth = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: (...args: any[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: any[]) => {
            mockEq(...eqArgs);
            return mockQueryResult;
          },
        };
      },
    }),
  },
}));

let mockQueryResult: any = Promise.resolve({ data: [], error: null });

import { useUserRole } from '@/hooks/useUserRole';

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = Promise.resolve({ data: [], error: null });
  });

  it('returns empty roles when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.roles).toEqual([]);
  });

  it('returns loading false when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('fetches roles for authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.roles).toEqual(['admin']);
  });

  it('sets isAdmin to true for admin role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
    });
  });

  it('sets isSupervisor to true for admin role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isSupervisor).toBe(true);
    });
  });

  it('sets isSupervisor to true for supervisor role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'supervisor' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isSupervisor).toBe(true);
    });
  });

  it('sets isAdmin false for agent role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'agent' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(false);
    });
  });

  it('hasRole returns true for matching role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }, { role: 'supervisor' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.hasRole('admin')).toBe(true);
    });
  });

  it('hasRole returns false for non-matching role', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'agent' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.hasRole('admin')).toBe(false);
  });

  it('handles fetch error gracefully', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: null,
      error: { message: 'DB error' },
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.roles).toEqual([]);
  });

  it('handles multiple roles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }, { role: 'agent' }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.roles).toEqual(['admin', 'agent']);
    });
  });

  it('queries user_roles table with user id', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({ data: [], error: null });

    renderHook(() => useUserRole());

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    });
  });

  it('resets roles when user becomes null', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({
      data: [{ role: 'admin' }],
      error: null,
    });

    const { result, rerender } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.roles).toEqual(['admin']);
    });

    mockUseAuth.mockReturnValue({ user: null });
    rerender();

    await waitFor(() => {
      expect(result.current.roles).toEqual([]);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSupervisor).toBe(false);
    });
  });

  it('exposes refetch function', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockQueryResult = Promise.resolve({ data: [], error: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(typeof result.current.refetch).toBe('function');
  });
});
