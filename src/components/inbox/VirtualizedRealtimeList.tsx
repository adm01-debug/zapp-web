import { useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin } from 'lucide-react';

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

const ITEM_HEIGHT = 80;
const EMPTY_SET = new Set<string>();

export function VirtualizedRealtimeList({
  conversations,
  selectedContactId,
  onSelectConversation,
  selectionMode = false,
  selectedIds = EMPTY_SET,
  onToggleSelection,
  onMarkAsRead,
  onArchive,
  onPin,
  pinnedIds = EMPTY_SET,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter out invalid conversations
  const safeConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return conversations.filter(c => c?.contact?.id);
  }, [conversations]);

  // Sort: pinned first, then by last message date
  const sortedConversations = useMemo(() => {
    return [...safeConversations].sort((a, b) => {
      const aPin = pinnedIds.has(a.contact.id);
      const bPin = pinnedIds.has(b.contact.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [safeConversations, pinnedIds]);

  const virtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const handleClick = useCallback((contactId: string, e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      e.preventDefault();
      onToggleSelection(contactId);
    } else {
      onSelectConversation(contactId);
    }
  }, [selectionMode, onToggleSelection, onSelectConversation]);

  if (sortedConversations.length === 0) {
    return null;
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto scrollbar-thin">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = sortedConversations[virtualRow.index];
          if (!conversation?.contact?.id) return null;

          const contactId = conversation.contact.id;
          const isSelected = selectedIds.has(contactId);
          const isPinned = pinnedIds.has(contactId);

          return (
            <div
              key={contactId}
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
                onClick={(e) => handleClick(contactId, e)}
                className={cn(
                  'w-full px-3 py-3 flex items-center gap-3 transition-all text-left border-b border-border/50',
                  'hover:bg-muted/50',
                  selectedContactId === contactId && 'bg-primary/10 border-l-2 border-l-primary',
                  isSelected && 'bg-primary/15',
                  isPinned && selectedContactId !== contactId && 'bg-muted/30'
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
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conversation.contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {(conversation.contact.name || '??')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isPinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                      <span className="font-medium text-foreground truncate text-sm">
                        {conversation.contact.name || 'Sem nome'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conversation.lastMessage && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate">
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
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
