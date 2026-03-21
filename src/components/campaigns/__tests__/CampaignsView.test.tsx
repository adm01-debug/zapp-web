/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ----- mock data -----
const mockCampaigns = [
  {
    id: 'c1', name: 'Black Friday', description: 'Promo BF', message_content: 'Ola!',
    message_type: 'text', status: 'draft', total_contacts: 100, sent_count: 0,
    delivered_count: 0, read_count: 0, failed_count: 0, target_type: 'all',
    send_interval_seconds: 5, created_at: '2024-11-25T10:00:00Z', updated_at: '2024-11-25T10:00:00Z',
    scheduled_at: null, started_at: null, completed_at: null, media_url: null,
    whatsapp_connection_id: null, created_by: null, target_filter: {},
  },
  {
    id: 'c2', name: 'Natal 2024', description: 'Campanha Natal', message_content: 'Feliz Natal!',
    message_type: 'text', status: 'sending', total_contacts: 200, sent_count: 120,
    delivered_count: 100, read_count: 50, failed_count: 5, target_type: 'tag',
    send_interval_seconds: 10, created_at: '2024-12-20T08:00:00Z', updated_at: '2024-12-20T08:00:00Z',
    scheduled_at: null, started_at: '2024-12-20T09:00:00Z', completed_at: null, media_url: null,
    whatsapp_connection_id: null, created_by: null, target_filter: {},
  },
  {
    id: 'c3', name: 'Ano Novo', description: null, message_content: 'Feliz Ano Novo!',
    message_type: 'text', status: 'completed', total_contacts: 300, sent_count: 300,
    delivered_count: 280, read_count: 200, failed_count: 10, target_type: 'all',
    send_interval_seconds: 5, created_at: '2024-12-31T00:00:00Z', updated_at: '2024-12-31T00:00:00Z',
    scheduled_at: null, started_at: '2024-12-31T00:01:00Z', completed_at: '2024-12-31T01:00:00Z',
    media_url: null, whatsapp_connection_id: null, created_by: null, target_filter: {},
  },
  {
    id: 'c4', name: 'Cancelada', description: 'Teste', message_content: 'test',
    message_type: 'text', status: 'cancelled', total_contacts: 50, sent_count: 10,
    delivered_count: 5, read_count: 2, failed_count: 1, target_type: 'queue',
    send_interval_seconds: 5, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-10-01T00:00:00Z',
    scheduled_at: null, started_at: null, completed_at: null, media_url: null,
    whatsapp_connection_id: null, created_by: null, target_filter: {},
  },
  {
    id: 'c5', name: 'Agendada', description: 'Sched', message_content: 'Soon',
    message_type: 'text', status: 'scheduled', total_contacts: 150, sent_count: 0,
    delivered_count: 0, read_count: 0, failed_count: 0, target_type: 'custom',
    send_interval_seconds: 5, created_at: '2024-11-01T00:00:00Z', updated_at: '2024-11-01T00:00:00Z',
    scheduled_at: '2025-01-01T00:00:00Z', started_at: null, completed_at: null, media_url: null,
    whatsapp_connection_id: null, created_by: null, target_filter: {},
  },
];

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({
    campaigns: mockCampaigns,
    isLoading: false,
    createCampaign: { mutate: mockCreateMutate, isPending: false },
    updateCampaign: { mutate: mockUpdateMutate, isPending: false },
    deleteCampaign: { mutate: mockDeleteMutate, isPending: false },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { CampaignsView } from '../CampaignsView';

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CampaignsView />
    </QueryClientProvider>,
  );
}

