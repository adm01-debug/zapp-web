/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ----- mock data -----
const mockFlows = [
  {
    id: 'f1', name: 'Boas-vindas', description: 'Fluxo de boas-vindas',
    is_active: true, trigger_type: 'first_message', trigger_value: null,
    nodes: [
      { id: 'n1', type: 'start', data: { label: 'Inicio' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'message', data: { label: 'Msg1', content: 'Ola!' }, position: { x: 0, y: 100 } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    variables: {}, whatsapp_connection_id: null, created_by: null,
    execution_count: 42, last_executed_at: '2024-12-01T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'f2', name: 'Menu Principal', description: 'Fluxo menu',
    is_active: false, trigger_type: 'keyword', trigger_value: 'menu',
    nodes: [], edges: [], variables: {}, whatsapp_connection_id: null, created_by: null,
    execution_count: 0, last_executed_at: null,
    created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'f3', name: 'Webhook Flow', description: null,
    is_active: true, trigger_type: 'webhook', trigger_value: null,
    nodes: [
      { id: 'n1', type: 'start', data: { label: 'Start' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'question', data: { label: 'Q1', options: ['A', 'B'] }, position: { x: 0, y: 100 } },
      { id: 'n3', type: 'delay', data: { label: 'Wait', delaySeconds: 10 }, position: { x: 0, y: 200 } },
      { id: 'n4', type: 'message', data: { label: 'M1' }, position: { x: 0, y: 300 } },
      { id: 'n5', type: 'end', data: { label: 'End' }, position: { x: 0, y: 400 } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    variables: {}, whatsapp_connection_id: null, created_by: null,
    execution_count: 10, last_executed_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
];

const mockCreateFlow = { mutate: vi.fn(), isPending: false };
const mockUpdateFlow = { mutate: vi.fn(), isPending: false };
const mockDeleteFlow = { mutate: vi.fn(), isPending: false };
const mockToggleFlow = { mutate: vi.fn(), isPending: false };

vi.mock('@/hooks/useChatbotFlows', () => ({
  useChatbotFlows: () => ({
    flows: mockFlows,
    isLoading: false,
    createFlow: mockCreateFlow,
    updateFlow: mockUpdateFlow,
    deleteFlow: mockDeleteFlow,
    toggleFlow: mockToggleFlow,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the ChatbotFlowEditor since it's a complex sub-component
vi.mock('../ChatbotFlowEditor', () => ({
  ChatbotFlowEditor: ({ flow, onSave, onClose }: any) => (
    <div data-testid="flow-editor">
      <span>Editor: {flow.name}</span>
      <button onClick={() => onSave([], [])}>Save</button>
      <button onClick={onClose}>Close Editor</button>
    </div>
  ),
}));

import { ChatbotFlowsView } from '../ChatbotFlowsView';

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChatbotFlowsView />
    </QueryClientProvider>,
  );
}

describe('ChatbotFlowsView', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Rendering ----

  it('renders page title', () => {
    renderView();
    expect(screen.getByText('Chatbot Flows')).toBeInTheDocument();
  });

  it('renders flow names', () => {
    renderView();
    expect(screen.getByText('Boas-vindas')).toBeInTheDocument();
    expect(screen.getByText('Menu Principal')).toBeInTheDocument();
    expect(screen.getByText('Webhook Flow')).toBeInTheDocument();
  });

  it('shows active/inactive badges', () => {
    renderView();
    const activeBadges = screen.getAllByText('Ativo');
    const inactiveBadges = screen.getAllByText('Inativo');
    expect(activeBadges.length).toBe(2); // f1 and f3
    expect(inactiveBadges.length).toBe(1); // f2
  });

  it('shows stat cards with correct totals', () => {
    renderView();
    expect(screen.getByText('3')).toBeInTheDocument(); // total
    expect(screen.getByText('2')).toBeInTheDocument(); // active
    expect(screen.getByText('52')).toBeInTheDocument(); // 42+0+10 executions
  });

  it('displays trigger type labels', () => {
    renderView();
    expect(screen.getByText('Primeira mensagem')).toBeInTheDocument();
    expect(screen.getByText('Palavra-chave')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
  });

  it('displays trigger value when present', () => {
    renderView();
    expect(screen.getByText('menu')).toBeInTheDocument();
  });

  it('displays node count per flow', () => {
    renderView();
    expect(screen.getByText('2 nos')).toBeDefined;
    expect(screen.getByText('0 nos')).toBeDefined;
  });

  it('shows execution count per flow', () => {
    renderView();
    expect(screen.getByText('42 exec.')).toBeInTheDocument();
    expect(screen.getByText('0 exec.')).toBeInTheDocument();
    expect(screen.getByText('10 exec.')).toBeInTheDocument();
  });

  it('shows node preview labels for flows with nodes', () => {
    renderView();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Msg1')).toBeInTheDocument();
  });

  it('shows +N for flows with more than 4 nodes', () => {
    renderView();
    // f3 has 5 nodes, shows first 4 + "+1"
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  // ---- Toggle Flow ----

  it('calls toggleFlow when switch is toggled', async () => {
    renderView();
    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[0]); // toggle f1
    expect(mockToggleFlow.mutate).toHaveBeenCalledWith({ id: 'f1', is_active: false });
  });

  // ---- Delete Flow ----

  it('calls deleteFlow when trash button is clicked', async () => {
    renderView();
    const trashButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
    expect(trashButtons.length).toBe(3);
    await userEvent.click(trashButtons[1]); // delete f2
    expect(mockDeleteFlow.mutate).toHaveBeenCalledWith('f2');
  });

  // ---- Create Dialog ----

  it('opens create dialog on Novo Fluxo click', async () => {
    renderView();
    await userEvent.click(screen.getByText('Novo Fluxo'));
    expect(screen.getByText('Novo Fluxo de Chatbot')).toBeInTheDocument();
  });

  it('shows trigger type selection in create dialog', async () => {
    renderView();
    await userEvent.click(screen.getByText('Novo Fluxo'));
    expect(screen.getByText('Tipo de gatilho')).toBeInTheDocument();
  });

  it('disables Criar Fluxo when name is empty', async () => {
    renderView();
    await userEvent.click(screen.getByText('Novo Fluxo'));
    expect(screen.getByRole('button', { name: 'Criar Fluxo' })).toBeDisabled();
  });

  it('calls createFlow.mutate with form data', async () => {
    renderView();
    await userEvent.click(screen.getByText('Novo Fluxo'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Test Flow');
    await userEvent.click(screen.getByRole('button', { name: 'Criar Fluxo' }));
    expect(mockCreateFlow.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreateFlow.mutate.mock.calls[0][0].name).toBe('Test Flow');
  });

  // ---- Search ----

  it('filters flows by search text', async () => {
    renderView();
    await userEvent.type(screen.getByPlaceholderText('Buscar fluxo...'), 'menu');
    expect(screen.getByText('Menu Principal')).toBeInTheDocument();
    expect(screen.queryByText('Boas-vindas')).not.toBeInTheDocument();
  });

  it('shows empty state when no flows match', async () => {
    renderView();
    await userEvent.type(screen.getByPlaceholderText('Buscar fluxo...'), 'xyznotfound');
    expect(screen.getByText('Nenhum fluxo encontrado')).toBeInTheDocument();
  });

  // ---- Flow Editor ----

  it('opens flow editor when edit button is clicked', async () => {
    renderView();
    const editButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-edit-2'));
    await userEvent.click(editButtons[0]);
    expect(screen.getByTestId('flow-editor')).toBeInTheDocument();
    expect(screen.getByText('Editor: Boas-vindas')).toBeInTheDocument();
  });

  it('returns to list view when editor is closed', async () => {
    renderView();
    const editButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-edit-2'));
    await userEvent.click(editButtons[0]);
    await userEvent.click(screen.getByText('Close Editor'));
    expect(screen.getByText('Chatbot Flows')).toBeInTheDocument();
  });

  // ---- Duplicate ----

  it('calls createFlow.mutate for duplication with copy suffix', async () => {
    renderView();
    const copyButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-copy'));
    await userEvent.click(copyButtons[0]);
    expect(mockCreateFlow.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreateFlow.mutate.mock.calls[0][0].name).toContain('(copia)');
  });
});
