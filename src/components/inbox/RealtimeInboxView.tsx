import { useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobilePullToRefreshIndicator } from '@/components/mobile/MobilePullToRefresh';
import { MiniChatPiP } from '@/components/mobile/MiniChatPiP';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFilters } from './InboxFilters';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { useInboxBulkActions } from '@/hooks/useInboxBulkActions';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useRealtimeInbox } from '@/hooks/useRealtimeInbox';
import { MessageSquare, RefreshCw, WifiOff, Search as SearchIcon, MessageSquarePlus, Loader2 } from 'lucide-react';
import { ContactTypeFilter, FILTER_OPTIONS } from './ContactTypeFilter';
import { TicketTabs } from './TicketTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getLogger } from '@/lib/logger';

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
  type: 'message' | 'contact' | 'transcription' | 'action' | 'crm';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
  contactName?: string;
  messageType?: string;
  tags?: string[];
  action?: () => void;
  crmPhone?: string;
}

export function RealtimeInboxView() {
  const isMobile = useIsMobile();
  const inbox = useRealtimeInbox();

  const inboxFilters = useInboxFilters({ conversations: inbox.cachedConversations, profileId: inbox.profile?.id });
  const bulkActions = useInboxBulkActions({ refetch: inbox.refetch, filteredConversations: inboxFilters.filteredConversations });

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => { await inbox.refetch(); },
    disabled: !isMobile || !!inbox.selectedContactId,
  });

  useGlobalSearchShortcut({ onOpen: () => inbox.setGlobalSearchOpen(true) });

  // Process pending contact selection
  useEffect(() => {
    if (!inbox.pendingContactId || inbox.loading) return;
    inboxFilters.setMainTab('search');
    inboxFilters.setSubTab('attending');
    inbox.setSelectedContactId(inbox.pendingContactId);
    inbox.setSelectedContact(inbox.pendingContactId);
    inbox.markAsRead(inbox.pendingContactId);
    inbox.setPendingContactId(null);
  }, [inbox.pendingContactId, inbox.loading, inbox.conversations]);

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

  const handleGlobalSearchResult = (result: SearchResult) => {
    if (result.contactId) inbox.handleSelectConversation(result.contactId);
  };

  if (inbox.error) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro de conexão</h3>
          <p className="text-muted-foreground text-sm mb-4">{inbox.error}</p>
          <Button onClick={inbox.refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full relative bg-background overflow-hidden">
      {inbox.globalSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch open={inbox.globalSearchOpen} onOpenChange={inbox.setGlobalSearchOpen} onSelectResult={handleGlobalSearchResult} />
        </Suspense>
      )}

      <NewMessageIndicator
        show={!!inbox.newMessageNotification}
        contactName={inbox.newMessageNotification?.contactName || ''}
        contactAvatar={inbox.newMessageNotification?.contactAvatar}
        message={inbox.newMessageNotification?.message || ''}
        onView={inbox.handleNotificationView}
        onDismiss={inbox.dismissNotification}
      />

      {inbox.showNewConversation && (
        <Suspense fallback={null}>
          <NewConversationModal
            open={inbox.showNewConversation}
            onOpenChange={inbox.setShowNewConversation}
            onConversationStarted={(contactId) => { inbox.setSelectedContactId(contactId); inbox.refetch(); }}
          />
        </Suspense>
      )}

      {/* Conversation List */}
      <div className={cn(
        'h-full min-h-0 flex-shrink-0 relative z-10 border-r border-border bg-card flex flex-col overflow-hidden',
        isMobile ? (inbox.selectedContactId ? 'hidden' : 'w-full') : 'w-[320px] min-w-[320px] max-w-[320px]'
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
                <span className={cn('w-1.5 h-1.5 rounded-full', inbox.isOnline ? 'bg-success' : 'bg-destructive')} />
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={inbox.refetch} disabled={inbox.loading} className="w-7 h-7 rounded-lg hover:bg-muted/60 active:scale-90 transition-all duration-150" aria-label="Atualizar">
                      <RefreshCw className={cn('w-3.5 h-3.5', inbox.loading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-medium">Atualizar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => inbox.setShowNewConversation(true)} className="w-7 h-7 rounded-lg text-primary hover:bg-primary/10 active:scale-90 transition-all duration-150" aria-label="Nova conversa">
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-medium">Nova Conversa</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {isMobile ? (
              <Button variant="ghost" size="icon" onClick={() => inbox.setGlobalSearchOpen(true)} className="w-7 h-7 shrink-0" aria-label="Buscar">
                <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            ) : (
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
                <Input
                  placeholder="Buscar... ⌘K"
                  value={inboxFilters.search}
                  onChange={(e) => inboxFilters.setSearch(e.target.value)}
                  onClick={() => inbox.setGlobalSearchOpen(true)}
                  className="pl-7 bg-muted/40 border-0 rounded-md h-7 text-[11px] cursor-pointer placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
                  readOnly
                />
              </div>
            )}
            <div className={cn("shrink-0", isMobile ? "flex-1" : "w-[130px]")}>
              <ContactTypeFilter value={inboxFilters.selectedContactType} onChange={inboxFilters.handleContactTypeChange} conversations={inbox.cachedConversations} />
            </div>
          </div>

          <TicketTabs
            conversations={inbox.conversations}
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
          {inbox.loading ? (
             <div className="p-3 space-y-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                >
                  <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 rounded-md" style={{ width: `${60 + Math.random() * 40}%` }} />
                      <Skeleton className="h-3 w-10 rounded-md" />
                    </div>
                    <Skeleton className="h-3 rounded-md" style={{ width: `${40 + Math.random() * 30}%` }} />
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
              fallback={<div className="p-8 text-center"><MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Erro ao carregar. Recarregue.</p></div>}
              onError={(error, info) => { log.error('VirtualizedRealtimeList crashed:', error.message, error.stack, info); }}
            >
              <VirtualizedRealtimeList
                conversations={inboxFilters.filteredConversations}
                selectedContactId={inbox.selectedContactId}
                onSelectConversation={inbox.handleSelectConversation}
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
        isMobile && !inbox.selectedContactId && 'hidden'
      )}>
        {inbox.legacyConversation ? (
          <Suspense fallback={<ChatFallback />}>
            <>
              <div className="flex-1 min-w-0 min-h-0 relative h-full overflow-hidden">
                {inbox.selectedContactId && inbox.selectedMessagesLoading ? (
                  <ChatFallback />
                ) : (
                  <SectionErrorBoundary sectionName="Chat" className="h-full">
                    <ChatPanel
                      key={inbox.legacyConversation.id}
                      conversation={inbox.legacyConversation}
                      messages={inbox.legacyMessages}
                      onSendMessage={inbox.handleSendMessage}
                      onSendAudio={inbox.handleSendAudio}
                      showDetails={isMobile ? false : inbox.showDetails}
                      onToggleDetails={() => inbox.setShowDetails(!inbox.showDetails)}
                      onBack={isMobile ? () => {
                        if (inbox.legacyConversation) {
                          inbox.setPipContact({
                            name: inbox.legacyConversation.contact.name,
                            avatar: inbox.legacyConversation.contact.avatar,
                            lastMessage: inbox.legacyConversation.lastMessage?.content,
                            contactId: inbox.legacyConversation.id,
                          });
                        }
                        inbox.setSelectedContactId(null);
                      } : undefined}
                    />
                  </SectionErrorBoundary>
                )}
              </div>
              {inbox.showDetails && !isMobile && (
                <div className="h-full shrink-0 overflow-hidden">
                  <SectionErrorBoundary sectionName="Detalhes do Contato">
                    <ContactDetails
                      key={`details-${inbox.legacyConversation.id}`}
                      conversation={inbox.legacyConversation}
                      onClose={() => inbox.setShowDetails(false)}
                    />
                  </SectionErrorBoundary>
                </div>
              )}
            </>
          </Suspense>
        ) : (
          <InboxEmptyChat />
        )}
      </div>

      {inbox.usingCache && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-warning/90 text-warning-foreground text-xs text-center py-1.5 font-medium">
          📡 Modo offline — exibindo dados em cache
        </div>
      )}

      {isMobile && inbox.pipContact && !inbox.selectedContactId && (
        <MiniChatPiP
          contactName={inbox.pipContact.name}
          contactAvatar={inbox.pipContact.avatar}
          lastMessage={inbox.pipContact.lastMessage}
          isVisible={true}
          onExpand={() => { inbox.setSelectedContactId(inbox.pipContact!.contactId); inbox.setPipContact(null); }}
          onDismiss={() => inbox.setPipContact(null)}
          onQuickReply={(text) => { inbox.handleSendMessage(text); inbox.setPipContact(null); }}
        />
      )}
    </div>
  );
}
