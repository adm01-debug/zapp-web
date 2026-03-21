/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

let mockTags: any[] = [];
let mockIsLoading = false;
const mockCreateTag = vi.fn().mockResolvedValue(undefined);
const mockUpdateTag = vi.fn().mockResolvedValue(undefined);
const mockDeleteTag = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    tags: mockTags,
    isLoading: mockIsLoading,
    createTag: mockCreateTag,
    updateTag: mockUpdateTag,
    deleteTag: mockDeleteTag,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock('@/hooks/useActionFeedback', () => ({
  useActionFeedback: () => ({
    warning: vi.fn(),
    withFeedback: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/tags' }),
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => null,
}));

vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => null,
}));

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...rest } = props;
      return <button ref={ref} {...rest}>{children}</button>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  StaggeredList: ({ children, ...props }: any) => {
    const { initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...rest } = props;
    return <div {...rest}>{children}</div>;
  },
  StaggeredItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/contextual-empty-states', () => ({
  TagsEmptyState: ({ onCreateTag }: any) => (
    <div data-testid="tags-empty-state">
      <button onClick={onCreateTag}>Create Tag</button>
      No tags found
    </div>
  ),
}));

import { TagsView } from '../TagsView';

const sampleTags = [
  { id: 't1', name: 'VIP', color: '#ef4444', description: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01', contact_count: 5 },
  { id: 't2', name: 'Lead Quente', color: '#22c55e', description: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01', contact_count: 3 },
  { id: 't3', name: 'Priority', color: '#3b82f6', description: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01', contact_count: 0 },
];

describe('TagsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTags = [...sampleTags];
    mockIsLoading = false;
  });

  it('renders page title', () => {
    render(<TagsView />);
    expect(screen.getAllByText('Etiquetas').length).toBeGreaterThanOrEqual(1);
  });

  it('renders subtitle', () => {
    render(<TagsView />);
    expect(screen.getByText(/Organize seus contatos/)).toBeInTheDocument();
  });

  it('renders tag names', () => {
    render(<TagsView />);
    expect(screen.getAllByText('VIP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lead Quente')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('renders "Nova Etiqueta" button', () => {
    render(<TagsView />);
    expect(screen.getByText('Nova Etiqueta')).toBeInTheDocument();
  });

  it('shows total tags stat', () => {
    render(<TagsView />);
    expect(screen.getByText('Total de Etiquetas')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows total contacts stat', () => {
    render(<TagsView />);
    expect(screen.getByText('Contatos Etiquetados')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows most used tag stat', () => {
    render(<TagsView />);
    expect(screen.getByText('Mais Usada')).toBeInTheDocument();
  });

  it('shows contact count per tag', () => {
    render(<TagsView />);
    expect(screen.getByText('5 contatos')).toBeInTheDocument();
    expect(screen.getByText('3 contatos')).toBeInTheDocument();
    expect(screen.getByText('0 contatos')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockIsLoading = true;
    render(<TagsView />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no tags', () => {
    mockTags = [];
    render(<TagsView />);
    expect(screen.getByTestId('tags-empty-state')).toBeInTheDocument();
  });

  it('renders stats even when no tags', () => {
    mockTags = [];
    render(<TagsView />);
    expect(screen.getByText('Total de Etiquetas')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('renders stats with dash for most used when no tags', () => {
    mockTags = [];
    render(<TagsView />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders color indicators for each tag', () => {
    render(<TagsView />);
    // Tags render with their color; check that color style is present
    const colorDots = document.querySelectorAll('[style*="background-color"]');
    expect(colorDots.length).toBeGreaterThanOrEqual(1);
  });

  it('renders without crashing with many tags', () => {
    mockTags = Array.from({ length: 50 }, (_, i) => ({
      id: `t${i}`, name: `Tag${i}`, color: '#ccc', description: null,
      created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01', contact_count: i,
    }));
    render(<TagsView />);
    expect(screen.getByText('Tag0')).toBeInTheDocument();
    expect(screen.getByText('Tag49')).toBeInTheDocument();
  });

  it('renders with zero contact_count tags', () => {
    mockTags = [{ ...sampleTags[0], contact_count: 0 }];
    render(<TagsView />);
    expect(screen.getByText('0 contatos')).toBeInTheDocument();
  });

  it('renders breadcrumbs', () => {
    render(<TagsView />);
    expect(screen.getByText('Gestão')).toBeInTheDocument();
  });
});
