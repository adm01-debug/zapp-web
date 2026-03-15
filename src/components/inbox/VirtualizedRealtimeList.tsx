import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Pin } from 'lucide-react';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yyyy');
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

const ITEM_HEIGHT = 72;
const EMPTY_SET = new Set<string>();

export function VirtualizedRealtimeList({
  conversations,
  selectedContactId,
  onSelectConversation,
  selectionMode = false,
  selectedIds = EMPTY_SET,
  onToggleSelection,
  pinnedIds = EMPTY_SET,
}: VirtualizedRealtimeListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const safeConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return conversations.filter((c) => c?.contact?.id);
  }, [conversations]);

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
    overscan: 6,
  });

  const handleClick = useCallback(
    (contactId: string, e: React.MouseEvent) => {
      if (selectionMode && onToggleSelection) {
        e.preventDefault();
        onToggleSelection(contactId);
      } else {
        onSelectConversation(contactId);
      }
    },
    [selectionMode, onToggleSelection, onSelectConversation]
  );

  if (sortedConversations.length === 0) return null;

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
          const isActive = selectedContactId === contactId;
          const isSelected = selectedIds.has(contactId);
          const isPinned = pinnedIds.has(contactId);
          const hasUnread = conversation.unreadCount > 0;
          const lastMsg = conversation.lastMessage;
          const isLastSent = lastMsg?.sender === 'agent';

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
            >
              <button
                onClick={(e) => handleClick(contactId, e)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  'border-b border-border hover:bg-muted/40',
                  isActive && 'bg-[hsl(var(--sidebar-accent))]',
                  isSelected && 'bg-primary/10'
                )}
              >
                {selectionMode && (
                  <div
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelection?.(contactId);
                    }}
                  >
                    <Checkbox checked={isSelected} className="data-[state=checked]:bg-primary" />
                  </div>
                )}

                <Avatar className="w-[49px] h-[49px] flex-shrink-0">
                  <AvatarImage src={conversation.contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-[hsl(var(--avatar-fallback))] text-[hsl(var(--avatar-fallback-foreground))] text-base font-normal">
                    {(conversation.contact.name || '??')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {isPinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                      <span className="truncate text-[17px] leading-[21px] text-foreground font-normal">
                        {conversation.contact.name || 'Sem nome'}
                      </span>
                    </div>
                    {lastMsg && (
                      <span
                        className={cn(
                          'text-xs flex-shrink-0 font-normal',
                          hasUnread ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {formatTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {isLastSent && (
                        <span className="flex-shrink-0 text-muted-foreground">
                          {lastMsg?.is_read ? (
                            <CheckCheck className="w-4 h-4 text-info" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </span>
                      )}
                      <p className={cn('text-sm truncate leading-5', hasUnread ? 'text-foreground/85' : 'text-muted-foreground')}>
                        {lastMsg?.content || 'Sem mensagens'}
                      </p>
                    </div>
                    {hasUnread && (
                      <span className="flex-shrink-0 min-w-5 h-5 px-1 bg-primary text-primary-foreground text-[11px] rounded-full flex items-center justify-center font-normal">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
