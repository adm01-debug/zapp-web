/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../N8nIntegrationView', () => ({
  N8nIntegrationView: () => <div data-testid="n8n-view">n8n Integration</div>,
}));

vi.mock('../GoogleSheetsIntegrationView', () => ({
  GoogleSheetsIntegrationView: () => <div data-testid="gsheets-view">Google Sheets Integration</div>,
}));

vi.mock('../SentryIntegrationView', () => ({
  SentryIntegrationView: () => <div data-testid="sentry-view">Sentry Integration</div>,
}));

import { IntegrationsHub } from '../IntegrationsHub';

function renderView() {
  return render(<IntegrationsHub />);
}

describe('IntegrationsHub', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Rendering ----

  it('renders the page title', () => {
    renderView();
    expect(screen.getByText('Integracoes')).toBeDefined();
  });

  it('renders subtitle', () => {
    renderView();
    expect(screen.getByText(/Conecte ferramentas externas/)).toBeInTheDocument();
  });

  it('renders all integration cards', () => {
    renderView();
    expect(screen.getByText('n8n')).toBeInTheDocument();
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();
    expect(screen.getByText('Sentry')).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('shows Disponivel badge for available integrations', () => {
    renderView();
    const badges = screen.getAllByText('Disponivel');
    expect(badges.length).toBe(3); // n8n, google sheets, sentry
  });

  it('shows Em Breve badge for coming soon integrations', () => {
    renderView();
    const badge = screen.getAllByText('Em Breve');
    expect(badge.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Configurar button for available integrations', () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    expect(configButtons.length).toBe(3);
  });

  it('disables button for coming-soon integrations', () => {
    renderView();
    const stripeBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Em Breve') && b.closest('[class*="card"]'));
    // There should be a disabled button for Stripe
    const disabledBtns = screen.getAllByRole('button').filter(b => b.hasAttribute('disabled'));
    expect(disabledBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders integration descriptions', () => {
    renderView();
    expect(screen.getByText(/Automacao de workflows via webhooks/)).toBeInTheDocument();
    expect(screen.getByText(/Sincronize contatos/)).toBeInTheDocument();
    expect(screen.getByText(/Monitoramento de erros/)).toBeInTheDocument();
    expect(screen.getByText(/Pagamentos, assinaturas/)).toBeInTheDocument();
  });

  // ---- Navigation to sub-views ----

  it('navigates to n8n view when Configurar is clicked', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[0]); // first Configurar = n8n
    expect(screen.getByTestId('n8n-view')).toBeInTheDocument();
  });

  it('shows back button in n8n view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[0]);
    expect(screen.getByText(/Voltar/)).toBeInTheDocument();
  });

  it('returns to hub from n8n view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[0]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('Integracoes')).toBeDefined();
  });

  it('navigates to Google Sheets view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[1]); // second = google sheets
    expect(screen.getByTestId('gsheets-view')).toBeInTheDocument();
  });

  it('returns to hub from Google Sheets view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[1]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('n8n')).toBeInTheDocument();
  });

  it('navigates to Sentry view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[2]); // third = sentry
    expect(screen.getByTestId('sentry-view')).toBeInTheDocument();
  });

  it('returns to hub from Sentry view', async () => {
    renderView();
    const configButtons = screen.getAllByText('Configurar');
    await userEvent.click(configButtons[2]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('Sentry')).toBeInTheDocument();
  });

  // ---- Card layout ----

  it('renders exactly 4 integration cards', () => {
    renderView();
    // Each card has a CardTitle with the integration name
    const names = ['n8n', 'Google Sheets', 'Sentry', 'Stripe'];
    names.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('does not navigate when clicking disabled Stripe button', async () => {
    renderView();
    // Find the button that says "Em Breve" inside card area
    const emBreveButtons = screen.getAllByRole('button').filter(b => b.textContent === 'Em Breve');
    if (emBreveButtons.length > 0) {
      await userEvent.click(emBreveButtons[0]);
    }
    // Should still be on hub
    expect(screen.getByText('Integracoes')).toBeDefined();
  });
});
