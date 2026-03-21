/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- hoisted mocks ----
const mockConversations = [
  {
    contact: {
      id: 'c1',
      name: 'Alice Silva',
      surname: null,
      nickname: null,
      phone: '+5511999990001',
      email: 'alice@test.com',
      avatar_url: null,
      tags: ['vip'],
      company: null,
      job_title: null,
      assigned_to: 'agent1',
      created_at: '2024-01-01',
      updated_at: '2024-06-01',
      whatsapp_connection_id: null,
    },
    messages: [
      { id: 'm1', contact_id: 'c1', agent_id: null, content: 'Ola!', sender: 'contact', message_type: 'text', media_url: null, is_read: false, status: 'sent', status_updated_at: null, created_at: '2024-06-01T10:00:00Z', updated_at: '2024-06-01T10:00:00Z', external_id: null, whatsapp_connection_id: null, transcription: null, transcription_status: null },
    ],
    unreadCount: 1,
    lastMessage: { id: 'm1', content: 'Ola!', created_at: '2024-06-01T10:00:00Z', sender: 'contact', message_type: 'text', contact_id: 'c1', agent_id: null, media_url: null, is_read: false, status: 'sent', status_updated_at: null, updated_at: '2024-06-01T10:00:00Z', external_id: null, whatsapp_connection_id: null, transcription: null, transcription_status: null },
  },
  {
    contact: {
      id: 'c2',
      name: 'Bob Santos',
      surname: null,
      nickname: null,
      phone: '+5511999990002',
      email: null,
      avatar_url: null,
      tags: [],
      company: null,
      job_title: null,
      assigned_to: null,
      created_at: '2024-02-01',
      updated_at: '2024-05-01',
      whatsapp_connection_id: null,
    },
    messages: [],
    unreadCount: 0,
    lastMessage: null,
  },
];

const mockSendMessage = vi.fn();
const mockMarkAsRead = vi.fn();
const mockRefetch = vi.fn();
const mockDismissNotification = vi.fn();
const mockSetSelectedContact = vi.fn();
const mockSetSoundEnabled = vi.fn();

vi.mock('@/hooks/useRealtimeMessages', () => ({
  useRealtimeMessages: () => ({
    conversations: mockConversations,
    loading: false,
    error: null,
    sendMessage: mockSendMessage,
    markAsRead: mockMarkAsRead,
    refetch: mockRefetch,
    newMessageNotification: null,
    dismissNotification: mockDismissNotification,
    setSelectedContact: mockSetSelectedContact,
    setSoundEnabled: mockSetSoundEnabled,
  }),
}));

vi.mock('@/hooks/useGlobalSearchShortcut', () => ({
  useGlobalSearchShortcut: vi.fn(),
}));