describe('CampaignsView', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Rendering ----

  it('renders the page title and description', () => {
    renderView();
    expect(screen.getByText('Campanhas')).toBeInTheDocument();
    expect(screen.getByText(/Envio em massa/)).toBeInTheDocument();
  });

  it('renders all campaign names', () => {
    renderView();
    expect(screen.getByText('Black Friday')).toBeInTheDocument();
    expect(screen.getByText('Natal 2024')).toBeInTheDocument();
    expect(screen.getByText('Ano Novo')).toBeInTheDocument();
  });

  it('renders correct status badges for each campaign', () => {
    renderView();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Enviando')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getByText('Agendada')).toBeInTheDocument();
  });

  it('displays stat cards with correct values', () => {
    renderView();
    // Total campaigns = 5
    expect(screen.getByText('5')).toBeInTheDocument();
    // Active (sending) = 1
    // Completed = 1
    // Total sent = 0+120+300+10+0 = 430
    expect(screen.getByText('430')).toBeInTheDocument();
  });

  it('shows progress bar for sending campaigns', () => {
    renderView();
    // Natal 2024: 120/200 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows progress bar for completed campaigns', () => {
    renderView();
    // Ano Novo: 300/300 = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows failed count for campaigns with errors', () => {
    renderView();
    expect(screen.getByText('5 erros')).toBeInTheDocument();
    expect(screen.getByText('10 erros')).toBeInTheDocument();
  });

  it('displays contact count for each campaign', () => {
    renderView();
    expect(screen.getByText('100 contatos')).toBeInTheDocument();
    expect(screen.getByText('200 contatos')).toBeInTheDocument();
  });

  // ---- Create Campaign Dialog ----

  it('opens create dialog when Nova Campanha is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova Campanha'));
    expect(screen.getByText('Configure sua campanha de broadcast')).toBeInTheDocument();
  });

  it('shows all form fields in create dialog', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova Campanha'));
    expect(screen.getByText('Nome da campanha')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Black Friday/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Breve descrição/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Conteúdo da mensagem/)).toBeInTheDocument();
    expect(screen.getByText('Intervalo entre envios (segundos)')).toBeInTheDocument();
  });

  it('disables Criar Campanha button when name is empty', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova Campanha'));
    const createBtn = screen.getByRole('button', { name: 'Criar Campanha' });
    expect(createBtn).toBeDisabled();
  });

  it('calls createCampaign.mutate with form data', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova Campanha'));
    await userEvent.type(screen.getByPlaceholderText(/Black Friday/), 'Campanha Teste');
    await userEvent.type(screen.getByPlaceholderText(/Conteúdo da mensagem/), 'Oi mundo');
    await userEvent.click(screen.getByRole('button', { name: 'Criar Campanha' }));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateMutate.mock.calls[0][0]).toMatchObject({
      name: 'Campanha Teste',
      message_content: 'Oi mundo',
    });
  });

  it('closes create dialog when Cancelar is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova Campanha'));
    expect(screen.getByText('Configure sua campanha de broadcast')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Configure sua campanha de broadcast')).not.toBeInTheDocument();
  });

  // ---- Actions: start, pause, delete ----

  it('calls updateCampaign with sending when play is clicked on a draft', async () => {
    renderView();
    // The draft campaign (Black Friday) has a play button
    const playButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-play'));
    expect(playButtons.length).toBeGreaterThan(0);
    await userEvent.click(playButtons[0]);
    expect(mockUpdateMutate).toHaveBeenCalledWith({ id: 'c1', status: 'sending' });
  });

  it('calls updateCampaign with paused when pause is clicked on a sending campaign', async () => {
    renderView();
    const pauseButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-pause'));
    expect(pauseButtons.length).toBeGreaterThan(0);
    await userEvent.click(pauseButtons[0]);
    expect(mockUpdateMutate).toHaveBeenCalledWith({ id: 'c2', status: 'paused' });
  });

  it('calls deleteCampaign when trash button is clicked', async () => {
    renderView();
    const trashButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
    expect(trashButtons.length).toBeGreaterThanOrEqual(5);
    await userEvent.click(trashButtons[0]);
    expect(mockDeleteMutate).toHaveBeenCalledWith('c1');
  });

  // ---- Search & Filter ----

  it('filters campaigns by search text', async () => {
    renderView();
    await userEvent.type(screen.getByPlaceholderText('Buscar campanha...'), 'natal');
    expect(screen.getByText('Natal 2024')).toBeInTheDocument();
    expect(screen.queryByText('Black Friday')).not.toBeInTheDocument();
  });

  // ---- Detail Dialog ----

  it('opens detail dialog when campaign card is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Black Friday'));
    expect(screen.getByText('Sem descrição')).toBeDefined;
  });

  // ---- Empty state ----

  it('shows empty state when no campaigns match filter', async () => {
    renderView();
    await userEvent.type(screen.getByPlaceholderText('Buscar campanha...'), 'zzzznotfound');
    expect(screen.getByText('Nenhuma campanha encontrada')).toBeInTheDocument();
  });
});

// ---- Loading state ----
describe('CampaignsView - loading', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows spinner when loading', async () => {
    const mod = await import('@/hooks/useCampaigns');
    vi.spyOn(mod, 'useCampaigns').mockReturnValue({
      campaigns: [],
      isLoading: true,
      createCampaign: { mutate: vi.fn(), isPending: false } as any,
      updateCampaign: { mutate: vi.fn(), isPending: false } as any,
      deleteCampaign: { mutate: vi.fn(), isPending: false } as any,
      addContactsToCampaign: { mutate: vi.fn(), isPending: false } as any,
      refetch: vi.fn() as any,
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <CampaignsView />
      </QueryClientProvider>,
    );
    // Loader2 renders with animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
