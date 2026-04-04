/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Integrações')).toBeInTheDocument();
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
  });

  it('shows Disponivel badge for all integrations', () => {
    renderView();
    const badges = screen.getAllByText('Disponível');
    expect(badges.length).toBe(3);
  });

  it('shows Configurar button for all integrations', () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    expect(configButtons.length).toBe(3);
  });

  it('renders integration descriptions', () => {
    renderView();
    expect(screen.getByText(/Automação de workflows via webhooks/)).toBeInTheDocument();
    expect(screen.getByText(/Sincronize contatos/)).toBeInTheDocument();
    expect(screen.getByText(/Monitoramento de erros/)).toBeInTheDocument();
  });

  // ---- Navigation to sub-views ----

  it('navigates to n8n view when Configurar is clicked', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[0]);
    expect(screen.getByTestId('n8n-view')).toBeInTheDocument();
  });

  it('shows back button in n8n view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[0]);
    expect(screen.getByText(/Voltar/)).toBeInTheDocument();
  });

  it('returns to hub from n8n view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[0]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('Integrações')).toBeInTheDocument();
  });

  it('navigates to Google Sheets view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[1]);
    expect(screen.getByTestId('gsheets-view')).toBeInTheDocument();
  });

  it('returns to hub from Google Sheets view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[1]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('n8n')).toBeInTheDocument();
  });

  it('navigates to Sentry view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[2]);
    expect(screen.getByTestId('sentry-view')).toBeInTheDocument();
  });

  it('returns to hub from Sentry view', async () => {
    renderView();
    const configButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Configurar'));
    await userEvent.click(configButtons[2]);
    await userEvent.click(screen.getByText(/Voltar/));
    expect(screen.getByText('Sentry')).toBeInTheDocument();
  });

  // ---- Card layout ----

  it('renders exactly 3 integration cards', () => {
    renderView();
    const names = ['n8n', 'Google Sheets', 'Sentry'];
    names.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });
});