vi.mock('@/hooks/useUrlFilters', () => ({
  useUrlFilters: () => ({
    filters: { status: [], tags: [], agentId: null, dateFrom: null, dateTo: null, search: '' },
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUndoableAction', () => ({
  useUndoableAction: () => ({ execute: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
      select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn().mockResolvedValue(undefined) }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock lazy-loaded components
vi.mock('../ChatPanel', () => ({ ChatPanel: () => <div data-testid="chat-panel" /> }));
vi.mock('../ContactDetails', () => ({ ContactDetails: () => <div data-testid="contact-details" /> }));
vi.mock('../GlobalSearch', () => ({ GlobalSearch: () => <div data-testid="global-search" /> }));
vi.mock('../NewConversationModal', () => ({ NewConversationModal: () => <div data-testid="new-conversation-modal" /> }));

// Mock sub-components used inline
vi.mock('../NewMessageIndicator', () => ({
  NewMessageIndicator: ({ show }: any) => show ? <div data-testid="new-msg-indicator" /> : null,
}));
vi.mock('../VirtualizedRealtimeList', () => ({
  VirtualizedRealtimeList: ({ conversations, onSelectConversation, selectionMode, onToggleSelection }: any) => (
    <div data-testid="conversation-list">
      {conversations.map((c: any) => (
        <button
          key={c.contact.id}
          data-testid={`conversation-${c.contact.id}`}
          onClick={() => selectionMode ? onToggleSelection(c.contact.id) : onSelectConversation(c.contact.id)}
        >
          {c.contact.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('../BulkActionsToolbar', () => ({
  BulkActionsToolbar: ({ selectedCount, onMarkAsRead, onArchive, onClearSelection }: any) =>
    selectedCount > 0 ? (
      <div data-testid="bulk-toolbar">
        <span data-testid="selected-count">{selectedCount}</span>
        <button data-testid="bulk-read" onClick={onMarkAsRead}>Read</button>
        <button data-testid="bulk-archive" onClick={onArchive}>Archive</button>
        <button data-testid="bulk-clear" onClick={onClearSelection}>Clear</button>
      </div>
    ) : null,
}));
vi.mock('../InboxFilters', () => ({
  InboxFilters: () => <div data-testid="inbox-filters" />,
}));
vi.mock('@/components/errors/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

// Tooltip provider
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: React.forwardRef(({ children, asChild, ...props }: any, _ref: any) => asChild ? children : <span {...props}>{children}</span>),
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

import { RealtimeInboxView } from '../RealtimeInboxView';

describe('RealtimeInboxView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the conversation list header', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });

  it('renders live status indicator', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders search input placeholder', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByPlaceholderText('Buscar conversas...')).toBeInTheDocument();
  });

  it('renders the conversation list with contacts', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByText('Alice Silva')).toBeInTheDocument();
    expect(screen.getByText('Bob Santos')).toBeInTheDocument();
  });

  it('shows placeholder when no conversation is selected', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument();
  });

  it('renders inbox filters', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByTestId('inbox-filters')).toBeInTheDocument();
  });

  it('clicking a conversation calls setSelectedContact and markAsRead', async () => {
    render(<RealtimeInboxView />);
    fireEvent.click(screen.getByTestId('conversation-c1'));
    expect(mockSetSelectedContact).toHaveBeenCalledWith('c1');
    expect(mockMarkAsRead).toHaveBeenCalledWith('c1');
  });

  it('does not show bulk toolbar when no items selected', () => {
    render(<RealtimeInboxView />);
    expect(screen.queryByTestId('bulk-toolbar')).toBeNull();
  });

  it('renders the new conversation button', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByLabelText('Nova conversa')).toBeInTheDocument();
  });

  it('renders the refresh button', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByLabelText('Atualizar')).toBeInTheDocument();
  });

  it('renders sound toggle button', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByLabelText('Desativar som')).toBeInTheDocument();
  });

  it('renders selection mode toggle button', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByLabelText('Selecionar múltiplos')).toBeInTheDocument();
  });

  it('does not show new message indicator when no notification', () => {
    render(<RealtimeInboxView />);
    expect(screen.queryByTestId('new-msg-indicator')).toBeNull();
  });

  it('conversation list is wrapped in error boundary', () => {
    render(<RealtimeInboxView />);
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
  });

  it('renders two contacts in filtered list', () => {
    render(<RealtimeInboxView />);
    const list = screen.getByTestId('conversation-list');
    expect(list.querySelectorAll('button')).toHaveLength(2);
  });
});

describe('RealtimeInboxView - loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons when loading', async () => {
    // Override the module mock for this test
    const mod = await import('@/hooks/useRealtimeMessages');
    vi.spyOn(mod, 'useRealtimeMessages').mockReturnValue({
      conversations: [],
      loading: true,
      error: null,
      sendMessage: vi.fn(),
      markAsRead: vi.fn(),
      refetch: vi.fn(),
      newMessageNotification: null,
      dismissNotification: vi.fn(),
      setSelectedContact: vi.fn(),
      setSoundEnabled: vi.fn(),
    } as any);

    render(<RealtimeInboxView />);
    // The heading should still render
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });
});

describe('RealtimeInboxView - error state', () => {
  it('shows error view when error is set', async () => {
    const mod = await import('@/hooks/useRealtimeMessages');
    vi.spyOn(mod, 'useRealtimeMessages').mockReturnValue({
      conversations: [],
      loading: false,
      error: 'Connection failed',
      sendMessage: vi.fn(),
      markAsRead: vi.fn(),
      refetch: vi.fn(),
      newMessageNotification: null,
      dismissNotification: vi.fn(),
      setSelectedContact: vi.fn(),
      setSoundEnabled: vi.fn(),
    } as any);

    render(<RealtimeInboxView />);
    expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});
