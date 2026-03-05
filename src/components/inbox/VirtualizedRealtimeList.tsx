import { useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SentimentEmoji, getSentimentFromScore, SentimentLevel } from './SentimentIndicator';
import { SwipeableListItem, SWIPE_ACTIONS } from './SwipeableListItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Pin } from 'lucide-react';
import { motion } from 'framer-motion';

function analyzeMessageSentiment(content: string): { sentiment: SentimentLevel; score: number } {
  const lowerContent = content.toLowerCase();
  const negativeWords = ['problema', 'erro', 'não funciona', 'ruim', 'péssimo', 'horrível', 
    'reclamação', 'insatisfeito', 'absurdo', 'vergonha', 'nunca mais', 'decepcionado',
    'raiva', 'furioso', 'inaceitável', 'cancelar', 'reembolso', 'advogado', 'procon'];
  const positiveWords = ['obrigado', 'obrigada', 'excelente', 'perfeito', 'ótimo', 'maravilhoso',
    'parabéns', 'adorei', 'amei', 'satisfeito', 'recomendo', 'incrível', 'sensacional',
    'agradeço', 'feliz', 'contente', 'sucesso'];
  
  let score = 50;
  negativeWords.forEach(word => { if (lowerContent.includes(word)) score -= 15; });
  positiveWords.forEach(word => { if (lowerContent.includes(word)) score += 12; });
  score = Math.max(0, Math.min(100, score));
  
  return { sentiment: getSentimentFromScore(score), score };
}

interface VirtualizedRealtimeListProps {
  conversations: ConversationWithMessages[];
  selectedContactId: string | null;
  onSelectConversation: (contactId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (contactId: string) => void;
  onMarkAsRead?: (contactId: string) => void;
  onArchive?: (contactId: string) => void;
  onPin?: (contactId: string) => void;
  pinnedIds?: Set<string>;
}

const ITEM_HEIGHT = 88;
const EMPTY_SET: ReadonlySet<string> = new Set();

export function VirtualizedRealtimeList({
  conversations,
  selectedContactId,
  onSelectConversation,
  selectionMode = false,
  selectedIds = EMPTY_SET as Set<string>,
  onToggleSelection,
  onMarkAsRead,
  onArchive,
  onPin,
  pinnedIds = EMPTY_SET as Set<string>,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [recentlyActioned, setRecentlyActioned] = useState<Set<string>>(new Set());

  const sortedConversations = useMemo(() => {
    // Sort conversations: pinned first, then by last message date
    return [...conversations].sort((a, b) => {
      const aIsPinned = pinnedIds.has(a.contact.id);
      const bIsPinned = pinnedIds.has(b.contact.id);

      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, pinnedIds]);

  const virtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    getItemKey: (index) => sortedConversations[index]?.contact.id ?? index,
  });

  const handleClick = (contactId: string, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      e.preventDefault();
      onToggleSelection(contactId);
    } else {
      onSelectConversation(contactId);
    }
  };

  const handleMarkAsRead = useCallback((contactId: string) => {
    if (onMarkAsRead) {
      setRecentlyActioned(prev => new Set([...prev, contactId]));
      onMarkAsRead(contactId);
      toast({ 
        title: '✓ Marcado como lido', 
        description: 'Conversa marcada como lida.',
        duration: 2000,
      });
      setTimeout(() => {
        setRecentlyActioned(prev => {
          const next = new Set(prev);
          next.delete(contactId);
          return next;
        });
      }, 500);
    }
  }, [onMarkAsRead]);

  const handleArchive = useCallback((contactId: string) => {
    if (onArchive) {
      setRecentlyActioned(prev => new Set([...prev, contactId]));
      onArchive(contactId);
      toast({ 
        title: '📦 Arquivado', 
        description: 'Conversa arquivada com sucesso.',
        duration: 2000,
      });
    }
  }, [onArchive]);

  const handlePin = useCallback((contactId: string) => {
    if (onPin) {
      const isPinned = pinnedIds.has(contactId);
      onPin(contactId);
      toast({ 
        title: isPinned ? '📌 Desafixado' : '📌 Fixado', 
        description: isPinned ? 'Conversa removida do topo.' : 'Conversa fixada no topo.',
        duration: 2000,
      });
    }
  }, [onPin, pinnedIds]);

  return (
    <div ref={parentRef} className="h-full overflow-auto scrollbar-thin">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = sortedConversations[virtualRow.index];
          if (!conversation || !conversation.contact) return null;
          const contactId = conversation.contact.id;
          const isSelected = selectedIds.has(contactId);
          const isPinned = pinnedIds.has(contactId);
          const wasActioned = recentlyActioned.has(contactId);

          const itemContent = (
            <motion.button
              initial={false}
              animate={{
                scale: wasActioned ? 0.98 : 1,
                opacity: wasActioned ? 0.7 : 1,
              }}
              transition={{ duration: 0.2 }}
               onClick={(e) => handleClick(contactId, e)}
               className={cn(
                 'w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left hover:bg-muted/50',
                 selectedContactId === contactId && 'bg-primary/10 border border-primary/20',
                 isSelected && 'bg-primary/20 border border-primary/30',
                 isPinned && 'bg-primary/5 border-l-2 border-l-primary'
               )}
             >
               {selectionMode && (
                 <div
                   className="flex-shrink-0 flex items-center"
                   onClick={(e) => {
                     e.stopPropagation();
                     onToggleSelection?.(contactId);
                   }}
                 >
                  <Checkbox checked={isSelected} className="data-[state=checked]:bg-primary" />
                </div>
              )}
              <div className="relative flex-shrink-0">
                <Avatar className="w-11 h-11">
                  <AvatarImage src={conversation.contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {conversation.contact.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                {conversation.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isPinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                    <span className="font-medium text-foreground truncate text-sm">
                      {conversation.contact.name || 'Sem nome'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                    {conversation.lastMessage && (
                      <SentimentEmoji
                        sentiment={analyzeMessageSentiment(conversation.lastMessage.content).sentiment}
                        animated={false}
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage?.content || 'Sem mensagens'}
                </p>
                {conversation.contact.tags && conversation.contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {conversation.contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {tag}
                      </Badge>
                    ))}
                    {conversation.contact.tags.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{conversation.contact.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );

          return (
            <div
              key={conversation.contact.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-2"
            >
              {isMobile && !selectionMode ? (
                <SwipeableListItem
                  leftAction={SWIPE_ACTIONS.markAsRead(() => handleMarkAsRead(conversation.contact.id))}
                  leftSecondaryAction={
                    isPinned
                      ? SWIPE_ACTIONS.unpin(() => handlePin(conversation.contact.id))
                      : SWIPE_ACTIONS.pin(() => handlePin(conversation.contact.id))
                  }
                  rightAction={SWIPE_ACTIONS.archive(() => handleArchive(conversation.contact.id))}
                  rightSecondaryAction={
                    SWIPE_ACTIONS.delete(() => {
                      toast({
                        title: '🗑️ Excluir conversa?',
                        description: 'Esta ação não pode ser desfeita.',
                        variant: 'destructive',
                        duration: 3000,
                      });
                    })
                  }
                >
                  {itemContent}
                </SwipeableListItem>
              ) : (
                itemContent
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
