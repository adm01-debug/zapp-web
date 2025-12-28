import { useRef } from 'react';
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
}

const ITEM_HEIGHT = 90;

export function VirtualizedRealtimeList({
  conversations, selectedContactId, onSelectConversation, selectionMode = false,
  selectedIds = new Set(), onToggleSelection, onMarkAsRead, onArchive,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const handleClick = (contactId: string, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      e.preventDefault();
      onToggleSelection(contactId);
    } else {
      onSelectConversation(contactId);
    }
  };

  const handleMarkAsRead = (contactId: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(contactId);
      toast({ title: 'Marcado como lido', description: 'Conversa marcada como lida.' });
    }
  };

  const handleArchive = (contactId: string) => {
    if (onArchive) {
      onArchive(contactId);
      toast({ title: 'Arquivado', description: 'Conversa arquivada com sucesso.' });
    }
  };

  return (
    <div ref={parentRef} className="h-full overflow-auto scrollbar-thin">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = conversations[virtualRow.index];
          const isSelected = selectedIds.has(conversation.contact.id);
          
          const itemContent = (
            <button
              onClick={(e) => handleClick(conversation.contact.id, e)}
              className={cn(
                'w-full p-3 rounded-xl flex items-start gap-3 transition-all text-left h-full hover:bg-muted/50',
                selectedContactId === conversation.contact.id && 'bg-primary/10 border border-primary/20',
                isSelected && 'bg-primary/20 border border-primary/30'
              )}
            >
              {selectionMode && (
                <div className="flex-shrink-0 flex items-center" onClick={(e) => { e.stopPropagation(); onToggleSelection?.(conversation.contact.id); }}>
                  <Checkbox checked={isSelected} className="data-[state=checked]:bg-primary" />
                </div>
              )}
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conversation.contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {conversation.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground truncate">{conversation.contact.name}</span>
                  {conversation.lastMessage && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: false, locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage?.content || 'Sem mensagens'}</p>
                {conversation.contact.tags && conversation.contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {conversation.contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {conversation.lastMessage && (
                <div className="flex-shrink-0 self-center">
                  <SentimentEmoji sentiment={analyzeMessageSentiment(conversation.lastMessage.content).sentiment} animated={false} />
                </div>
              )}
            </button>
          );
          
          return (
            <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="px-2">
              {isMobile && !selectionMode ? (
                <SwipeableListItem
                  leftAction={SWIPE_ACTIONS.markAsRead(() => handleMarkAsRead(conversation.contact.id))}
                  rightAction={SWIPE_ACTIONS.archive(() => handleArchive(conversation.contact.id))}
                >
                  {itemContent}
                </SwipeableListItem>
              ) : itemContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
