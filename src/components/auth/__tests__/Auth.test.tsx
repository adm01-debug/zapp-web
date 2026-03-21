/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockIsSupported = vi.fn().mockReturnValue(false);
const mockIsPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(false);
const mockAuthenticateWithPasskey = vi.fn();
const mockCheckAccountLock = vi.fn();
const mockRecordFailedLogin = vi.fn();
const mockClearLoginAttempts = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

vi.mock('@/hooks/useWebAuthn', () => ({
  useWebAuthn: () => ({
    isSupported: mockIsSupported,
    isPlatformAuthenticatorAvailable: mockIsPlatformAuthenticatorAvailable,
    authenticateWithPasskey: mockAuthenticateWithPasskey,
    loading: false,
  }),
}));

vi.mock('@/lib/loginAttempts', () => ({
  checkAccountLock: (...args: any[]) => mockCheckAccountLock(...args),
  recordFailedLogin: (...args: any[]) => mockRecordFailedLogin(...args),
  clearLoginAttempts: (...args: any[]) => mockClearLoginAttempts(...args),
  formatLockTime: (s: number) => `${s}s`,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    h1: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <h1 {...rest}>{children}</h1>;
    },
    p: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
    span: ({ children, ...props }: any) => {
      const { animate, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock sub-components
vi.mock('@/components/auth/PasswordInput', () => ({
  PasswordInput: ({ id, ...props }: any) => <input id={id} type="password" {...props} />,
}));

vi.mock('@/components/auth/PasswordStrengthMeter', () => ({
  PasswordStrengthMeter: () => <div data-testid="strength-meter">Strength Meter</div>,
}));

vi.mock('@/components/auth/SocialProof', () => ({
  SocialProof: () => <div data-testid="social-proof">Social Proof</div>,
}));

vi.mock('@/components/auth/HeroBenefits', () => ({
  HeroBenefits: () => <div data-testid="hero-benefits">Hero Benefits</div>,
}));

vi.mock('@/components/ui/micro-interactions', () => ({
  RippleButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

import Auth from '@/pages/Auth';

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={['/auth']}>
      <Auth />
    </MemoryRouter>
  );
}

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAccountLock.mockResolvedValue({ isLocked: false, remainingTime: 0, attempts: 0 });
    mockRecordFailedLogin.mockResolvedValue({ isLocked: false, remainingTime: 0, attempts: 1 });
    mockClearLoginAttempts.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
  });

  it('renders the page title', () => {
    renderAuth();
    expect(screen.getByText('WhatsApp Platform')).toBeInTheDocument();
  });

  it('renders login and signup tabs', () => {
    renderAuth();
    expect(screen.getAllByText('Entrar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Criar Conta').length).toBeGreaterThanOrEqual(1);
  });

  it('renders email and password fields on login tab', () => {
    renderAuth();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderAuth();
    expect(screen.getByText('Esqueci minha senha')).toBeInTheDocument();
  });

  it('renders HeroBenefits component', () => {
    renderAuth();
    expect(screen.getByTestId('hero-benefits')).toBeInTheDocument();
  });

  it('renders SocialProof component', () => {
    renderAuth();
    expect(screen.getByTestId('social-proof')).toBeInTheDocument();
  });

  it('shows validation error for invalid email on login', async () => {
    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'notanemail');
    await userEvent.type(passwordInput, 'password123');

    // Submit the form directly
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password on login', async () => {
    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'user@test.com');
    await userEvent.type(passwordInput, '12345');

    const loginBtn = screen.getAllByRole('button', { name: /Entrar/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText('Senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    });
  });

  it('calls signIn on valid login form submission', async () => {
    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'user@test.com');
    await userEvent.type(passwordInput, 'password123');

    const loginBtn = screen.getAllByRole('button', { name: /Entrar/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'password123');
    });
  });

  it('navigates to / on successful login', async () => {
    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'user@test.com');
    await userEvent.type(passwordInput, 'password123');

    const loginBtn = screen.getAllByRole('button', { name: /Entrar/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('records failed login on signIn error', async () => {
    mockSignIn.mockResolvedValue({ error: new Error('Invalid login credentials') });

    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'user@test.com');
    await userEvent.type(passwordInput, 'wrongpass');

    const loginBtn = screen.getAllByRole('button', { name: /Entrar/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockRecordFailedLogin).toHaveBeenCalledWith('user@test.com');
    });
  });

  it('shows lock warning when account is locked', async () => {
    mockCheckAccountLock.mockResolvedValue({ isLocked: true, remainingTime: 300, attempts: 5 });

    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'locked@test.com');

    await waitFor(() => {
      expect(screen.getByText('Conta bloqueada temporariamente')).toBeInTheDocument();
    });
  });

  it('shows attempts warning when some attempts have been made', async () => {
    mockCheckAccountLock.mockResolvedValue({ isLocked: false, remainingTime: 0, attempts: 3 });

    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'user@test.com');

    await waitFor(() => {
      expect(screen.getByText(/tentativa.*restante/)).toBeInTheDocument();
    });
  });

  it('clears login attempts on successful login', async () => {
    renderAuth();
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(emailInput, 'user@test.com');
    await userEvent.type(passwordInput, 'password123');

    const loginBtn = screen.getAllByRole('button', { name: /Entrar/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockClearLoginAttempts).toHaveBeenCalledWith('user@test.com');
    });
  });

  it('renders copyright text', () => {
    renderAuth();
    expect(screen.getByText(/MultiChat Platform/)).toBeInTheDocument();
  });

  it('renders Google login button', () => {
    renderAuth();
    expect(screen.getByText('Entrar com Google')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    renderAuth();
    expect(screen.getByText('Plataforma omnichannel para atendimento')).toBeInTheDocument();
  });
});
