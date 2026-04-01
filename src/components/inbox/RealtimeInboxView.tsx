import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useRealtimeMessages, ConversationWithMessages, RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFilters, InboxFiltersState } from './InboxFilters';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useUndoableAction } from '@/hooks/useUndoableAction';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageSquare, RefreshCw, Wifi, WifiOff, Volume2, VolumeX, CheckSquare, Search as SearchIcon, MessageSquarePlus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

// Lazy-load heavy sub-components (only loaded when needed)
const ChatPanel = lazy(() => import('./ChatPanel').then(m => ({ default: m.ChatPanel })));
const ContactDetails = lazy(() => import('./ContactDetails').then(m => ({ default: m.ContactDetails })));
const GlobalSearch = lazy(() => import('./GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const NewConversationModal = lazy(() => import('./NewConversationModal').then(m => ({ default: m.NewConversationModal })));

const ChatFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

const log = getLogger('RealtimeInboxView');

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'transcription';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
}

export function RealtimeInboxView() {
  const { 
    conversations, 
    loading, 
    error, 
    sendMessage, 
    markAsRead, 
    refetch,
    newMessageNotification,
    dismissNotification,
    setSelectedContact,
    setSoundEnabled,
  } = useRealtimeMessages();
  const isMobile = useIsMobile();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // URL-persisted filters
  const { filters: urlFilters, setFilters: setUrlFilters, clearFilters: clearUrlFilters } = useUrlFilters();
  
  // Undoable action hook for bulk operations
  const { execute: executeUndoable } = useUndoableAction();

  // Global search shortcut Ctrl+K
  useGlobalSearchShortcut({ onOpen: () => setGlobalSearchOpen(true) });

  // Convert URL filters to InboxFiltersState
  const filters = useMemo<InboxFiltersState>(() => ({
    status: urlFilters.status,
    tags: urlFilters.tags,
    agentId: urlFilters.agentId,
    dateRange: {
      from: urlFilters.dateFrom ? parseISO(urlFilters.dateFrom) : null,
      to: urlFilters.dateTo ? parseISO(urlFilters.dateTo) : null,
    },
  }), [urlFilters]);

  // Sync search from URL
  const search = urlFilters.search;
  const setSearch = useCallback((value: string) => {
    setUrlFilters({ search: value });
  }, [setUrlFilters]);

  // Update filters and sync to URL
  const setFilters = useCallback((newFilters: InboxFiltersState) => {
    setUrlFilters({
      status: newFilters.status,
      tags: newFilters.tags,
      agentId: newFilters.agentId,
      dateFrom: newFilters.dateRange.from?.toISOString().split('T')[0] || null,
      dateTo: newFilters.dateRange.to?.toISOString().split('T')[0] || null,
    });
  }, [setUrlFilters]);

  // Filter conversations by search and advanced filters
  const filteredConversations = useMemo(() => {
    // Safety: filter out any conversations with missing contact data
    let result = conversations.filter(c => c && c.contact && c.contact.id);

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(searchLower) ||
          c.contact.phone.includes(search) ||
          c.contact.email?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((c) => {
        const hasUnread = c.unreadCount > 0;
        if (filters.status.includes('unread') && hasUnread) return true;
        if (filters.status.includes('read') && !hasUnread) return true;
        return false;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter((c) => {
        const contactTags = c.contact.tags || [];
        return filters.tags.some(tagId => 
          contactTags.some(t => t.toLowerCase().includes(tagId.toLowerCase()))
        );
      });
    }

    // Agent filter
    if (filters.agentId) {
      result = result.filter((c) => c.contact.assigned_to === filters.agentId);
    }

    // Date range filter
    if (filters.dateRange.from) {
      result = result.filter((c) => {
        const lastMessageDate = c.lastMessage 
          ? new Date(c.lastMessage.created_at)
          : new Date(c.contact.created_at);
        
        if (filters.dateRange.from && isBefore(lastMessageDate, startOfDay(filters.dateRange.from))) {
          return false;
        }
        if (filters.dateRange.to && isAfter(lastMessageDate, endOfDay(filters.dateRange.to))) {
          return false;
        }
        return true;
      });
    }

    return result;
  }, [conversations, search, filters]);

  // Get selected conversation
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.contact.id === selectedContactId) || null,
    [conversations, selectedContactId]
  );

  // Handle selecting a conversation
  const handleSelectConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    markAsRead(contactId);
    if (isMobile) {
      setMobileShowChat(true);
    }
  };

  const handleMobileBack = () => {
    setMobileShowChat(false);
  };

  // Handle global search result
  const handleGlobalSearchResult = (result: SearchResult) => {
    if (result.contactId) {
      handleSelectConversation(result.contactId);
    }
  };

  // Handle notification view click
  const handleNotificationView = () => {
    if (newMessageNotification) {
      handleSelectConversation(newMessageNotification.contactId);
      dismissNotification();
    }
  };

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundOn;
    setSoundOn(newValue);
    setSoundEnabled(newValue);
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!selectedContactId) return;

    try {
      await sendMessage(selectedContactId, content);
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  // Toggle item selection
  const toggleSelection = useCallback((contactId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Bulk mark as read
  const bulkMarkAsRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    try {
      const contactIds = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('contact_id', contactIds)
        .eq('is_read', false);
      
      if (error) throw error;
      
      toast.success(`${contactIds.length} conversa(s) marcada(s) como lida(s)`);
      clearSelection();
      refetch();
    } catch (err) {
      toast.error('Erro ao marcar como lido');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch]);

  // Bulk transfer
  const bulkTransfer = useCallback(async (type: 'agent' | 'queue', targetId: string, message?: string) => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    try {
      const contactIds = Array.from(selectedIds);
      
      const updateData: { assigned_to?: string; queue_id?: string } = {};
      if (type === 'agent') {
        updateData.assigned_to = targetId;
      } else {
        updateData.queue_id = targetId;
      }
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .in('id', contactIds);
      
      if (error) throw error;
      
      toast.success(`${contactIds.length} contato(s) transferido(s)`);
      clearSelection();
      refetch();
    } catch (err) {
      toast.error('Erro ao transferir contatos');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch]);

  // Bulk archive with undo capability
  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    const contactIds = Array.from(selectedIds);

    try {
      // Store original assignments for undo
      const { data: originalContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, assigned_to')
        .in('id', contactIds);

      if (fetchError) throw fetchError;

      await executeUndoable({
        successMessage: `${contactIds.length} contato(s) arquivado(s)`,
        undoMessage: 'Arquivamento desfeito',
        action: async () => {
          const { error } = await supabase
            .from('contacts')
            .update({ assigned_to: null })
            .in('id', contactIds);

          if (error) throw error;
          clearSelection();
          refetch();
        },
        undoAction: async () => {
          if (originalContacts) {
            for (const contact of originalContacts) {
              const { error: restoreError } = await supabase
                .from('contacts')
                .update({ assigned_to: contact.assigned_to })
                .eq('id', contact.id);
              if (restoreError) log.error('Error restoring contact:', restoreError);
            }
          }
          refetch();
        },
        onCommit: () => {
          // Action committed after undo period
        },
      });
    } catch (err) {
      toast.error('Erro ao arquivar contatos');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch, executeUndoable]);

  // Select all conversations
  const selectAll = useCallback(() => {
    if (!selectionMode) {
      setSelectionMode(true);
    }
    const allIds = new Set(filteredConversations.map(c => c.contact.id));
    setSelectedIds(allIds);
    toast.success(`${allIds.size} conversa(s) selecionada(s)`);
  }, [filteredConversations, selectionMode]);

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isInputField) return;

      // Ctrl+A or Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Delete or Backspace: Archive selected (only when in selection mode with items selected)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionMode && selectedIds.size > 0) {
        e.preventDefault();
        bulkArchive();
      }

      // Escape: Clear selection
      if (e.key === 'Escape' && selectionMode) {
        e.preventDefault();
        clearSelection();
      }

      // R: Mark as read (only when in selection mode with items selected)
      if (e.key === 'r' && selectionMode && selectedIds.size > 0 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        bulkMarkAsRead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAll, bulkArchive, bulkMarkAsRead, clearSelection, selectionMode, selectedIds.size]);

  // Convert to legacy format for ChatPanel compatibility
  const legacyConversation: Conversation | null = selectedConversation
    ? {
        id: selectedConversation.contact.id,
        contact: {
          id: selectedConversation.contact.id,
          name: selectedConversation.contact.name,
          phone: selectedConversation.contact.phone,
          email: selectedConversation.contact.email || undefined,
          avatar: selectedConversation.contact.avatar_url || undefined,
          tags: selectedConversation.contact.tags || [],
          createdAt: new Date(selectedConversation.contact.created_at),
        },
        lastMessage: selectedConversation.lastMessage
          ? {
              id: selectedConversation.lastMessage.id,
              conversationId: selectedConversation.contact.id,
              content: selectedConversation.lastMessage.content,
              type: selectedConversation.lastMessage.message_type as Message['type'],
              sender: selectedConversation.lastMessage.sender as Message['sender'],
              timestamp: new Date(selectedConversation.lastMessage.created_at),
              status: 'read' as const,
            }
          : undefined,
        unreadCount: selectedConversation.unreadCount,
        status: 'open',
        priority: 'medium',
        tags: selectedConversation.contact.tags || [],
        createdAt: new Date(selectedConversation.contact.created_at),
        updatedAt: new Date(selectedConversation.contact.updated_at),
      }
    : null;

  const legacyMessages: Message[] =
    selectedConversation?.messages.map((m) => ({
      id: m.id,
      conversationId: selectedConversation.contact.id,
      content: m.content,
      type: m.message_type as Message['type'],
      sender: m.sender as Message['sender'],
      agentId: m.agent_id || undefined,
      timestamp: new Date(m.created_at),
      status: m.is_read ? 'read' : 'delivered',
      mediaUrl: m.media_url || undefined,
      transcription: m.transcription || null,
      transcriptionStatus: m.transcription_status as Message['transcriptionStatus'] || null,
    })) || [];

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro de conexão</h3>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative bg-background overflow-hidden">
      {/* Global Search Modal - lazy */}
      {globalSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch 
            open={globalSearchOpen} 
            onOpenChange={setGlobalSearchOpen} 
            onSelectResult={handleGlobalSearchResult}
          />
        </Suspense>
      )}

      {/* New Message Notification Indicator */}
      <NewMessageIndicator
        show={!!newMessageNotification}
        contactName={newMessageNotification?.contactName || ''}
        contactAvatar={newMessageNotification?.contactAvatar}
        message={newMessageNotification?.message || ''}
        onView={handleNotificationView}
        onDismiss={dismissNotification}
      />

      {/* New Conversation Modal - lazy */}
      {showNewConversation && (
        <Suspense fallback={null}>
          <NewConversationModal
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
            onConversationStarted={(contactId) => {
              setSelectedContactId(contactId);
              refetch();
            }}
          />
        </Suspense>
      )}

      {/* Conversation List — full-width on mobile, 320px on desktop */}
      <div className={cn(
        "relative z-10 border-r border-border bg-card flex flex-col",
        isMobile
          ? cn("w-full", mobileShowChat && "hidden")
          : "w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0"
      )}>
        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onMarkAsRead={bulkMarkAsRead}
          onTransfer={bulkTransfer}
          onArchive={bulkArchive}
          onClearSelection={clearSelection}
          isLoading={bulkLoading}
        />

        {/* Header — Compact DreamsChat style */}
        <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Conversas</h2>
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                isOnline 
                  ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]' 
                  : 'bg-destructive/15 text-destructive'
              )}>
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {isOnline ? 'Live' : 'Off'}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleSelectionMode}
                    className={cn(
                      'w-7 h-7',
                      selectionMode ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                    )}
                    aria-label={selectionMode ? 'Sair do modo seleção' : 'Selecionar múltiplos'}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {selectionMode ? 'Sair seleção' : 'Selecionar'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleSound}
                    className={cn('w-7 h-7', soundOn ? 'text-primary' : 'text-muted-foreground')}
                    aria-label={soundOn ? 'Desativar som' : 'Ativar som'}
                  >
                    {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{soundOn ? 'Mudo' : 'Som'}</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={refetch} 
                    disabled={loading}
                    className="w-7 h-7"
                    aria-label="Atualizar"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Atualizar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowNewConversation(true)}
                    className="w-7 h-7 text-primary hover:bg-primary/10"
                    aria-label="Nova conversa"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Nova Conversa</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search bar — DreamsChat rounded pill */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={() => setGlobalSearchOpen(true)}
              className="pl-9 bg-muted/50 border-0 rounded-full h-8 text-xs cursor-pointer placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
              readOnly
            />
          </div>

          {/* Filters */}
          <InboxFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhuma conversa encontrada' : 'Sem conversas'}
              </p>
            </div>
          ) : (
            <ErrorBoundary
              fallback={
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Erro ao carregar. Recarregue.</p>
                </div>
              }
              onError={(error, info) => {
                log.error('VirtualizedRealtimeList crashed:', error.message, error.stack, info);
              }}
            >
              <VirtualizedRealtimeList 
                conversations={filteredConversations}
                selectedContactId={selectedContactId}
                onSelectConversation={handleSelectConversation}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Chat Panel — flexible remaining space; full-width on mobile */}
      <div className={cn(
        "flex-1 flex min-w-0 relative z-10 bg-background",
        isMobile && !mobileShowChat && "hidden"
      )}>
        {legacyConversation ? (
          <Suspense fallback={<ChatFallback />}>
            <>
              <div className="flex-1 min-w-0 relative">
                {/* Mobile back button overlay */}
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMobileBack}
                    className="absolute top-2 left-2 z-30 w-9 h-9 bg-background/80 backdrop-blur-sm rounded-full shadow-sm border border-border/50"
                    aria-label="Voltar para conversas"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <ChatPanel
                  conversation={legacyConversation}
                  messages={legacyMessages}
                  onSendMessage={handleSendMessage}
                  showDetails={showDetails && !isMobile}
                  onToggleDetails={() => setShowDetails(!showDetails)}
                />
              </div>
              {showDetails && !isMobile && (
                <ContactDetails
                  conversation={legacyConversation}
                  onClose={() => setShowDetails(false)}
                />
              )}
            </>
          </Suspense>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Selecione uma conversa
              </h3>
              <p className="text-muted-foreground text-xs max-w-[200px]">
                Escolha uma conversa na lista ao lado para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
