import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInvoke = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'whatsapp_connections') {
        return {
          select: mockSelect.mockReturnValue({
            order: mockOrder.mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === 'connection_health_logs') {
        return {
          select: mockSelect.mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit.mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
    }),
    functions: { invoke: mockInvoke },
    channel: mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: mockRemoveChannel,
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { ConnectionHealthPanel } from '@/components/diagnostics/ConnectionHealthPanel';
import { toast } from 'sonner';

describe('ConnectionHealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('shows loading state initially', () => {
      mockOrder.mockReturnValue(new Promise(() => {}));
      mockLimit.mockReturnValue(new Promise(() => {}));
      render(<ConnectionHealthPanel />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders summary cards after loading', async () => {
      render(<ConnectionHealthPanel />);
      await waitFor(() => {
        expect(screen.getByText('Conexões Saudáveis')).toBeInTheDocument();
        expect(screen.getByText('Tempo Médio')).toBeInTheDocument();
        expect(screen.getByText('Checks (7d)')).toBeInTheDocument();
        expect(screen.getByText('Executar Health Check')).toBeInTheDocument();
      });
    });

    it('shows 0/0 when no connections exist', async () => {
      render(<ConnectionHealthPanel />);
      await waitFor(() => {
        expect(screen.getByText('0/0')).toBeInTheDocument();
        expect(screen.getByText('0ms')).toBeInTheDocument();
      });
    });

    it('shows empty log message when no health checks recorded', async () => {
      render(<ConnectionHealthPanel />);
      await waitFor(() => {
        expect(screen.getByText(/Nenhum health check registrado/)).toBeInTheDocument();
      });
    });
  });

  describe('Health Check Execution', () => {
    it('calls connection-health-check edge function on button click', async () => {
      mockInvoke.mockResolvedValue({ data: { connections: [] }, error: null });

      render(<ConnectionHealthPanel />);
      await waitFor(() => expect(screen.getByText('Executar Health Check')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Executar Health Check'));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('connection-health-check');
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('shows error toast when health check fails', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error('failed') });

      render(<ConnectionHealthPanel />);
      await waitFor(() => expect(screen.getByText('Executar Health Check')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Executar Health Check'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao executar health check');
      });
    });
  });

  describe('Realtime Subscription', () => {
    it('subscribes to health-updates channel on mount', () => {
      render(<ConnectionHealthPanel />);
      expect(mockChannel).toHaveBeenCalledWith('health-updates');
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = render(<ConnectionHealthPanel />);
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });
});
