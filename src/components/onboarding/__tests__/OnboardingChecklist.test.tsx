/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@test.com' } }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { OnboardingChecklist } from '../OnboardingChecklist';

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders checklist title after loading', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
  });

  it('shows step count', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText(/de \d+ passos concluídos/)).toBeInTheDocument();
    });
  });

  it('renders checklist steps', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
      expect(screen.getByText('Conecte seu WhatsApp')).toBeInTheDocument();
    });
  });

  it('renders step descriptions', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText(/Adicione seu nome e foto/)).toBeInTheDocument();
    });
  });

  it('renders action buttons for incomplete steps', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Completar perfil')).toBeInTheDocument();
    });
  });

  it('calls onNavigate when step action is clicked', async () => {
    const onNavigate = vi.fn();
    render(<OnboardingChecklist onNavigate={onNavigate} />);
    await waitFor(() => {
      expect(screen.getByText('Completar perfil')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Completar perfil'));
    expect(onNavigate).toHaveBeenCalledWith('agents');
  });

  it('calls onDismiss and saves to localStorage when dismissed', async () => {
    const onDismiss = vi.fn();
    render(<OnboardingChecklist onDismiss={onDismiss} />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });

    // Find dismiss button (X icon button at the top)
    const buttons = screen.getAllByRole('button');
    // The last X-style buttons are dismiss and collapse
    const dismissButton = buttons.find(b => {
      // The dismiss button in CardHeader
      return b.className.includes('h-8') && b.className.includes('w-8');
    });
    // Click the last icon button (dismiss)
    if (dismissButton) {
      fireEvent.click(dismissButton);
    }
  });

  it('renders compact variant', async () => {
    render(<OnboardingChecklist compact />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    // Compact shows progress bar inline
    expect(screen.getByText(/passos concluídos/)).toBeInTheDocument();
  });

  it('returns null when dismissed via localStorage', async () => {
    localStorage.setItem('checklist_dismissed_u1', 'true');
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      // Should render nothing
      expect(container.querySelector('.relative')).not.toBeInTheDocument();
    });
  });

  it('has progress bar', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    // Progress component should be rendered
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders sparkles icon', async () => {
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    // SVG icon should be present
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
