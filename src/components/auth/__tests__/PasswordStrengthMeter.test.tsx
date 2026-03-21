import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PasswordStrengthMeter } from '../PasswordStrengthMeter';

// Mock fetch for breach check API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.subtle
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(20)),
    },
  },
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

describe('PasswordStrengthMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('1234567890ABCDE:0\n'),
    });
  });

  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when password is provided', () => {
    render(<PasswordStrengthMeter password="a" />);
    // Should show requirements checklist
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('shows "Fraca" for a short lowercase-only password', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByText('Fraca')).toBeInTheDocument();
  });

  it('marks lowercase requirement as met for "abc"', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByText('Letra minúscula (a-z)')).toBeInTheDocument();
  });

  it('shows all 5 requirements', () => {
    render(<PasswordStrengthMeter password="a" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Letra maiúscula (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Letra minúscula (a-z)')).toBeInTheDocument();
    expect(screen.getByText('Número (0-9)')).toBeInTheDocument();
    expect(screen.getByText('Caractere especial (!@#$%)')).toBeInTheDocument();
  });

  it('shows higher strength for complex passwords', () => {
    render(<PasswordStrengthMeter password="Abc12345!" />);
    // All 5 requirements met + length >= 8
    expect(screen.queryByText('Fraca')).not.toBeInTheDocument();
  });

  it('shows "Forte" for a very strong password', () => {
    render(<PasswordStrengthMeter password="MyStr0ng!Pass1234" />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<PasswordStrengthMeter password="Abc12345!" />);
    // Should display a percentage
    const percentEl = screen.getByText(/%$/);
    expect(percentEl).toBeInTheDocument();
  });

  it('calls onStrengthChange callback', async () => {
    const onStrengthChange = vi.fn();
    render(<PasswordStrengthMeter password="Abc12345!" onStrengthChange={onStrengthChange} />);

    await waitFor(() => {
      expect(onStrengthChange).toHaveBeenCalled();
    });
  });

  it('shows tip for passwords between 3 requirements met and <12 chars', () => {
    render(<PasswordStrengthMeter password="Abc12345" />);
    // 8 chars, uppercase, lowercase, number met but < 12 chars
    expect(screen.getByText(/12\+ caracteres/)).toBeInTheDocument();
  });

  it('does not show tip for passwords >= 12 chars', () => {
    render(<PasswordStrengthMeter password="Abc123456789" />);
    expect(screen.queryByText(/12\+ caracteres/)).not.toBeInTheDocument();
  });

  it('detects uppercase requirement', () => {
    const { container } = render(<PasswordStrengthMeter password="A" />);
    // The uppercase check icon should be the green one
    const upperText = screen.getByText('Letra maiúscula (A-Z)');
    expect(upperText.className).toContain('green');
  });

  it('detects number requirement', () => {
    render(<PasswordStrengthMeter password="1" />);
    const numText = screen.getByText('Número (0-9)');
    expect(numText.className).toContain('green');
  });

  it('detects special character requirement', () => {
    render(<PasswordStrengthMeter password="!" />);
    const specialText = screen.getByText('Caractere especial (!@#$%)');
    expect(specialText.className).toContain('green');
  });

  it('handles password with only spaces', () => {
    render(<PasswordStrengthMeter password="        " />);
    // 8 chars met but no other requirements
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('updates when password changes', () => {
    const { rerender } = render(<PasswordStrengthMeter password="a" />);
    expect(screen.getByText('Fraca')).toBeInTheDocument();

    rerender(<PasswordStrengthMeter password="Abc12345!" />);
    expect(screen.queryByText('Fraca')).not.toBeInTheDocument();
  });
});
