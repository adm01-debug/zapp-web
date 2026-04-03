import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Search, RefreshCw, Pencil, Inbox, Star,
  Loader2, MailOpen, Paperclip, Clock
} from 'lucide-react';
import { useGmail, type EmailThread } from '@/hooks/useGmail';
import { EmailChatThread } from './EmailChatThread';
import { EmailComposer } from '@/components/gmail/EmailComposer';
import { cn } from '@/lib/utils';

function getInitials(name?: string | null, email?: string): string {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (email) return email[0]?.toUpperCase() || '?';
  return '?';
}

function formatDate(dateStr: string): string {
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

function ThreadItem({ thread, isSelected, onClick }: { thread: EmailThread; isSelected: boolean; onClick: () => void }) {
  const name = thread.contact?.name || thread.snippet?.split(' ')[0] || 'Desconhecido';

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 flex items-center gap-3 transition-all border-b border-border/10',
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50',
        thread.is_unread && 'font-medium'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className={cn(
            'text-xs',
            thread.is_unread ? 'bg-primary/10 text-primary-foreground font-bold' : 'bg-muted'
          )}>
            {getInitials(thread.contact?.name, thread.contact?.email)}
          </AvatarFallback>
        </Avatar>
        {thread.is_unread && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm truncate">{name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {thread.last_message_at && formatDate(thread.last_message_at)}
          </span>
        </div>
        <p className={cn(
          'text-xs truncate',
          thread.is_unread ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {thread.subject || '(Sem assunto)'}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {thread.snippet}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {thread.message_count > 1 && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0">{thread.message_count}</Badge>
        )}
        <div className="flex items-center gap-0.5">
          {thread.is_starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
          {thread.label_ids?.includes('SENT') && <Mail className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>
    </motion.button>
  );
}

export function EmailChatInbox() {
  const {
    activeAccount, threads, threadsLoading,
    labels, syncInbox, unreadCount, subscribeToThreads
  } = useGmail();

  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsub = subscribeToThreads();
    return unsub;
  }, [subscribeToThreads]);

  const filteredThreads = useMemo(() => {
    let result = threads;
    if (filter === 'unread') result = result.filter(t => t.is_unread);
    if (filter === 'starred') result = result.filter(t => t.is_starred);
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
  }, [threads, filter, searchQuery]);

  // No account
  if (!activeAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Mail className="w-14 h-14 text-muted-foreground/20 mb-4" />
        <h3 className="text-base font-semibold mb-1">Gmail não conectado</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Conecte sua conta Gmail nas Integrações para usar o Email Chat.
        </p>
      </div>
    );
  }

  // Split panel on desktop: list + thread
  return (
    <div className="flex h-full">
      {/* Thread list (always visible on desktop, hidden when thread selected on mobile) */}
      <div className={cn(
        'flex flex-col border-r w-full md:w-[340px] lg:w-[380px] shrink-0',
        selectedThread ? 'hidden md:flex' : 'flex'
      )}>
        {/* Toolbar */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-destructive shrink-0" />
            <h2 className="text-sm font-semibold flex-1">Email Chat</h2>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
            <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => setShowComposer(true)}>
              <Pencil className="w-3 h-3 mr-1" />
              Novo
            </Button>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => syncInbox.mutate({})}
              disabled={syncInbox.isPending}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncInbox.isPending && 'animate-spin')} />
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unread">Não lidos</SelectItem>
                <SelectItem value="starred">Favoritos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {threadsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs">{searchQuery ? 'Nenhum resultado' : 'Inbox vazio'}</p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThread?.id === thread.id}
                onClick={() => setSelectedThread(thread)}
              />
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t text-[10px] text-muted-foreground flex items-center gap-1">
          <Mail className="w-3 h-3" />
          <span className="truncate">{activeAccount.email_address}</span>
        </div>
      </div>

      {/* Chat thread view */}
      <div className={cn(
        'flex-1 flex flex-col',
        !selectedThread ? 'hidden md:flex' : 'flex'
      )}>
        {selectedThread ? (
          <EmailChatThread
            thread={selectedThread}
            onBack={() => setSelectedThread(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* Composer */}
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
