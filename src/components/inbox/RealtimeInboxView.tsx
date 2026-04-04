import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useMessages } from '@/hooks/useMessages';
import { MobilePullToRefreshIndicator } from '@/components/mobile/MobilePullToRefresh';
import { MiniChatPiP } from '@/components/mobile/MiniChatPiP';
import { useRealtimeMessages, ConversationWithMessages, ConversationContact } from '@/hooks/useRealtimeMessages';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFilters } from './InboxFilters';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { useInboxBulkActions } from '@/hooks/useInboxBulkActions';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { MessageSquare, RefreshCw, WifiOff, Search as SearchIcon, MessageSquarePlus, Loader2 } from 'lucide-react';
import { ContactTypeFilter, FILTER_OPTIONS } from './ContactTypeFilter';
import { TicketTabs } from './TicketTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

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
  const isMobile = useIsMobile();
  const { 
    conversations, loading, error, sendMessage, markAsRead, refetch,
    newMessageNotification, dismissNotification, setSelectedContact, setSoundEnabled,
  } = useRealtimeMessages();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactFallback, setSelectedContactFallback] = useState<ConversationContact | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pipContact, setPipContact] = useState<{ name: string; avatar?: string; lastMessage?: string; contactId: string } | null>(null);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { profile } = useAuth();

  const { conversations: cachedConversations, usingCache } = useOfflineCache(conversations, loading);

  // ─── Extracted hooks ───
  const inboxFilters = useInboxFilters({ conversations: cachedConversations, profileId: profile?.id });
  const bulkActions = useInboxBulkActions({ refetch, filteredConversations: inboxFilters.filteredConversations });

  const {
    messages: selectedMessages,
    loading: selectedMessagesLoading,
  } = useMessages({
    contactId: selectedContactId,
    enabled: Boolean(selectedContactId),
  });

  // Pull-to-refresh for mobile
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => { await refetch(); },
    disabled: !isMobile || !!selectedContactId,
  });

  // Global search shortcut Ctrl+K
  useGlobalSearchShortcut({ onOpen: () => setGlobalSearchOpen(true) });

  // Listen for open-contact-chat events
  useEffect(() => {
    const appWindow = window as Window & { __pendingOpenContactId?: string };
    if (appWindow.__pendingOpenContactId) {
      setPendingContactId(appWindow.__pendingOpenContactId);
      appWindow.__pendingOpenContactId = undefined;
    }
    const handler = (e: Event) => {
      const contactId = (e as CustomEvent).detail?.contactId;
      if (contactId) {
        appWindow.__pendingOpenContactId = undefined;
        setPendingContactId(contactId);
      }
    };
    window.addEventListener('open-contact-chat', handler);
    return () => window.removeEventListener('open-contact-chat', handler);
  }, []);

  // Process pending contact selection
  useEffect(() => {
    if (!pendingContactId || loading) return;
    inboxFilters.setMainTab('search');
    inboxFilters.setSubTab('attending');
    setSelectedContactId(pendingContactId);
    setSelectedContact(pendingContactId);
    markAsRead(pendingContactId);
    setPendingContactId(null);
  }, [pendingContactId, loading, conversations, setSelectedContact, markAsRead, inboxFilters]);

  // Load fallback contact when selectedConversation is null
  const selectedConversation = useMemo(
    () => cachedConversations.find((c) => c.contact.id === selectedContactId) || null,
    [cachedConversations, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId) { setSelectedContactFallback(null); return; }
    if (selectedConversation) { setSelectedContactFallback(null); return; }

    let cancelled = false;
    const loadSelectedContact = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedContactId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { log.error('Error loading selected fallback contact:', error); setSelectedContactFallback(null); return; }
      setSelectedContactFallback(data || null);
    };
    loadSelectedContact();
    return () => { cancelled = true; };
  }, [selectedContactId, selectedConversation]);

  const resolvedSelectedConversation = useMemo<ConversationWithMessages | null>(() => {
    if (selectedConversation) return selectedConversation;
    if (!selectedContactFallback) return null;
    return { contact: selectedContactFallback, messages: [], unreadCount: 0, lastMessage: null };
  }, [selectedConversation, selectedContactFallback]);

  // ─── Handlers ───
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

  const toggleSound = () => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); };

  const handleSendMessage = async (content: string) => {
    if (!selectedContactId) return;
    try { await sendMessage(selectedContactId, content); } catch { toast.error('Erro ao enviar mensagem'); }
  };

  const handleSendAudio = async (blob: Blob) => {
    if (!selectedContactId) { toast.error('Selecione uma conversa primeiro'); return; }
    try {
      const fileName = `${selectedContactId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('audio-messages').upload(fileName, blob, { contentType: 'audio/webm' });
      if (uploadError) { log.error('Error uploading audio:', uploadError); toast.error('Erro ao fazer upload do áudio'); return; }
      const { data: signedData, error: signError } = await supabase.storage.from('audio-messages').createSignedUrl(fileName, 3600);
      if (signError || !signedData?.signedUrl) { log.error('Error creating signed URL:', signError); toast.error('Erro ao gerar URL do áudio'); return; }
      await sendMessage(selectedContactId, '[Áudio]', 'audio', signedData.signedUrl);
    } catch (err) { log.error('Error in handleSendAudio:', err); toast.error('Erro ao enviar áudio. Tente novamente.'); }
  };

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.getAttribute('contenteditable') === 'true';
      if (isInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); bulkActions.selectAll(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && bulkActions.selectionMode && bulkActions.selectedIds.size > 0) { e.preventDefault(); bulkActions.bulkArchive(); }
      if (e.key === 'Escape' && bulkActions.selectionMode) { e.preventDefault(); bulkActions.clearSelection(); }
      if (e.key === 'r' && bulkActions.selectionMode && bulkActions.selectedIds.size > 0 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); bulkActions.bulkMarkAsRead(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bulkActions]);

  // Convert to legacy format for ChatPanel compatibility
  const legacyConversation: Conversation | null = resolvedSelectedConversation
    ? {
        id: resolvedSelectedConversation.contact.id,
        contact: {
          id: resolvedSelectedConversation.contact.id,
          name: resolvedSelectedConversation.contact.name,
          phone: resolvedSelectedConversation.contact.phone,
          email: resolvedSelectedConversation.contact.email || undefined,
          avatar: resolvedSelectedConversation.contact.avatar_url || undefined,
          tags: resolvedSelectedConversation.contact.tags || [],
          createdAt: new Date(resolvedSelectedConversation.contact.created_at),
        },
        lastMessage: resolvedSelectedConversation.lastMessage
          ? {
              id: resolvedSelectedConversation.lastMessage.id,
              conversationId: resolvedSelectedConversation.contact.id,
              content: resolvedSelectedConversation.lastMessage.content,
              type: resolvedSelectedConversation.lastMessage.message_type as Message['type'],
              sender: resolvedSelectedConversation.lastMessage.sender as Message['sender'],
              timestamp: new Date(resolvedSelectedConversation.lastMessage.created_at),
              status: 'read' as const,
            }
          : undefined,
        unreadCount: resolvedSelectedConversation.unreadCount,
        status: 'open',
        priority: 'medium',
        tags: resolvedSelectedConversation.contact.tags || [],
        createdAt: new Date(resolvedSelectedConversation.contact.created_at),
        updatedAt: new Date(resolvedSelectedConversation.contact.updated_at),
      }
    : null;

  const messageSource = selectedContactId ? selectedMessages : resolvedSelectedConversation?.messages || [];
  const legacyMessages: Message[] = messageSource.map((m) => ({
    id: m.id,
    conversationId: resolvedSelectedConversation?.contact.id || selectedContactId || '',
    content: m.content,
    type: m.message_type as Message['type'],
    sender: m.sender as Message['sender'],
    agentId: m.agent_id || undefined,
    timestamp: new Date(m.created_at),
    status: (m.status as Message['status'] | null) || (m.is_read ? 'read' : 'delivered'),
    mediaUrl: m.media_url || undefined,
    transcription: m.transcription || null,
    transcriptionStatus: m.transcription_status as Message['transcriptionStatus'] || null,
  }));

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
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
    <div className="flex h-full min-h-0 w-full relative bg-background overflow-hidden">
      {globalSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch 
            open={globalSearchOpen} 
            onOpenChange={setGlobalSearchOpen} 
            onSelectResult={handleGlobalSearchResult as any}
          />
        </Suspense>
      )}

      <NewMessageIndicator
        show={!!newMessageNotification}
        contactName={newMessageNotification?.contactName || ''}
        contactAvatar={newMessageNotification?.contactAvatar}
        message={newMessageNotification?.message || ''}
        onView={handleNotificationView}
        onDismiss={dismissNotification}
      />

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

      {/* Conversation List */}
      <div className={cn(
        'h-full min-h-0 flex-shrink-0 relative z-10 border-r border-border bg-card flex flex-col overflow-hidden',
        isMobile
          ? selectedContactId ? 'hidden' : 'w-full'
          : 'w-[320px] min-w-[320px] max-w-[320px]'
      )}>
        <BulkActionsToolbar
          selectedCount={bulkActions.selectedIds.size}
          onMarkAsRead={bulkActions.bulkMarkAsRead}
          onTransfer={bulkActions.bulkTransfer}
          onArchive={bulkActions.bulkArchive}
          onClearSelection={bulkActions.clearSelection}
          isLoading={bulkActions.bulkLoading}
        />

        <div className={cn("px-3 border-b border-border space-y-1.5 shrink-0", isMobile ? "pt-1.5 pb-1.5" : "pt-2.5 pb-1.5")}>
          {!isMobile && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-semibold text-foreground tracking-tight">Conversas</h2>
                <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-destructive')} />
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={refetch} disabled={loading} className="w-6 h-6" aria-label="Atualizar">
                      <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">Atualizar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowNewConversation(true)} className="w-6 h-6 text-primary hover:bg-primary/10" aria-label="Nova conversa">
                      <MessageSquarePlus className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">Nova Conversa</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {isMobile ? (
              <Button variant="ghost" size="icon" onClick={() => setGlobalSearchOpen(true)} className="w-7 h-7 shrink-0" aria-label="Buscar">
                <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            ) : (
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
                <Input
                  placeholder="Buscar... ⌘K"
                  value={inboxFilters.search}
                  onChange={(e) => inboxFilters.setSearch(e.target.value)}
                  onClick={() => setGlobalSearchOpen(true)}
                  className="pl-7 bg-muted/40 border-0 rounded-md h-7 text-[11px] cursor-pointer placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
                  readOnly
                />
              </div>
            )}
            <div className={cn("shrink-0", isMobile ? "flex-1" : "w-[130px]")}>
              <ContactTypeFilter
                value={inboxFilters.selectedContactType}
                onChange={inboxFilters.handleContactTypeChange}
                conversations={cachedConversations}
              />
            </div>
          </div>

          <TicketTabs
            conversations={conversations}
            mainTab={inboxFilters.mainTab}
            subTab={inboxFilters.subTab}
            onMainTabChange={inboxFilters.setMainTab}
            onSubTabChange={inboxFilters.setSubTab}
            showAll={inboxFilters.showAll}
            onShowAllChange={inboxFilters.setShowAll}
            selectedQueueId={inboxFilters.selectedQueueId}
            onQueueChange={inboxFilters.setSelectedQueueId}
          />

          <InboxFilters filters={inboxFilters.filters} onFiltersChange={inboxFilters.setFilters} />
        </div>

        {isMobile && (
          <MobilePullToRefreshIndicator
            isRefreshing={pullToRefresh.isRefreshing}
            pullProgress={pullToRefresh.pullProgress}
            pullDistance={pullToRefresh.pullDistance}
          />
        )}

        <div
          ref={pullToRefresh.containerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          {...(isMobile ? pullToRefresh.handlers : {})}
        >
          {loading ? (
            <div className="p-3 space-y-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-2.5 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-36" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : inboxFilters.filteredConversations.length === 0 ? (
            (() => {
              const activeOpt = FILTER_OPTIONS.find(o => o.value === (inboxFilters.selectedContactType || 'all'));
              const EmptyIcon = activeOpt?.icon || MessageSquare;
              const emptyMessages: Record<string, string> = {
                individual: 'Nenhum chat individual encontrado',
                grupo: 'Nenhum grupo encontrado',
                grupo_orcamentos: 'Nenhum orçamento em aberto',
                grupo_aprovacao: 'Nenhuma aprovação pendente',
                grupo_os: 'Nenhuma O.S. encontrada',
                grupo_acerto: 'Nenhum acerto pendente',
                grupo_sem_categoria: 'Nenhum grupo sem categoria',
                cliente: 'Nenhum cliente encontrado',
                colaborador: 'Nenhum colaborador encontrado',
                fornecedor: 'Nenhum fornecedor encontrado',
                prestador_servico: 'Nenhum prestador encontrado',
                transportadora: 'Nenhuma transportadora encontrada',
              };
              const msg = inboxFilters.search ? 'Nenhuma conversa encontrada' : emptyMessages[inboxFilters.selectedContactType || ''] || 'Sem conversas';
              return (
                <motion.div key={inboxFilters.selectedContactType || 'all'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-8 text-center">
                  <EmptyIcon className={cn('w-10 h-10 mx-auto mb-3', activeOpt?.iconColor || 'text-muted-foreground/30')} />
                  <p className="text-sm text-muted-foreground">{msg}</p>
                </motion.div>
              );
            })()
          ) : (
            <ErrorBoundary
              fallback={
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Erro ao carregar. Recarregue.</p>
                </div>
              }
              onError={(error, info) => { log.error('VirtualizedRealtimeList crashed:', error.message, error.stack, info); }}
            >
              <VirtualizedRealtimeList 
                conversations={inboxFilters.filteredConversations}
                selectedContactId={selectedContactId}
                onSelectConversation={handleSelectConversation}
                selectionMode={bulkActions.selectionMode}
                selectedIds={bulkActions.selectedIds}
                onToggleSelection={bulkActions.toggleSelection}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={cn(
        'flex-1 flex min-w-0 min-h-0 relative z-10 bg-background h-full overflow-hidden',
        isMobile && !selectedContactId && 'hidden'
      )}>
        {legacyConversation ? (
          <Suspense fallback={<ChatFallback />}>
            <>
              <div className="flex-1 min-w-0 min-h-0 relative h-full overflow-hidden">
                {selectedContactId && selectedMessagesLoading ? (
                  <ChatFallback />
                ) : (
                  <ChatPanel
                    key={legacyConversation.id}
                    conversation={legacyConversation}
                    messages={legacyMessages}
                    onSendMessage={handleSendMessage}
                    onSendAudio={handleSendAudio}
                    showDetails={isMobile ? false : showDetails}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                    onBack={isMobile ? () => {
                      if (legacyConversation) {
                        setPipContact({
                          name: legacyConversation.contact.name,
                          avatar: legacyConversation.contact.avatar,
                          lastMessage: legacyConversation.lastMessage?.content,
                          contactId: legacyConversation.id,
                        });
                      }
                      setSelectedContactId(null);
                    } : undefined}
                  />
                )}
              </div>
              {showDetails && !isMobile && (
                <div className="h-full shrink-0 overflow-hidden">
                  <ContactDetails
                    key={`details-${legacyConversation.id}`}
                    conversation={legacyConversation}
                    onClose={() => setShowDetails(false)}
                  />
                </div>
              )}
            </>
          </Suspense>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background min-h-0 overflow-hidden">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center p-8 max-w-xs">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-9 h-9 text-primary/70" />
                </div>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4 text-accent-foreground/60" />
                </motion.div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Selecione uma conversa</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Escolha uma conversa na lista ao lado para visualizar e responder mensagens</p>
            </motion.div>
          </div>
        )}
      </div>

      {usingCache && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-warning/90 text-warning-foreground text-xs text-center py-1.5 font-medium">
          📡 Modo offline — exibindo dados em cache
        </div>
      )}

      {isMobile && pipContact && !selectedContactId && (
        <MiniChatPiP
          contactName={pipContact.name}
          contactAvatar={pipContact.avatar}
          lastMessage={pipContact.lastMessage}
          isVisible={true}
          onExpand={() => { setSelectedContactId(pipContact.contactId); setPipContact(null); }}
          onDismiss={() => setPipContact(null)}
          onQuickReply={(text) => { sendMessage(pipContact.contactId, text); setPipContact(null); }}
        />
      )}
    </div>
  );
}
