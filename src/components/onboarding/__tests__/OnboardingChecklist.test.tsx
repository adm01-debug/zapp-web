/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Build a chain mock factory that we can recreate per test
function makeChain() {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  return chain;
}

let currentChain = makeChain();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => currentChain),
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
    localStorage.clear();
    // Reset the chain for each test
    currentChain = makeChain();
  });

  it('renders checklist title after loading', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
  });

  it('shows step count text', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText(/de \d+ passos concluídos/)).toBeInTheDocument();
    });
  });

  it('renders checklist steps', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
    });
    expect(screen.getByText('Conecte seu WhatsApp')).toBeInTheDocument();
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

  it('renders compact variant with progress info', async () => {
    render(<OnboardingChecklist compact />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    expect(screen.getByText(/passos concluídos/)).toBeInTheDocument();
  });

  it('returns null when dismissed via localStorage', async () => {
    localStorage.setItem('checklist_dismissed_u1', 'true');
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });

  it('has progress bar element', async () => {
    render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders SVG icons', async () => {
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders card container', async () => {
    const { container } = render(<OnboardingChecklist />);
    await waitFor(() => {
      expect(screen.getByText('Configure sua conta')).toBeInTheDocument();
    });
    const card = container.querySelector('.rounded-xl');
    expect(card).toBeInTheDocument();
  });
});
