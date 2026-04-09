import { useState, useMemo, useRef, useCallback } from 'react';
import { QuickPeek } from '@/components/ui/quick-peek';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from '@/components/ui/motion';
import { SLAIndicator } from './SLAIndicator';
import { SentimentEmoji, getSentimentFromScore, type SentimentLevel } from './SentimentIndicator';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageCircle,
  Instagram,
  Mail,
  Phone,
  UserCheck,
  Archive,
  Pin,
  Star,
  AlarmClock,
} from 'lucide-react';
import { openChatPopup } from '@/lib/popupManager';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Small channel icon badge rendered on conversation avatars */
function ChannelBadge({ type }: { type?: string | null }) {
  const iconClass = 'w-2.5 h-2.5 text-primary-foreground';
  let Icon = MessageCircle;
  let bgColor = 'bg-[hsl(142,70%,45%)]'; // WhatsApp green default

  if (type === 'instagram') {
    Icon = Instagram;
    bgColor = 'bg-[hsl(330,80%,55%)]';
  } else if (type === 'email') {
    Icon = Mail;
    bgColor = 'bg-[hsl(220,70%,55%)]';
  } else if (type === 'phone' || type === 'call') {
    Icon = Phone;
    bgColor = 'bg-[hsl(200,70%,50%)]';
  }

  return (
    <span className={cn(
      'absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-sidebar z-10',
      bgColor
    )}>
      <Icon className={iconClass} />
    </span>
  );
}

interface VirtualizedConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  compactMode?: boolean;
  onArchive?: (conversation: Conversation) => void;
  onMarkRead?: (conversation: Conversation) => void;
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle2,
  waiting: Loader2,
};

const statusColors = {
  open: 'bg-status-open',
  pending: 'bg-status-pending',
  resolved: 'bg-status-resolved',
  waiting: 'bg-status-waiting',
};

const ITEM_HEIGHT = 140;
const COMPACT_ITEM_HEIGHT = 80;

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  compact?: boolean;
}

function ConversationItem({ conversation, isSelected, onSelect, compact = false }: ConversationItemProps) {
  const StatusIcon = statusIcons[conversation.status];
  
  // Get sentiment - use stored or calculate from score
  const sentiment: SentimentLevel | null = conversation.sentiment || 
    (conversation.sentimentScore !== undefined ? getSentimentFromScore(conversation.sentimentScore) : null);

  if (compact) {
    return (
      <motion.div
        onClick={() => onSelect(conversation)}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'relative p-[var(--density-padding-x)] rounded-lg cursor-pointer transition-all duration-200 h-full mx-2',
          isSelected 
            ? 'bg-primary/10 border border-primary/30' 
            : 'hover:bg-muted/30 border border-transparent'
        )}
      >
        {isSelected && (
          <motion.div 
            layoutId="conversationActiveCompact"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-primary"
          />
        )}

        <div className="flex items-center gap-2 relative z-10">
          <div className="relative flex-shrink-0">
            <ChannelBadge type={conversation.contact.contact_type} />
            <Avatar className="w-8 h-8">
              <AvatarImage src={conversation.contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {conversation.assignedTo ? (
              <Avatar className="absolute -bottom-0.5 -right-0.5 w-4 h-4 ring-1 ring-sidebar">
                <AvatarImage src={conversation.assignedTo.avatar} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-[7px] font-bold">
                  {conversation.assignedTo.name[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-1 ring-sidebar',
                  statusColors[conversation.status]
                )}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className={cn(
                  "font-medium text-xs truncate",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {conversation.contact.name}
                </span>
                {sentiment && <SentimentEmoji sentiment={sentiment} animated={false} />}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(conversation.updatedAt, { addSuffix: false, locale: ptBR })}
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {conversation.lastMessage?.content || 'Sem mensagens'}
            </p>
          </div>

          {conversation.priority === 'high' && (
            <div className="w-0.5 h-5 rounded-full bg-destructive flex-shrink-0" />
          )}
        </div>
      </motion.div>
    );
  }

  const quickPeekPreview = (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{conversation.contact.name}</p>
      {conversation.lastMessage?.content && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
          {conversation.lastMessage.content}
        </p>
      )}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-1 border-t border-border/30">
        <span>{conversation.unreadCount > 0 ? `${conversation.unreadCount} não lidas` : 'Sem novas'}</span>
        {conversation.status && <span>• {conversation.status === 'resolved' ? 'Resolvido' : 'Aberto'}</span>}
      </div>
    </div>
  );

  return (
    <QuickPeek preview={quickPeekPreview} enabled={!isSelected} delay={500}>
    <motion.div
      onClick={() => onSelect(conversation)}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'relative p-[var(--density-padding-x)] rounded-xl cursor-pointer transition-all duration-200 group h-full mx-2',
        isSelected 
          ? 'bg-primary/10 border border-primary/30' 
          : 'hover:bg-muted/30 border border-transparent'
      )}
    >
      {isSelected && (
        <motion.div 
          layoutId="conversationActive"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary"
        />
      )}

      <div className="flex items-start gap-3 relative z-10">
        <div className="relative flex-shrink-0">
          <ChannelBadge type={conversation.contact.contact_type} />
          <Avatar className={cn(
            "w-11 h-11 ring-2 transition-all",
            isSelected ? "ring-primary/40" : "ring-border/30"
          )}>
            <AvatarImage src={conversation.contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {/* Agent mini avatar */}
          {conversation.assignedTo && (
            <Avatar className="absolute -bottom-1 -right-1 w-5 h-5 ring-2 ring-sidebar">
              <AvatarImage src={conversation.assignedTo.avatar} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-[8px] font-bold">
                {conversation.assignedTo.name[0]}
              </AvatarFallback>
            </Avatar>
          )}
          {!conversation.assignedTo && (
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-sidebar',
                statusColors[conversation.status]
              )}
            >
              <StatusIcon className="w-2.5 h-2.5 text-primary-foreground" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                "font-medium text-sm truncate transition-colors",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {conversation.contact.name}
              </span>
              {sentiment && (
                <SentimentEmoji sentiment={sentiment} animated={false} />
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(conversation.updatedAt, {
                  addSuffix: false,
                  locale: ptBR,
                })}
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChatPopup(conversation.contact.id, conversation.contact.name);
                      }}
                      title="Abrir em popup"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">Abrir em popup</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate pr-2">
              {conversation.lastMessage?.content || 'Sem mensagens'}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground">
                {conversation.unreadCount}
              </span>
            )}
          </div>

          {/* Quick actions on hover */}
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Resolver</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Transferir</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-warning hover:bg-warning/10 transition-all"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Fixar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-all"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Favoritar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-info hover:bg-info/10 transition-all"
                  >
                    <AlarmClock className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Adiar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Arquivar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="mt-1">
            <SLAIndicator
              firstMessageAt={conversation.createdAt}
              firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              firstResponseMinutes={conversation.priority === 'high' ? 2 : 5}
              resolutionMinutes={conversation.priority === 'high' ? 30 : 60}
              compact
            />
          </div>

          {conversation.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {conversation.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-muted/50 border-border/20"
                >
                  {tag}
                </Badge>
              ))}
              {conversation.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{conversation.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {conversation.priority === 'high' && (
          <div className="w-1 h-8 rounded-full bg-destructive flex-shrink-0" />
        )}
      </div>
    </motion.div>
    </QuickPeek>
  );
}

