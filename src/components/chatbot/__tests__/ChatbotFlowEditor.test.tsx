/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { ChatbotFlowEditor } from '../ChatbotFlowEditor';
import type { ChatbotFlow } from '@/hooks/useChatbotFlows';

/** Find buttons containing an SVG icon with a given class fragment */
function findIconButtons(container: HTMLElement, iconClass: string): HTMLButtonElement[] {
  const svgs = container.querySelectorAll(`[class*="${iconClass}"]`);
  return Array.from(svgs).map(s => s.closest('button')).filter(Boolean) as HTMLButtonElement[];
}

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

  it('calls onClose when back button is clicked', () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const backBtns = findIconButtons(container, 'arrow-left');
    expect(backBtns.length).toBeGreaterThan(0);
    fireEvent.click(backBtns[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with current nodes and edges', () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const saveBtns = findIconButtons(container, 'lucide-save');
    fireEvent.click(saveBtns[0]);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toHaveLength(2);
    expect(onSave.mock.calls[0][1]).toHaveLength(1);
  });

  it('opens add node dialog', async () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const addNodeBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Adicionar Nó')
    );
    expect(addNodeBtn).toBeDefined();
    await userEvent.click(addNodeBtn!);
    expect(screen.getByText('Pergunta')).toBeInTheDocument();
    expect(screen.getByText('Aguardar')).toBeInTheDocument();
  });

  it('adds a new message node', async () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const addNodeBtn = screen.getAllByRole('button').find(
      b => b.textContent?.includes('Adicionar Nó')
    );
    await userEvent.click(addNodeBtn!);
    const msgBtns = screen.getAllByRole('button').filter(
      b => b.textContent?.trim() === 'Mensagem'
    );
    await userEvent.click(msgBtns[0]);
    const saveBtns = findIconButtons(container, 'lucide-save');
    fireEvent.click(saveBtns[0]);
    expect(onSave.mock.calls[0][0]).toHaveLength(3);
  });

  it('does not show delete button on start nodes', () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const trashButtons = findIconButtons(container, 'trash');
    expect(trashButtons.length).toBe(1);
  });

  it('removes a node when trash is clicked', () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const trashButtons = findIconButtons(container, 'trash');
    fireEvent.click(trashButtons[0]);
    const saveBtns = findIconButtons(container, 'lucide-save');
    fireEvent.click(saveBtns[0]);
    expect(onSave.mock.calls[0][0]).toHaveLength(1);
    expect(onSave.mock.calls[0][1]).toHaveLength(0);
  });

  it('shows connection panel when a node is clicked', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByText('Start Node'));
    expect(screen.getByText('Conectar a:')).toBeInTheDocument();
  });

  it('shows node content text when present', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Ola!')).toBeInTheDocument();
  });

  it('shows edge connections as badges', () => {
    render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    expect(screen.getByText(/→ Msg Node 1/)).toBeInTheDocument();
  });

  it('opens edit node dialog', () => {
    const { container } = render(<ChatbotFlowEditor flow={baseFlow} onSave={onSave} onClose={onClose} />);
    const editBtns = findIconButtons(container, 'message-square');
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
