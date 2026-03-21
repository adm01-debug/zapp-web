/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));

const mockProducts = [
  {
    id: 'prod1', name: 'Widget Pro', description: 'A premium widget', price: 49.99,
    currency: 'BRL', image_url: null, category: 'Eletrônicos', sku: 'WP-001',
    stock_quantity: 25, is_active: true, created_at: '2024-01-01',
  },
  {
    id: 'prod2', name: 'Gadget Mini', description: 'A small gadget', price: 19.90,
    currency: 'BRL', image_url: 'https://example.com/img.jpg', category: 'Acessórios', sku: 'GM-002',
    stock_quantity: 3, is_active: true, created_at: '2024-01-02',
  },
  {
    id: 'prod3', name: 'Out of Stock Item', description: null, price: 99.00,
    currency: 'USD', image_url: null, category: 'Eletrônicos', sku: 'OOS-003',
    stock_quantity: 0, is_active: false, created_at: '2024-01-03',
  },
];

function setupMock(products: any[] = mockProducts) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'products') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: products, error: null }),
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: products, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return { select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

// Must import after mocks
import { ProductManagement } from '../ProductManagement';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it('renders the page header with title', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Gerenciar Produtos')).toBeInTheDocument();
    });
  });

  it('shows product count badge', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('3 produtos')).toBeInTheDocument();
    });
  });

  it('renders the Novo Produto button', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Novo Produto')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...')).toBeInTheDocument();
    });
  });

  it('displays product names in the table', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    expect(screen.getByText('Gadget Mini')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
  });

  it('displays product categories as badges', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getAllByText('Eletrônicos').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Acessórios')).toBeInTheDocument();
  });

  it('displays product SKUs', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('WP-001')).toBeInTheDocument();
    });
    expect(screen.getByText('GM-002')).toBeInTheDocument();
  });

  it('formats prices in BRL currency', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      // R$ 49,99 (pt-BR format) - may match in multiple cells
      const matches = screen.getAllByText((_, el) => el?.textContent?.includes('49,99') ?? false);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('shows stock quantities', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows Ativo/Inativo status badges', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('filters products by search term (name)', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...'), {
      target: { value: 'Gadget' },
    });
    // Gadget Mini should remain, Widget Pro should eventually disappear
    expect(screen.getByText('Gadget Mini')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Widget Pro')).not.toBeInTheDocument();
    });
  });

  it('filters products by SKU', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...'), {
      target: { value: 'OOS-003' },
    });
    expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Widget Pro')).not.toBeInTheDocument();
    });
  });

  it('filters products by category', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...'), {
      target: { value: 'Acessórios' },
    });
    expect(screen.getByText('Gadget Mini')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Widget Pro')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when product list is empty', async () => {
    setupMock([]);
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Nenhum produto cadastrado')).toBeInTheDocument();
  });

  it('shows empty state with search message when filter has no results', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...'), {
      target: { value: 'xyznonexistent' },
    });
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
  });

  it('renders table headers correctly', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Produto')).toBeInTheDocument();
    });
    expect(screen.getByText('Categoria')).toBeInTheDocument();
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('Preço')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });

  it('shows loading skeletons initially', () => {
    // Don't resolve the promise immediately
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
    }));
    const { container } = render(<ProductManagement />);
    expect(container.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders product description when available', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('A premium widget')).toBeInTheDocument();
    });
  });

  it('shows clear search button when search is active', async () => {
    render(<ProductManagement />);
    await waitFor(() => {
      expect(screen.getByText('Widget Pro')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, SKU ou categoria...'), {
      target: { value: 'test' },
    });
    // The X button should appear to clear search
    const clearBtns = screen.getAllByRole('button');
    expect(clearBtns.length).toBeGreaterThan(1);
  });
});
