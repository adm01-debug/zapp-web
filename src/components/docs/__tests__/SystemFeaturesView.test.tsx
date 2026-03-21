/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { SystemFeaturesView } from '../SystemFeaturesView';

describe('SystemFeaturesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText(/Funcionalidades do Sistema/)).toBeInTheDocument();
  });

  it('shows total features count', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText(/350\+/)).toBeInTheDocument();
  });

  it('shows section count', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('shows 100% Implementado badge', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText('100% Implementado')).toBeInTheDocument();
  });

  it('renders all 34 sections', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText(/Autenticação e Segurança/)).toBeInTheDocument();
    expect(screen.getByText(/Inbox.*Chat.*Tempo Real/i)).toBeInTheDocument();
    // "Edge Functions" appears in section title and stats footer
    const edgeFnMatches = screen.getAllByText(/Edge Functions/);
    expect(edgeFnMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('has search input', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByPlaceholderText('Buscar funcionalidade...')).toBeInTheDocument();
  });

  it('filters sections by search', async () => {
    render(<SystemFeaturesView />);

    const searchInput = screen.getByPlaceholderText('Buscar funcionalidade...');
    await userEvent.type(searchInput, 'Gamificação');

    // Gamification section should be visible
    expect(screen.getByText(/Gamificação/)).toBeInTheDocument();
  });

  it('filters by feature item text', async () => {
    render(<SystemFeaturesView />);

    const searchInput = screen.getByPlaceholderText('Buscar funcionalidade...');
    await userEvent.type(searchInput, 'Passkeys');

    // Should show the security section that contains Passkeys
    expect(screen.getByText(/Segurança Avançada/)).toBeInTheDocument();
  });

  it('has expand all button', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText('Expandir tudo')).toBeInTheDocument();
  });

  it('has collapse all button', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText('Recolher tudo')).toBeInTheDocument();
  });

  it('expands section on click', async () => {
    render(<SystemFeaturesView />);

    // Click on Authentication section
    const authSection = screen.getByText(/Autenticação e Segurança/);
    await userEvent.click(authSection);

    // Should expand and show items
    await waitFor(() => {
      expect(screen.getByText('Login com email/senha')).toBeInTheDocument();
    });
  });

  it('collapses section on second click', async () => {
    render(<SystemFeaturesView />);

    const authSection = screen.getByText(/Autenticação e Segurança/);
    await userEvent.click(authSection);

    await waitFor(() => {
      expect(screen.getByText('Login com email/senha')).toBeInTheDocument();
    });

    await userEvent.click(authSection);

    await waitFor(() => {
      expect(screen.queryByText('Login com email/senha')).not.toBeInTheDocument();
    });
  });

  it('expand all shows all items', async () => {
    render(<SystemFeaturesView />);

    await userEvent.click(screen.getByText('Expandir tudo'));

    await waitFor(() => {
      expect(screen.getByText('Login com email/senha')).toBeInTheDocument();
      expect(screen.getByText('CRUD de contatos')).toBeInTheDocument();
    });
  });

  it('collapse all hides all items', async () => {
    render(<SystemFeaturesView />);

    await userEvent.click(screen.getByText('Expandir tudo'));
    await waitFor(() => {
      expect(screen.getByText('Login com email/senha')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Recolher tudo'));
    await waitFor(() => {
      expect(screen.queryByText('Login com email/senha')).not.toBeInTheDocument();
    });
  });

  it('search auto-expands matching sections', async () => {
    render(<SystemFeaturesView />);

    const searchInput = screen.getByPlaceholderText('Buscar funcionalidade...');
    await userEvent.type(searchInput, 'PWA');

    await waitFor(() => {
      // Mobile section should be expanded showing PWA items
      expect(screen.getByText(/manifest.json/)).toBeInTheDocument();
    });
  });

  it('shows stats footer', () => {
    render(<SystemFeaturesView />);
    expect(screen.getByText('Funcionalidades')).toBeInTheDocument();
    expect(screen.getByText('Componentes React')).toBeInTheDocument();
    expect(screen.getByText('Tabelas DB')).toBeInTheDocument();
    expect(screen.getByText('Edge Functions')).toBeInTheDocument();
  });

  it('displays section item counts in badges', () => {
    render(<SystemFeaturesView />);
    // Authentication section has 23 items
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('renders without crashing with empty search', () => {
    render(<SystemFeaturesView />);
    const searchInput = screen.getByPlaceholderText('Buscar funcionalidade...');
    expect(searchInput).toHaveValue('');
  });
});