export function VirtualizedConversationList({
  conversations,
  selectedId,
  onSelect,
  compactMode = false,
  onArchive,
  onMarkRead,
}: VirtualizedConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const parentRef = useRef<HTMLDivElement>(null);

  const itemHeight = compactMode ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT;

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch = conv.contact.name.toLowerCase().includes(search.toLowerCase()) ||
        conv.contact.phone.includes(search);
      const matchesFilter = filter === 'all' || conv.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [conversations, search, filter]);

  const counts = useMemo(() => ({
    all: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    waiting: conversations.filter((c) => c.status === 'waiting').length,
  }), [conversations]);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border/30">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("p-4 border-b border-border/20", compactMode ? "space-y-2" : "space-y-4")}
      >
        <div className="flex items-center justify-between">
          <h2 className={cn("font-semibold text-foreground", compactMode ? "text-base" : "text-lg")}>
            Conversas
          </h2>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 text-muted-foreground hover:text-foreground">
              <Filter className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "pl-9 bg-muted/30 border-border/30 focus:border-primary/50 focus:ring-primary/20 transition-all",
              compactMode && "h-8 text-sm"
            )}
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className={cn(
            "w-full grid grid-cols-4 bg-muted/30 border border-border/20",
            compactMode && "h-8"
          )}>
            <TabsTrigger value="all" className={cn("text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", compactMode && "text-[10px] py-1")}>
              Todas ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="open" className={cn("text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", compactMode && "text-[10px] py-1")}>
              Abertas ({counts.open})
            </TabsTrigger>
            <TabsTrigger value="pending" className={cn("text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", compactMode && "text-[10px] py-1")}>
              Pendentes ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="waiting" className={cn("text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", compactMode && "text-[10px] py-1")}>
              Aguardando ({counts.waiting})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Virtualized Conversations List */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto scrollbar-thin"
      >
        {filteredConversations.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma conversa encontrada"
            description="Ajuste os filtros ou aguarde novas mensagens chegarem"
            illustration="inbox"
            size="sm"
          />
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationItem
                    conversation={conversation}
                    isSelected={selectedId === conversation.id}
                    onSelect={onSelect}
                    compact={compactMode}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
