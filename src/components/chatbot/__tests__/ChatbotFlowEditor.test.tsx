/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { ChatbotFlowEditor } from '../ChatbotFlowEditor';
import type { ChatbotFlow } from '@/hooks/useChatbotFlows';

const baseFlow: ChatbotFlow = {
  id: 'f1', name: 'Test Flow', description: 'Test', is_active: true,
  trigger_type: 'keyword', trigger_value: 'test',
  nodes: [
    { id: 'n1', type: 'start', data: { label: 'Inicio' }, position: { x: 0, y: 0 } },
    { id: 'n2', type: 'message', data: { label: 'Mensagem 1', content: 'Ola!' }, position: { x: 0, y: 100 } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  variables: {}, whatsapp_connection_id: null, created_by: null,
  execution_count: 0, last_executed_at: null,
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
};

const emptyFlow: ChatbotFlow = {
  ...baseFlow, id: 'f2', name: 'Empty Flow', nodes: [], edges: [],
};

describe('ChatbotFlowEditor', () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders flow name in toolbar', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Test Flow')).toBeInTheDocument();
  });

  it('shows node count and edge count', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText(/2 nos/)).toBeDefined();
    expect(screen.getByText(/1 conex/)).toBeDefined();
  });

  it('renders existing nodes', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Mensagem 1')).toBeInTheDocument();
  });

  it('shows empty state for flow with no nodes', () => {
    render(<ChatbotFlowEditor flow={emptyFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Fluxo vazio')).toBeInTheDocument();
    expect(screen.getByText('Adicione nos para construir o fluxo')).toBeDefined();
  });

  it('calls onClose when back button is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const backBtn = screen.getAllByRole('button').find(b => b.querySelector('.lucide-arrow-left'));
    expect(backBtn).toBeDefined();
    await userEvent.click(backBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with current nodes and edges', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const saveBtn = screen.getByRole('button', { name: /Salvar/ });
    await userEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toHaveLength(2); // nodes
    expect(onSave.mock.calls[0][1]).toHaveLength(1); // edges
  });

  it('opens add node dialog', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    await userEvent.click(screen.getByText('Adicionar No'));
    expect(screen.getByText('Adicionar No')).toBeDefined();
    expect(screen.getByText('Mensagem')).toBeInTheDocument();
    expect(screen.getByText('Pergunta')).toBeInTheDocument();
    expect(screen.getByText('Aguardar')).toBeInTheDocument();
  });

  it('adds a new message node', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    await userEvent.click(screen.getByText('Adicionar No'));
    // Click the "Mensagem" button in the dialog
    const msgButtons = screen.getAllByText('Mensagem');
    const dialogMsgBtn = msgButtons.find(el => el.closest('button'));
    await userEvent.click(dialogMsgBtn!);
    // Now should have 3 nodes; save and check
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }));
    expect(onSave.mock.calls[0][0]).toHaveLength(3);
  });

  it('does not show delete button on start nodes', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Start node has type 'start' - its card should NOT have a trash button
    // Message node should have one
    const trashButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
    // Only 1 trash (for message node, not start node)
    expect(trashButtons.length).toBe(1);
  });

  it('removes a node when trash is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const trashButtons = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
    await userEvent.click(trashButtons[0]);
    // Should only have 1 node left
    await userEvent.click(screen.getByRole('button', { name: /Salvar/ }));
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
    expect(onSave.mock.calls[0][1]).toHaveLength(0); // edges removed too
  });

  it('shows connection panel when a node is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Click on the start node card
    await userEvent.click(screen.getByText('Inicio'));
    expect(screen.getByText('Conectar a:')).toBeInTheDocument();
  });

  it('shows node content text when present', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Ola!')).toBeInTheDocument();
  });

  it('shows edge connections as badges', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // The start node should show an edge badge pointing to Mensagem 1
    const edgeBadge = screen.getByText(/Mensagem 1/);
    expect(edgeBadge).toBeInTheDocument();
  });

  it('opens edit node dialog', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Click the message-square edit button for a node
    const editBtns = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-message-square'));
    expect(editBtns.length).toBeGreaterThan(0);
    await userEvent.click(editBtns[0]);
    expect(screen.getByText(/Editar No/)).toBeDefined();
  });

  it('adds delay node with default 5s', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    await userEvent.click(screen.getByText('Adicionar No'));
    const delayBtn = screen.getAllByText('Aguardar').find(el => el.closest('button'));
    await userEvent.click(delayBtn!);
    // Check delay seconds shown
    expect(screen.getByText(/Aguardar 5s/)).toBeInTheDocument();
  });

  it('renders question node options as badges', () => {
    const flowWithQuestion: ChatbotFlow = {
      ...baseFlow,
      nodes: [
        { id: 'n1', type: 'question', data: { label: 'Q', options: ['Sim', 'Nao'] }, position: { x: 0, y: 0 } },
      ],
      edges: [],
    };
    render(<ChatbotFlowEditor flow={flowWithQuestion} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Sim')).toBeInTheDocument();
    expect(screen.getByText('Nao')).toBeInTheDocument();
  });
});
