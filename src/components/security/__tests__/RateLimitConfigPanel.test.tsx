import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RateLimitConfigPanel } from '../RateLimitConfigPanel';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      delete: vi.fn(() => ({
        neq: vi.fn().mockResolvedValue({ error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('RateLimitConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== RENDERING =====
  describe('Rendering', () => {
    it('renders title', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByText('Rate Limiting Granular')).toBeInTheDocument();
      });
    });

    it('renders description', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByText(/Configure limites de requisições/)).toBeInTheDocument();
      });
    });

    it('renders add rule button', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByText('Regra')).toBeInTheDocument();
      });
    });

    it('renders save button', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByText('Salvar')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      const { container } = render(<RateLimitConfigPanel />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ===== DEFAULT RULES =====
  describe('Default rules', () => {
    it('loads default rules when DB is empty', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('Login')).toBeInTheDocument();
        expect(screen.getByDisplayValue('API Geral')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Mensagens')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Webhooks')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Exportação')).toBeInTheDocument();
      });
    });

    it('default rules have correct endpoints', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('/auth/login')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/api/*')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/messages/send')).toBeInTheDocument();
      });
    });

    it('renders 5 default rules', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(btn =>
          btn.querySelector('.lucide-trash-2')
        );
        expect(deleteButtons.length).toBe(5);
      });
    });
  });

  // ===== ADD RULE =====
  describe('Add rule', () => {
    it('adds a new rule when add button clicked', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByText('Regra'));
      fireEvent.click(screen.getByText('Regra'));
      await waitFor(() => {
        expect(screen.getByDisplayValue('Nova Regra')).toBeInTheDocument();
      });
    });

    it('new rule has default endpoint /api/custom', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByText('Regra'));
      fireEvent.click(screen.getByText('Regra'));
      await waitFor(() => {
        expect(screen.getByDisplayValue('/api/custom')).toBeInTheDocument();
      });
    });
  });

  // ===== REMOVE RULE =====
  describe('Remove rule', () => {
    it('removes a rule when delete clicked', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByDisplayValue('Login'));
      const deleteButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('.lucide-trash-2')
      );
      const initialCount = deleteButtons.length;
      fireEvent.click(deleteButtons[0]);
      await waitFor(() => {
        const remaining = screen.getAllByRole('button').filter(btn =>
          btn.querySelector('.lucide-trash-2')
        );
        expect(remaining.length).toBe(initialCount - 1);
      });
    });
  });

  // ===== EDIT RULE =====
  describe('Edit rule', () => {
    it('allows editing rule name', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByDisplayValue('Login'));
      const input = screen.getByDisplayValue('Login');
      fireEvent.change(input, { target: { value: 'Auth Login' } });
      expect(screen.getByDisplayValue('Auth Login')).toBeInTheDocument();
    });

    it('allows editing max requests', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByDisplayValue('5'));
      const inputs = screen.getAllByDisplayValue('5');
      fireEvent.change(inputs[0], { target: { value: '10' } });
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('allows editing endpoint', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByDisplayValue('/auth/login'));
      const input = screen.getByDisplayValue('/auth/login');
      fireEvent.change(input, { target: { value: '/auth/v2/login' } });
      expect(screen.getByDisplayValue('/auth/v2/login')).toBeInTheDocument();
    });
  });

  // ===== TOGGLE RULE =====
  describe('Toggle rule', () => {
    it('renders switches for each rule', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBe(5);
      });
    });

    it('shows warning when rule is deactivated', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getAllByRole('switch'));
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);
      await waitFor(() => {
        expect(screen.getByText('Regra desativada')).toBeInTheDocument();
      });
    });
  });

  // ===== ACTION BADGES =====
  describe('Action badges', () => {
    it('renders action badges for rules', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => {
        expect(screen.getAllByText('Bloquear').length).toBeGreaterThan(0);
      });
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('handles NaN input for max_requests', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getByDisplayValue('5'));
      const inputs = screen.getAllByDisplayValue('5');
      fireEvent.change(inputs[0], { target: { value: 'abc' } });
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('handles NaN input for window_seconds', async () => {
      render(<RateLimitConfigPanel />);
      await waitFor(() => screen.getAllByDisplayValue('300'));
      const inputs = screen.getAllByDisplayValue('300');
      fireEvent.change(inputs[0], { target: { value: '' } });
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    });
  });
});
