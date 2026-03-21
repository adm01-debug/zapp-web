/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (data: any) => {
        mockUpdate(data);
        return { eq: (...args: any[]) => { mockEq(...args); return Promise.resolve({ error: null }); } };
      },
    }),
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

import { ForceLogoutButton } from '../ForceLogoutButton';
import { toast } from 'sonner';

describe('ForceLogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the logout button', () => {
    render(<ForceLogoutButton userId="u1" userName="John" />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('has title "Forçar logout"', () => {
    render(<ForceLogoutButton userId="u1" userName="John" />);
    expect(screen.getByTitle('Forçar logout')).toBeInTheDocument();
  });

  it('shows confirmation dialog on click', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ForceLogoutButton userId="u1" userName="John" />);

    await userEvent.click(screen.getByRole('button'));
    expect(confirmSpy).toHaveBeenCalledWith('Tem certeza que deseja forçar logout de John?');
    confirmSpy.mockRestore();
  });

  it('does nothing when user cancels confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ForceLogoutButton userId="u1" userName="John" />);

    await userEvent.click(screen.getByRole('button'));
    expect(mockUpdate).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('calls supabase update when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ForceLogoutButton userId="u1" userName="John" />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    });
    vi.restoreAllMocks();
  });

  it('shows success toast on successful logout', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ForceLogoutButton userId="u1" userName="John" />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Sessão de John invalidada');
    });
    vi.restoreAllMocks();
  });

  it('shows error toast when update fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockEq.mockImplementation(() => Promise.resolve({ error: new Error('DB error') }));

    // Need to re-mock supabase to throw
    const supabaseMod = await import('@/integrations/supabase/client');
    (supabaseMod.supabase.from as any) = () => ({
      update: (data: any) => {
        mockUpdate(data);
        return { eq: () => Promise.resolve({ error: new Error('DB error') }) };
      },
    });

    render(<ForceLogoutButton userId="u1" userName="John" />);
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao invalidar sessão');
    });
    vi.restoreAllMocks();
  });

  it('has destructive styling', () => {
    render(<ForceLogoutButton userId="u1" userName="John" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('destructive');
  });

  it('renders as a small ghost button', () => {
    render(<ForceLogoutButton userId="u1" userName="John" />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('contains an SVG icon (LogOut)', () => {
    const { container } = render(<ForceLogoutButton userId="u1" userName="John" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('button is not disabled by default', () => {
    render(<ForceLogoutButton userId="u1" userName="John" />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
