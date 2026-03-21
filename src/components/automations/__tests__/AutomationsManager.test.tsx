/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AutomationsManager } from '../AutomationsManager';

function renderView() {
  return render(<AutomationsManager />);
}

describe('AutomationsManager', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Rendering ----

  it('renders the title and description', () => {
    renderView();
    expect(screen.getByText('Automacoes')).toBeDefined();
    expect(screen.getByText(/respostas e acoes automaticas/i)).toBeDefined();
  });

  it('shows empty state when no automations exist', () => {
    renderView();
    expect(screen.getByText('Nenhuma automacao encontrada')).toBeDefined();
  });

  it('shows Nova button', () => {
    renderView();
    expect(screen.getByText('Nova')).toBeInTheDocument();
  });

  // ---- Create Automation ----

  it('opens editor dialog when Nova is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Nova Automacao')).toBeDefined();
  });

  it('shows all form fields in editor dialog', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Nome da Automacao')).toBeDefined();
    expect(screen.getByText(/Gatilho/)).toBeDefined();
    expect(screen.getByText(/Acao/)).toBeDefined();
  });

  it('creates a new automation when form is filled and saved', async () => {
    const { toast } = await import('sonner');
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Test Auto');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Automacao criada!');
    });
  });

  it('shows error toast when saving without name', async () => {
    const { toast } = await import('sonner');
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nome e obrigatorio');
    });
  });

  it('new automation appears in the list after creation', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Minha Automacao');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(screen.getByText('Minha Automacao')).toBeInTheDocument();
    });
  });

  it('new automation starts as active', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Active Auto');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });
  });

  // ---- Toggle ----

  it('toggles automation active status', async () => {
    const { toast } = await import('sonner');
    renderView();
    // Create one first
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Toggle Test');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Toggle Test')).toBeInTheDocument());

    // Toggle the switch
    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[0]);
    expect(toast.success).toHaveBeenCalledWith('Status atualizado!');
  });

  it('toggles from active to inactive', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument());
    const switches = screen.getAllByRole('switch');
    await userEvent.click(switches[0]);
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  // ---- Delete ----

  it('deletes an automation', async () => {
    const { toast } = await import('sonner');
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'To Delete');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('To Delete')).toBeInTheDocument());

    const trashBtns = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
    await userEvent.click(trashBtns[0]);
    expect(toast.success).toHaveBeenCalledWith('Automacao removida!');
    expect(screen.queryByText('To Delete')).not.toBeInTheDocument();
  });

  // ---- Duplicate ----

  it('duplicates an automation with copy suffix', async () => {
    const { toast } = await import('sonner');
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Original');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Original')).toBeInTheDocument());

    const copyBtns = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-copy'));
    await userEvent.click(copyBtns[0]);
    expect(toast.success).toHaveBeenCalledWith('Automacao duplicada!');
    expect(screen.getByText('Original (copia)')).toBeInTheDocument();
  });

  it('duplicated automation is inactive', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Src');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Src')).toBeInTheDocument());

    const copyBtns = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-copy'));
    await userEvent.click(copyBtns[0]);
    const badges = screen.getAllByText('Inativo');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  // ---- Filter ----

  it('renders filter selector with all/active/inactive options', () => {
    renderView();
    // Default filter is "all" -> the SelectTrigger shows "Todas"
    expect(screen.getByText('Todas')).toBeDefined();
  });

  // ---- Action flow display ----

  it('shows trigger and action badges in automation card', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Flow Test');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Flow Test')).toBeInTheDocument());

    expect(screen.getByText('Nova Mensagem')).toBeInTheDocument();
    expect(screen.getByText('Enviar Mensagem')).toBeInTheDocument();
  });

  it('shows execution count', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'Count');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('Count')).toBeInTheDocument());

    expect(screen.getByText('0x executado')).toBeInTheDocument();
  });

  // ---- Edit ----

  it('opens edit dialog when edit button is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    await userEvent.type(screen.getByPlaceholderText(/Boas-vindas/), 'To Edit');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByText('To Edit')).toBeInTheDocument());

    const editBtns = screen.getAllByRole('button').filter(b => b.querySelector('.lucide-edit-2'));
    await userEvent.click(editBtns[0]);
    expect(screen.getByText('Editar Automacao')).toBeDefined();
  });

  // ---- Cancel dialog ----

  it('closes dialog when Cancelar is clicked', async () => {
    renderView();
    await userEvent.click(screen.getByText('Nova'));
    expect(screen.getByText('Nova Automacao')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Nova Automacao')).toBeNull();
  });
});
