import { useState, useEffect, useCallback } from 'react';

export interface ShortcutBinding {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  defaultModifiers: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
  customKey?: string;
  customModifiers?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
  category: 'chat' | 'navigation' | 'actions' | 'selection';
}

const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  // Chat shortcuts
  {
    id: 'send-message',
    name: 'Enviar mensagem',
    description: 'Envia a mensagem atual',
    defaultKey: 'Enter',
    defaultModifiers: { ctrlKey: true },
    category: 'chat',
  },
  {
    id: 'ai-suggestions',
    name: 'Sugestões de IA',
    description: 'Abre o painel de sugestões de IA',
    defaultKey: 'i',
    defaultModifiers: { ctrlKey: true },
    category: 'chat',
  },
  {
    id: 'templates',
    name: 'Templates',
    description: 'Abre o menu de templates',
    defaultKey: 't',
    defaultModifiers: { ctrlKey: true },
    category: 'chat',
  },
  {
    id: 'focus-input',
    name: 'Focar no campo',
    description: 'Move o foco para o campo de mensagem',
    defaultKey: '/',
    defaultModifiers: {},
    category: 'chat',
  },
  {
    id: 'emoji-picker',
    name: 'Seletor de Emoji',
    description: 'Abre o seletor de emojis',
    defaultKey: 'e',
    defaultModifiers: { ctrlKey: true },
    category: 'chat',
  },
  {
    id: 'attach-file',
    name: 'Anexar arquivo',
    description: 'Abre o seletor de arquivos',
    defaultKey: 'u',
    defaultModifiers: { ctrlKey: true },
    category: 'chat',
  },
  // Navigation shortcuts
  {
    id: 'global-search',
    name: 'Busca global',
    description: 'Abre a busca global',
    defaultKey: 'k',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  {
    id: 'next-conversation',
    name: 'Próxima conversa',
    description: 'Navega para a próxima conversa',
    defaultKey: 'ArrowDown',
    defaultModifiers: { altKey: true },
    category: 'navigation',
  },
  {
    id: 'prev-conversation',
    name: 'Conversa anterior',
    description: 'Navega para a conversa anterior',
    defaultKey: 'ArrowUp',
    defaultModifiers: { altKey: true },
    category: 'navigation',
  },
  {
    id: 'show-shortcuts-help',
    name: 'Ajuda de atalhos',
    description: 'Mostra todos os atalhos disponíveis',
    defaultKey: '/',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  {
    id: 'toggle-sidebar',
    name: 'Alternar barra lateral',
    description: 'Mostra ou oculta a barra lateral',
    defaultKey: 'b',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  {
    id: 'go-to-inbox',
    name: 'Ir para Inbox',
    description: 'Navega para a caixa de entrada',
    defaultKey: '1',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  {
    id: 'go-to-dashboard',
    name: 'Ir para Dashboard',
    description: 'Navega para o painel principal',
    defaultKey: '2',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  // Action shortcuts
  {
    id: 'mark-resolved',
    name: 'Marcar como resolvido',
    description: 'Marca a conversa atual como resolvida',
    defaultKey: 'r',
    defaultModifiers: { ctrlKey: true, shiftKey: true },
    category: 'actions',
  },
  {
    id: 'transfer-chat',
    name: 'Transferir chat',
    description: 'Abre o diálogo de transferência',
    defaultKey: 't',
    defaultModifiers: { ctrlKey: true, shiftKey: true },
    category: 'actions',
  },
  {
    id: 'archive-chat',
    name: 'Arquivar chat',
    description: 'Arquiva a conversa selecionada',
    defaultKey: 'Delete',
    defaultModifiers: {},
    category: 'actions',
  },
  {
    id: 'pin-conversation',
    name: 'Fixar conversa',
    description: 'Fixa ou desfixa a conversa',
    defaultKey: 'p',
    defaultModifiers: { ctrlKey: true },
    category: 'actions',
  },
  {
    id: 'mute-conversation',
    name: 'Silenciar conversa',
    description: 'Silencia notificações da conversa',
    defaultKey: 'm',
    defaultModifiers: { ctrlKey: true, shiftKey: true },
    category: 'actions',
  },
  {
    id: 'new-message',
    name: 'Nova mensagem',
    description: 'Inicia uma nova conversa',
    defaultKey: 'n',
    defaultModifiers: { ctrlKey: true },
    category: 'actions',
  },
  {
    id: 'refresh-data',
    name: 'Atualizar dados',
    description: 'Recarrega os dados da página',
    defaultKey: 'r',
    defaultModifiers: { ctrlKey: true },
    category: 'actions',
  },
  // Selection shortcuts
  {
    id: 'select-all',
    name: 'Selecionar tudo',
    description: 'Seleciona todas as conversas',
    defaultKey: 'a',
    defaultModifiers: { ctrlKey: true },
    category: 'selection',
  },
  {
    id: 'clear-selection',
    name: 'Limpar seleção',
    description: 'Remove a seleção atual',
    defaultKey: 'Escape',
    defaultModifiers: {},
    category: 'selection',
  },
  {
    id: 'mark-read',
    name: 'Marcar como lido',
    description: 'Marca selecionados como lidos',
    defaultKey: 'r',
    defaultModifiers: {},
    category: 'selection',
  },
  {
    id: 'bulk-archive',
    name: 'Arquivar selecionados',
    description: 'Arquiva todas as conversas selecionadas',
    defaultKey: 'e',
    defaultModifiers: { ctrlKey: true, shiftKey: true },
    category: 'selection',
  },
];

const STORAGE_KEY = 'custom-keyboard-shortcuts';

export function useCustomShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(DEFAULT_SHORTCUTS);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [pendingShortcut, setPendingShortcut] = useState<{ key: string; modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const customBindings = JSON.parse(stored) as Record<string, { key: string; modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } }>;
        setShortcuts(prev => prev.map(shortcut => {
          const custom = customBindings[shortcut.id];
          if (custom) {
            return {
              ...shortcut,
              customKey: custom.key,
              customModifiers: custom.modifiers,
            };
          }
          return shortcut;
        }));
      } catch (e) {
        console.error('Failed to parse stored shortcuts:', e);
      }
    }
  }, []);

  // Save to localStorage
  const saveShortcuts = useCallback((updatedShortcuts: ShortcutBinding[]) => {
    const customBindings: Record<string, { key: string; modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } }> = {};
    updatedShortcuts.forEach(shortcut => {
      if (shortcut.customKey) {
        customBindings[shortcut.id] = {
          key: shortcut.customKey,
          modifiers: shortcut.customModifiers || {},
        };
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings));
  }, []);

  const updateShortcut = useCallback((id: string, key: string, modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => {
        if (shortcut.id === id) {
          return {
            ...shortcut,
            customKey: key,
            customModifiers: modifiers,
          };
        }
        return shortcut;
      });
      saveShortcuts(updated);
      return updated;
    });
  }, [saveShortcuts]);

  const resetShortcut = useCallback((id: string) => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => {
        if (shortcut.id === id) {
          return {
            ...shortcut,
            customKey: undefined,
            customModifiers: undefined,
          };
        }
        return shortcut;
      });
      saveShortcuts(updated);
      return updated;
    });
  }, [saveShortcuts]);

  const resetAllShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getActiveBinding = useCallback((shortcut: ShortcutBinding) => {
    return {
      key: shortcut.customKey || shortcut.defaultKey,
      modifiers: shortcut.customModifiers || shortcut.defaultModifiers,
    };
  }, []);

  const getShortcutById = useCallback((id: string) => {
    return shortcuts.find(s => s.id === id);
  }, [shortcuts]);

  const formatShortcut = useCallback((shortcut: ShortcutBinding) => {
    const binding = getActiveBinding(shortcut);
    const parts: string[] = [];
    if (binding.modifiers.ctrlKey) parts.push('Ctrl');
    if (binding.modifiers.shiftKey) parts.push('Shift');
    if (binding.modifiers.altKey) parts.push('Alt');
    parts.push(binding.key === ' ' ? 'Space' : binding.key);
    return parts;
  }, [getActiveBinding]);

  const startRecording = useCallback((id: string) => {
    setIsRecording(id);
    setPendingShortcut(null);
  }, []);

  const stopRecording = useCallback(() => {
    if (isRecording && pendingShortcut) {
      updateShortcut(isRecording, pendingShortcut.key, pendingShortcut.modifiers);
    }
    setIsRecording(null);
    setPendingShortcut(null);
  }, [isRecording, pendingShortcut, updateShortcut]);

  const cancelRecording = useCallback(() => {
    setIsRecording(null);
    setPendingShortcut(null);
  }, []);

  const recordKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isRecording) return;

    // Ignore modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

    event.preventDefault();
    setPendingShortcut({
      key: event.key,
      modifiers: {
        ctrlKey: event.ctrlKey || undefined,
        shiftKey: event.shiftKey || undefined,
        altKey: event.altKey || undefined,
      },
    });
  }, [isRecording]);

  // Listen for key presses when recording
  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', recordKeyPress);
      return () => window.removeEventListener('keydown', recordKeyPress);
    }
  }, [isRecording, recordKeyPress]);

  const checkConflict = useCallback((id: string, key: string, modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) => {
    return shortcuts.find(s => {
      if (s.id === id) return false;
      const binding = getActiveBinding(s);
      return (
        binding.key.toLowerCase() === key.toLowerCase() &&
        !!binding.modifiers.ctrlKey === !!modifiers.ctrlKey &&
        !!binding.modifiers.shiftKey === !!modifiers.shiftKey &&
        !!binding.modifiers.altKey === !!modifiers.altKey
      );
    });
  }, [shortcuts, getActiveBinding]);

  return {
    shortcuts,
    isRecording,
    pendingShortcut,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    getActiveBinding,
    getShortcutById,
    formatShortcut,
    startRecording,
    stopRecording,
    cancelRecording,
    checkConflict,
  };
}
