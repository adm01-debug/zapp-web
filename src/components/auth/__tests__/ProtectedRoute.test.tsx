/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// --- mocks must come before component imports ---

const mockUseAuth = vi.fn();
const mockUseUserRole = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

import { ProtectedRoute } from '../ProtectedRoute';

function renderWithRouter(
  element: React.ReactElement,
  { initialEntries = ['/protected'] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/auth" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockUseUserRole.mockReturnValue({ roles: ['admin'], loading: false, hasRole: (r: string) => r === 'admin' });
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseUserRole.mockReturnValue({ roles: [], loading: false, hasRole: () => false });

    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Verificando acesso...')).toBeInTheDocument();
  });

  it('shows loading spinner while roles are loading', () => {
    mockUseUserRole.mockReturnValue({ roles: [], loading: true, hasRole: () => false });

    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Verificando acesso...')).toBeInTheDocument();
  });

  it('redirects to /auth when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseUserRole.mockReturnValue({ roles: [], loading: false, hasRole: () => false });

    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user is authenticated and no role required', () => {
    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when user has required role', () => {
    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects to / when user lacks required role', () => {
    mockUseUserRole.mockReturnValue({ roles: ['agent'], loading: false, hasRole: (r: string) => r === 'agent' });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('shows fallback when user lacks required role and fallback is provided', () => {
    mockUseUserRole.mockReturnValue({ roles: ['agent'], loading: false, hasRole: (r: string) => r === 'agent' });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']} fallback={<div>No Access</div>}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });

  it('allows access when user has one of multiple required roles', () => {
    mockUseUserRole.mockReturnValue({ roles: ['supervisor'], loading: false, hasRole: (r: string) => r === 'supervisor' });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
        <div>Supervisor Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Supervisor Content')).toBeInTheDocument();
  });

  it('checks permission via RPC and allows access', async () => {
    mockRpc.mockResolvedValue({ data: true });

    renderWithRouter(
      <ProtectedRoute requiredPermission="manage_users">
        <div>Permitted Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Permitted Content')).toBeInTheDocument();
    });
  });

  it('denies access when permission check returns false', async () => {
    mockRpc.mockResolvedValue({ data: false });

    renderWithRouter(
      <ProtectedRoute requiredPermission="manage_users">
        <div>Permitted Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  it('shows fallback when permission denied and fallback provided', async () => {
    mockRpc.mockResolvedValue({ data: false });

    renderWithRouter(
      <ProtectedRoute requiredPermission="manage_users" fallback={<div>Denied Fallback</div>}>
        <div>Permitted Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Denied Fallback')).toBeInTheDocument();
    });
  });

  it('shows loading while permission check is pending', () => {
    mockRpc.mockReturnValue(new Promise(() => {})); // never resolves

    renderWithRouter(
      <ProtectedRoute requiredPermission="manage_users">
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Verificando acesso...')).toBeInTheDocument();
  });

  it('handles permission check error gracefully', async () => {
    mockRpc.mockRejectedValue(new Error('RPC failed'));

    renderWithRouter(
      <ProtectedRoute requiredPermission="manage_users">
        <div>Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  it('checks both role and permission together', async () => {
    mockRpc.mockResolvedValue({ data: true });

    renderWithRouter(
      <ProtectedRoute requiredRoles={['admin']} requiredPermission="manage_users">
        <div>Full Access</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Full Access')).toBeInTheDocument();
    });
  });
});
