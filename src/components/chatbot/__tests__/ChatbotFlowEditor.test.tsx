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
    { id: 'n1', type: 'start', data: { label: 'Start Node' }, position: { x: 0, y: 0 } },
    { id: 'n2', type: 'message', data: { label: 'Msg Node 1', content: 'Ola!' }, position: { x: 0, y: 100 } },
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
    expect(screen.getByText(/2 nós/)).toBeInTheDocument();
    expect(screen.getByText(/1 conexões/)).toBeInTheDocument();
  });

  it('renders existing nodes', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Start Node')).toBeInTheDocument();
    expect(screen.getByText('Msg Node 1')).toBeInTheDocument();
  });

  it('shows empty state for flow with no nodes', () => {
    render(<ChatbotFlowEditor flow={emptyFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Fluxo vazio')).toBeInTheDocument();
  });

  it('calls onClose when back button is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const backBtn = screen.getAllByRole('button').find(
      b => b.querySelector('.lucide-arrow-left') !== null
    );
    expect(backBtn).toBeDefined();
    fireEvent.click(backBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with current nodes and edges', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const saveBtn = screen.getAllByRole('button').find(
      b => b.querySelector('.lucide-save') !== null
    );
    fireEvent.click(saveBtn!);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toHaveLength(2);
    expect(onSave.mock.calls[0][1]).toHaveLength(1);
  });

  it('opens add node dialog', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Click "Adicionar Nó" button in toolbar
    const addNodeBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Adicionar Nó')
    );
    expect(addNodeBtn).toBeDefined();
    await userEvent.click(addNodeBtn!);
    // Dialog should show node type options
    expect(screen.getByText('Pergunta')).toBeInTheDocument();
    expect(screen.getByText('Aguardar')).toBeInTheDocument();
  });

  it('adds a new message node', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const addNodeBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Adicionar Nó')
    );
    await userEvent.click(addNodeBtn!);
    // Find the "Mensagem" button in the dialog grid
    const msgBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.trim() === 'Mensagem'
    );
    await userEvent.click(msgBtns[0]);
    // Save and check 3 nodes
    const saveBtn = screen.getAllByRole('button').find(
      b => b.querySelector('.lucide-save') !== null
    );
    fireEvent.click(saveBtn!);
    expect(onSave.mock.calls[0][0]).toHaveLength(3);
  });

  it('does not show delete button on start nodes', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const trashButtons = screen.getAllByRole('button').filter(
      b => b.querySelector('.lucide-trash-2') !== null
    );
    // Only message node should have trash (start type excluded)
    expect(trashButtons.length).toBe(1);
  });

  it('removes a node when trash is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const trashButtons = screen.getAllByRole('button').filter(
      b => b.querySelector('.lucide-trash-2') !== null
    );
    fireEvent.click(trashButtons[0]);
    const saveBtn = screen.getAllByRole('button').find(
      b => b.querySelector('.lucide-save') !== null
    );
    fireEvent.click(saveBtn!);
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
    expect(onSave.mock.calls[0][1]).toHaveLength(0);
  });

  it('shows connection panel when a node is clicked', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Click on the start node card area
    fireEvent.click(screen.getByText('Start Node'));
    expect(screen.getByText('Conectar a:')).toBeInTheDocument();
  });

  it('shows node content text when present', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Ola!')).toBeInTheDocument();
  });

  it('shows edge connections as badges', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    // Edge from n1 -> n2, should show target label "Mensagem 1"
    const edgeBadge = screen.getByText(/→ Mensagem 1/);
    expect(edgeBadge).toBeInTheDocument();
  });

  it('opens edit node dialog', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const editBtns = screen.getAllByRole('button').filter(
      b => b.querySelector('.lucide-message-square') !== null
    );
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);
    expect(screen.getByText(/Editar Nó/)).toBeInTheDocument();
  });

  it('adds delay node with default 5s', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const addNodeBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Adicionar Nó')
    );
    await userEvent.click(addNodeBtn!);
    const delayBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.trim() === 'Aguardar'
    );
    await userEvent.click(delayBtns[0]);
    expect(screen.getByText(/Aguardar 5s/)).toBeInTheDocument();
  });

  it('renders question node options as badges', () => {
    const flowWithQuestion: ChatbotFlow = {
      ...baseFlow,
      nodes: [
        { id: 'n1', type: 'question', data: { label: 'Q', options: ['Sim', 'Não'] }, position: { x: 0, y: 0 } },
      ],
      edges: [],
    };
    render(<ChatbotFlowEditor flow={flowWithQuestion} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Sim')).toBeInTheDocument();
    expect(screen.getByText('Não')).toBeInTheDocument();
  });
});
