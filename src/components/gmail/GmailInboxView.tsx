import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Search, RefreshCw, Pencil, Inbox, Star, Send as SendIcon,
  Archive, Trash2, Tag, Loader2, MailOpen, AlertCircle,
  ChevronRight, Paperclip, Clock
} from 'lucide-react';
import { useGmail, type EmailThread } from '@/hooks/useGmail';
import { GmailProvider, useGmailContext } from './GmailProvider';
import { ErrorBoundaryWithRetry } from '@/components/ui/error-boundary-retry';
import { EmailThreadView } from './EmailThreadView';
import { EmailComposer } from './EmailComposer';

function getInitials(name: string | null | undefined, email?: string): string {
  if (name) return name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (email) return email[0]?.toUpperCase() || '?';
  return '?';
}

function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const ThreadListItem = memo(function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: EmailThread;
  isSelected: boolean;
  onClick: () => void;
}) {
  const displayName = thread.contact?.name || thread.snippet?.split(' ')[0] || 'Desconhecido';

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      aria-label={`${thread.is_unread ? 'Nao lido: ' : ''}${thread.subject || 'Sem assunto'} - ${displayName} - ${thread.message_count} mensagens`}
      role="row"
      className={`w-full text-left p-3 flex items-start gap-3 transition-colors border-b border-secondary/10 ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-secondary/5'
      } ${thread.is_unread ? '' : 'opacity-80'}`}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback className={`text-xs ${thread.is_unread ? 'bg-primary/10 text-primary font-bold' : 'bg-secondary/20'}`}>
          {getInitials(thread.contact?.name, thread.contact?.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm truncate ${thread.is_unread ? 'font-semibold' : 'font-normal'}`}>
            {displayName}
          </span>
          {thread.message_count > 1 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
              {thread.message_count}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {thread.last_message_at && formatThreadDate(thread.last_message_at)}
          </span>
        </div>

        <p className={`text-xs truncate ${thread.is_unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {thread.subject || '(Sem assunto)'}
        </p>

        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[10px] text-muted-foreground truncate flex-1">
            {thread.snippet}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            {thread.is_starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {thread.is_important && <AlertCircle className="w-3 h-3 text-orange-500" />}
          </div>
        </div>

        {thread.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {thread.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
});

function GmailInboxContent() {
  const {
    accounts,
    activeAccount,
    threads,
    threadsLoading,
    threadsError,
    labels,
    syncInbox,
    unreadCount,
    starredCount,
    subscribeToThreads,
  } = useGmailContext();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  // Derive thread from array to avoid stale snapshots
  const selectedThread = useMemo(
    () => selectedThreadId ? threads.find(t => t.id === selectedThreadId) || null : null,
    [selectedThreadId, threads]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced server-side search — triggers Gmail API search after 800ms of inactivity
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length >= 3) {
      searchTimerRef.current = setTimeout(() => {
        syncInbox.mutate({ query: value, maxResults: 50 });
      }, 800);
    }
  }, [syncInbox]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToThreads();
    return unsubscribe;
  }, [subscribeToThreads]);

  // Filter threads
  const filteredThreads = useMemo(() => {
    let result = threads;

    // Tab filter
    if (activeTab === 'starred') {
      result = result.filter(t => t.is_starred);
    } else if (activeTab === 'sent') {
      result = result.filter(t => t.label_ids?.includes('SENT'));
    } else if (activeTab === 'unread') {
      result = result.filter(t => t.is_unread);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Label filter
    if (selectedLabel) {
      result = result.filter(t => t.label_ids?.includes(selectedLabel));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.snippet?.toLowerCase().includes(q) ||
        t.contact?.name?.toLowerCase().includes(q) ||
        t.contact?.email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [threads, activeTab, statusFilter, searchQuery, selectedLabel]);

  // If a thread is selected, show thread view
  if (selectedThread) {
    return (
      <ErrorBoundaryWithRetry moduleName="EmailThreadView" onError={() => setSelectedThreadId(null)}>
        <EmailThreadView
          thread={selectedThread}
          onBack={() => setSelectedThreadId(null)}
        />
      </ErrorBoundaryWithRetry>
    );
  }

  // No account connected
  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Mail className="w-16 h-16 text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Gmail não conectado</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          Conecte sua conta Gmail nas Integrações para visualizar e gerenciar seus emails aqui.
        </p>
        <Badge variant="outline" className="text-xs">
          Integrações &rarr; Gmail &rarr; Conectar
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Mail className="w-5 h-5 text-red-500 shrink-0" />
            <h2 className="text-base font-semibold">Gmail</h2>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                {unreadCount} novo{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowComposer(true)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Compor
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncInbox.mutate({})}
            disabled={syncInbox.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncInbox.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar emails... (3+ caracteres busca no Gmail)"
              className="h-8 pl-8 text-sm"
              aria-label="Buscar emails"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b px-3 h-9 bg-transparent">
          <TabsTrigger value="inbox" className="text-xs gap-1 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Inbox className="w-3.5 h-3.5" />
            Inbox
            {unreadCount > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs gap-1 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <MailOpen className="w-3.5 h-3.5" />
            Não lidos
          </TabsTrigger>
          <TabsTrigger value="starred" className="text-xs gap-1 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Star className="w-3.5 h-3.5" />
            Favoritos
            {starredCount > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{starredCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs gap-1 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <SendIcon className="w-3.5 h-3.5" />
            Enviados
          </TabsTrigger>
        </TabsList>

        {/* Labels filter bar */}
        {labels.length > 0 && (
          <div className="px-3 py-1 border-b flex items-center gap-1 overflow-x-auto">
            <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
            <Badge
              variant={selectedLabel === null ? 'default' : 'outline'}
              className="text-[9px] px-1.5 py-0 cursor-pointer shrink-0"
              onClick={() => setSelectedLabel(null)}
            >
              Todas
            </Badge>
            {labels.filter(l => l.label_type === 'user').map(label => (
              <Badge
                key={label.id}
                variant={selectedLabel === label.gmail_label_id ? 'default' : 'outline'}
                className="text-[9px] px-1.5 py-0 cursor-pointer shrink-0"
                style={label.color ? { borderColor: label.color } : undefined}
                onClick={() => setSelectedLabel(selectedLabel === label.gmail_label_id ? null : label.gmail_label_id)}
              >
                {label.name}
                {label.unread_count > 0 && <span className="ml-0.5 text-[8px] opacity-60">({label.unread_count})</span>}
              </Badge>
            ))}
          </div>
        )}

        <TabsContent value={activeTab} className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full">
            {threadsError ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-3 text-destructive opacity-50" />
                <p className="text-sm font-medium text-destructive">Erro ao carregar emails</p>
                <p className="text-xs mt-1">{threadsError instanceof Error ? threadsError.message : 'Erro desconhecido'}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => syncInbox.mutate({})}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Tentar novamente
                </Button>
              </div>
            ) : threadsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">
                  {searchQuery ? 'Nenhum email encontrado' : 'Inbox vazio'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={() => syncInbox.mutate({})}
                  >
                    Sincronizar emails
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {filteredThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    isSelected={false}
                    onClick={() => setSelectedThreadId(thread.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Account info footer */}
      <div className="p-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {activeAccount?.email_address}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {activeAccount?.last_sync_at
            ? `Sync: ${new Date(activeAccount.last_sync_at).toLocaleString('pt-BR')}`
            : 'Nunca sincronizado'
          }
        </span>
      </div>

      {/* Composer Modal */}
      <AnimatePresence>
        {showComposer && (
          <EmailComposer
            mode="new"
            onClose={() => setShowComposer(false)}
            onSent={() => setShowComposer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GmailInboxView() {
  return (
    <GmailProvider>
      <GmailInboxContent />
    </GmailProvider>
  );
}
