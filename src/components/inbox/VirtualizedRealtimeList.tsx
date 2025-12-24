import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VirtualizedRealtimeListProps {
  conversations: ConversationWithMessages[];
  selectedContactId: string | null;
  onSelectConversation: (contactId: string) => void;
}

const ITEM_HEIGHT = 90;

export function VirtualizedRealtimeList({
  conversations,
  selectedContactId,
  onSelectConversation,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-auto scrollbar-thin"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = conversations[virtualRow.index];
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
              className="px-2"
            >
              <button
                onClick={() => onSelectConversation(conversation.contact.id)}
                className={cn(
                  'w-full p-3 rounded-xl flex items-start gap-3 transition-all text-left h-full',
                  'hover:bg-muted/50',
                  selectedContactId === conversation.contact.id &&
                    'bg-primary/10 border border-primary/20'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.contact.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
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
                    <span className="font-medium text-foreground truncate">
                      {conversation.contact.name}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage?.content || 'Sem mensagens'}
                  </p>
                  {conversation.contact.tags && conversation.contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {conversation.contact.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
