import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { ChatPanel } from './ChatPanel';
import { ContactDetails } from './ContactDetails';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFiltersState } from './InboxFilters';
import { GlobalSearch } from './GlobalSearch';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useUndoableAction } from '@/hooks/useUndoableAction';
import { MessageSquare, RefreshCw, WifiOff, Volume2, VolumeX, CheckSquare, Search as SearchIcon, MessageSquarePlus, MoreVertical, Filter, Lock } from 'lucide-react';
import { NewConversationModal } from './NewConversationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const { filters: urlFilters, setFilters: setUrlFilters } = useUrlFilters();
  const { execute: executeUndoable } = useUndoableAction();

  useGlobalSearchShortcut({ onOpen: () => setGlobalSearchOpen(true) });

  const filters = useMemo<InboxFiltersState>(() => ({
    status: urlFilters.status,
    tags: urlFilters.tags,
    agentId: urlFilters.agentId,
    dateRange: {
      from: urlFilters.dateFrom ? parseISO(urlFilters.dateFrom) : null,
      to: urlFilters.dateTo ? parseISO(urlFilters.dateTo) : null,
    },
  }), [urlFilters]);

  const search = urlFilters.search;
  const setSearch = useCallback((value: string) => {
    setUrlFilters({ search: value });
  }, [setUrlFilters]);

  const filteredConversations = useMemo(() => {
    let result = conversations.filter(c => c && c.contact && c.contact.id);

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(searchLower) ||
          c.contact.phone.includes(search) ||
          c.contact.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status.length > 0) {
      result = result.filter((c) => {
        const hasUnread = c.unreadCount > 0;
        if (filters.status.includes('unread') && hasUnread) return true;
        if (filters.status.includes('read') && !hasUnread) return true;
        return false;
      });
    }

    if (filters.tags.length > 0) {
      result = result.filter((c) => {
        const contactTags = c.contact.tags || [];
        return filters.tags.some(tagId => 
          contactTags.some(t => t.toLowerCase().includes(tagId.toLowerCase()))
        );
      });
    }

    if (filters.agentId) {
      result = result.filter((c) => c.contact.assigned_to === filters.agentId);
    }

    if (filters.dateRange.from) {
      result = result.filter((c) => {
        const lastMessageDate = c.lastMessage 
          ? new Date(c.lastMessage.created_at)
          : new Date(c.contact.created_at);
        
        if (filters.dateRange.from && isBefore(lastMessageDate, startOfDay(filters.dateRange.from))) return false;
        if (filters.dateRange.to && isAfter(lastMessageDate, endOfDay(filters.dateRange.to))) return false;
        return true;
      });
    }

    return result;
  }, [conversations, search, filters]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.contact.id === selectedContactId) || null,
    [conversations, selectedContactId]
  );

  const handleSelectConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    markAsRead(contactId);
  };

  const handleGlobalSearchResult = (result: SearchResult) => {
    if (result.contactId) handleSelectConversation(result.contactId);
  };

  const handleNotificationView = () => {
    if (newMessageNotification) {
      handleSelectConversation(newMessageNotification.contactId);
      dismissNotification();
    }
  };

  const toggleSound = () => {
    const newValue = !soundOn;
    setSoundOn(newValue);
    setSoundEnabled(newValue);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedContactId) return;
    try {
      await sendMessage(selectedContactId, content);
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedIds(new Set());
  };

  const toggleSelection = useCallback((contactId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) newSet.delete(contactId);
      else newSet.add(contactId);
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

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

  const bulkTransfer = useCallback(async (type: 'agent' | 'queue', targetId: string, message?: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const contactIds = Array.from(selectedIds);
      const updateData: { assigned_to?: string; queue_id?: string } = {};
      if (type === 'agent') updateData.assigned_to = targetId;
      else updateData.queue_id = targetId;
      const { error } = await supabase.from('contacts').update(updateData).in('id', contactIds);
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

  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const contactIds = Array.from(selectedIds);
    const { data: originalContacts } = await supabase
      .from('contacts').select('id, assigned_to').in('id', contactIds);
    try {
      await executeUndoable({
        successMessage: `${contactIds.length} contato(s) arquivado(s)`,
        undoMessage: 'Arquivamento desfeito',
        action: async () => {
          const { error } = await supabase.from('contacts').update({ assigned_to: null }).in('id', contactIds);
          if (error) throw error;
          clearSelection();
          refetch();
        },
        undoAction: async () => {
          if (originalContacts) {
            for (const contact of originalContacts) {
              await supabase.from('contacts').update({ assigned_to: contact.assigned_to }).eq('id', contact.id);
            }
          }
          refetch();
        },
        onCommit: () => {},
      });
    } catch (err) {
      toast.error('Erro ao arquivar contatos');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch, executeUndoable]);

  const selectAll = useCallback(() => {
    if (!selectionMode) setSelectionMode(true);
    const allIds = new Set(filteredConversations.map(c => c.contact.id));
    setSelectedIds(allIds);
    toast.success(`${allIds.size} conversa(s) selecionada(s)`);
  }, [filteredConversations, selectionMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.getAttribute('contenteditable') === 'true';
      if (isInputField) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionMode && selectedIds.size > 0) { e.preventDefault(); bulkArchive(); }
      if (e.key === 'Escape' && selectionMode) { e.preventDefault(); clearSelection(); }
      if (e.key === 'r' && selectionMode && selectedIds.size > 0 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); bulkMarkAsRead(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAll, bulkArchive, bulkMarkAsRead, clearSelection, selectionMode, selectedIds.size]);

  // Convert to legacy format
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
    <div className="h-full w-full bg-background">
      {/* Green top bar - WhatsApp Web signature */}
      <div className="absolute inset-x-0 top-0 h-[127px] bg-primary z-0" />

      <GlobalSearch 
        open={globalSearchOpen} 
        onOpenChange={setGlobalSearchOpen} 
        onSelectResult={handleGlobalSearchResult}
      />

      <NewMessageIndicator
        show={!!newMessageNotification}
        contactName={newMessageNotification?.contactName || ''}
        contactAvatar={newMessageNotification?.contactAvatar}
        message={newMessageNotification?.message || ''}
        onView={handleNotificationView}
        onDismiss={dismissNotification}
      />

      <NewConversationModal
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationStarted={(contactId) => {
          setSelectedContactId(contactId);
          refetch();
        }}
      />

      <div className={cn(
        'relative z-10 h-full flex flex-col',
        !isMobile && 'py-[19px] px-[19px]'
      )}>
        <div className={cn(
          'flex-1 flex overflow-hidden',
          !isMobile && 'shadow-lg'
        )}>
          {/* LEFT PANEL - conversation list */}
          <div
            className={cn(
              'flex flex-col bg-card',
              isMobile
                ? (selectedContactId ? 'hidden' : 'w-full')
                : 'w-[440px] min-w-[340px] max-w-[500px] flex-shrink-0 border-r border-border'
            )}
          >
            {selectionMode && (
              <BulkActionsToolbar
                selectedCount={selectedIds.size}
                onMarkAsRead={bulkMarkAsRead}
                onTransfer={bulkTransfer}
                onArchive={bulkArchive}
                onClearSelection={clearSelection}
                isLoading={bulkLoading}
              />
            )}

            {/* Sidebar header */}
            <div className="flex items-center justify-between h-[59px] px-4 bg-[hsl(var(--sidebar-header))]">
              <Avatar className="w-10 h-10 cursor-pointer">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-[hsl(var(--avatar-fallback))] text-[hsl(var(--avatar-fallback-foreground))] text-sm font-medium">
                  {(profile?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewConversation(true)}
                  className="w-10 h-10 rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60"
                >
                  <MessageSquarePlus className="w-[22px] h-[22px]" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60"
                    >
                      <MoreVertical className="w-[22px] h-[22px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={toggleSelectionMode}>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {selectionMode ? 'Sair da seleção' : 'Selecionar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleSound}>
                      {soundOn ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                      {soundOn ? 'Desativar som' : 'Ativar som'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={refetch}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search bar */}
            <div className="px-2 py-[7px] bg-card">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground" />
                <Input
                  placeholder="Pesquisar ou começar uma nova conversa"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={() => setGlobalSearchOpen(true)}
                  className="h-[35px] pl-[65px] pr-10 bg-[hsl(var(--sidebar-header))] border-0 rounded-lg text-[13px] cursor-pointer placeholder:text-muted-foreground/70"
                  readOnly
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-muted-foreground hover:bg-transparent"
                >
                  <Filter className="w-[15px] h-[15px]" />
                </Button>
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 h-[72px] border-b border-border">
                      <Skeleton className="w-[49px] h-[49px] rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {search ? 'Nenhuma conversa encontrada' : 'Sem conversas ainda'}
                  </p>
                </div>
              ) : (
                <ErrorBoundary
                  fallback={
                    <div className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Erro ao carregar conversas.</p>
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

          {/* RIGHT PANEL - chat or empty state */}
          <div className={cn(
            'flex-1 min-w-0 flex flex-col',
            isMobile && !selectedContactId && 'hidden'
          )}>
            {legacyConversation ? (
              <div className="h-full flex relative">
                <div className="flex-1 relative">
                  <ChatPanel
                    conversation={legacyConversation}
                    messages={legacyMessages}
                    onSendMessage={handleSendMessage}
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                  />
                </div>
                {showDetails && (
                  <ContactDetails
                    conversation={legacyConversation}
                    onClose={() => setShowDetails(false)}
                  />
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[hsl(var(--sidebar-header))] border-l border-border">
                <div className="text-center max-w-[560px] px-8">
                  {/* WhatsApp Web intro illustration */}
                  <div className="mb-7">
                    <svg viewBox="0 0 303 172" width="250" height="141" className="mx-auto text-muted-foreground/20" fill="currentColor">
                      <path d="M229.565 160.229c32.647-16.024 55.381-48.632 60.2-86.58C298.659 10.244 243.395-17.636 183.242 9.512c-27.546 12.422-49.2 32.5-63.66 55.597-3.825 6.121-10.014 8.882-16.377 8.882H75.768c-5.57 0-9.065 6.27-5.74 10.317 5.726 6.96 12.17 13.378 19.253 19.2 5.463 4.492 5.463 13.09 0 17.582C72.978 136.288 54.412 152.593 42 162.279c-2.711 2.12-.69 6.42 2.691 5.705 18.834-3.973 38.926-8.36 56.873-8.36 21.262 0 39.38 6.86 56.39 13.442 15.69 6.074 30.394 11.77 46.618 11.77 8.791 0 17.25-4.12 24.993-10.607z" opacity=".1"/>
                      <path d="M131.589 68.942H93.12a5.442 5.442 0 00-5.442 5.442v43.127a5.442 5.442 0 005.442 5.442h38.469a5.442 5.442 0 005.442-5.442V74.384a5.442 5.442 0 00-5.442-5.442zm-19.234 47.727a4.364 4.364 0 110-8.728 4.364 4.364 0 010 8.728zm16.325-16.325H96.908V77.03h31.772v23.314z" opacity=".15"/>
                      <path d="M209.565 68.942h-38.469a5.442 5.442 0 00-5.442 5.442v43.127a5.442 5.442 0 005.442 5.442h38.469a5.442 5.442 0 005.442-5.442V74.384a5.442 5.442 0 00-5.442-5.442zm-19.234 47.727a4.364 4.364 0 110-8.728 4.364 4.364 0 010 8.728zm16.325-16.325h-31.772V77.03h31.772v23.314z" opacity=".15"/>
                    </svg>
                  </div>
                  <h2 className="text-[28px] font-light text-foreground/80 mb-2.5 leading-tight tracking-normal">
                    WhatsApp Web
                  </h2>
                  <p className="text-[14px] text-muted-foreground leading-[20px] mb-10">
                    Envie e receba mensagens sem precisar manter seu telefone conectado à internet.
                    <br />
                    Use o WhatsApp em até 4 aparelhos vinculados e 1 telefone ao mesmo tempo.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground/60">
                    <Lock className="w-[12px] h-[12px]" />
                    <span className="text-[12.5px]">Suas mensagens pessoais são protegidas com a criptografia de ponta a ponta</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
