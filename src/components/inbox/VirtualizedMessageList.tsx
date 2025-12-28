import { useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Message, InteractiveButton } from '@/types/chat';
import { motion } from 'framer-motion';
import { MessageReactions } from './MessageReactions';
import { MessageImage } from './ImagePreview';
import { DocumentPreview, VideoPreview } from './MediaPreview';
import { InteractiveMessageDisplay, ButtonResponseBadge } from './InteractiveMessage';
import { QuotedMessage } from './ReplyQuote';
import { LocationMessageDisplay } from './LocationMessage';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { TextToSpeechButton } from './TextToSpeechButton';
import {
  Check,
  CheckCheck,
  Clock,
  X,
  Reply,
  Forward,
  Copy,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VirtualizedMessageListProps {
  messages: Message[];
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  onSpeak: (messageId: string, text: string) => void;
  onStopSpeak: () => void;
  isContactTyping?: boolean;
}

export interface VirtualizedMessageListRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Hoje';
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    case 'failed':
      return <X className="w-3 h-3 text-destructive" />;
    default:
      return <Clock className="w-3 h-3 animate-pulse" />;
  }
}

type ListItem = 
  | { type: 'date-separator'; date: Date; key: string }
  | { type: 'message'; message: Message; key: string };

export const VirtualizedMessageList = forwardRef<VirtualizedMessageListRef, VirtualizedMessageListProps>(({
  messages,
  onReply,
  onForward,
  onCopy,
  onInteractiveButtonClick,
  ttsLoading,
  ttsPlaying,
  ttsMessageId,
  onSpeak,
  onStopSpeak,
  isContactTyping = false,
}, ref) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const dateKey = format(message.timestamp, 'yyyy-MM-dd');
      
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        items.push({
          type: 'date-separator',
          date: new Date(dateKey),
          key: `date-${dateKey}`,
        });
      }
      
      items.push({
        type: 'message',
        message,
        key: message.id,
      });
    });

    return items;
  }, [messages]);

  const getItemSize = useCallback((index: number) => {
    const item = listItems[index];
    if (item.type === 'date-separator') {
      return 50;
    }
    // Estimate size based on message type
    const message = item.message;
    if (message.type === 'image' || message.type === 'video') {
      return 280;
    }
    if (message.type === 'audio') {
      return 120;
    }
    if (message.type === 'document') {
      return 100;
    }
    if (message.type === 'location') {
      return 200;
    }
    // Text messages - estimate by content length
    const lines = Math.ceil(message.content.length / 50);
    return Math.max(80, 60 + lines * 20);
  }, [listItems]);

  const virtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemSize,
    overscan: 10,
  });

  const scrollToBottom = useCallback(() => {
    if (listItems.length > 0) {
      virtualizer.scrollToIndex(listItems.length - 1, { align: 'end' });
    }
  }, [listItems.length, virtualizer]);

  const scrollToMessage = useCallback((messageId: string) => {
    const index = listItems.findIndex(
      item => item.type === 'message' && item.message.id === messageId
    );
    if (index !== -1) {
      virtualizer.scrollToIndex(index, { align: 'center' });
    }
  }, [listItems, virtualizer]);

  useImperativeHandle(ref, () => ({
    scrollToBottom,
    scrollToMessage,
  }), [scrollToBottom, scrollToMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isContactTyping, scrollToBottom]);

  const renderMessage = useCallback((message: Message) => {
    const isSent = message.sender === 'agent';

    return (
      <div className={cn('flex group px-4 py-1', isSent ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[70%] space-y-1 relative">
          {/* Message Actions */}
          <div className={cn(
            "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isSent ? "right-full mr-2" : "left-full ml-2"
          )}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
              title="Responder"
            >
              <Reply className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onForward(message)}
              className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
              title="Encaminhar"
            >
              <Forward className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onCopy(message.content)}
              className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
              title="Copiar"
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.button>
            {message.type === 'text' && (
              <TextToSpeechButton
                messageId={message.id}
                text={message.content}
                isLoading={ttsLoading}
                isPlaying={ttsPlaying}
                currentMessageId={ttsMessageId}
                onSpeak={onSpeak}
                onStop={onStopSpeak}
                className="p-1.5 rounded-full bg-card border border-border/50 shadow-sm"
              />
            )}
          </div>

          <div
            className={cn(
              'relative px-4 py-2.5 rounded-2xl shadow-sm transition-all',
              isSent 
                ? 'rounded-br-md bg-primary text-primary-foreground' 
                : 'rounded-bl-md bg-card border border-border/30 text-foreground'
            )}
          >
            {isSent && (
              <div className="absolute inset-0 rounded-2xl rounded-br-md bg-primary/30 blur-lg -z-10" />
            )}

            {message.replyTo && (
              <QuotedMessage
                replyTo={message.replyTo}
                isSent={isSent}
                onClick={() => scrollToMessage(message.replyTo!.messageId)}
              />
            )}

            {message.buttonResponse && (
              <ButtonResponseBadge 
                buttonTitle={message.buttonResponse.buttonTitle}
                isSent={isSent}
              />
            )}

            {message.type === 'interactive' && message.interactive && (
              <InteractiveMessageDisplay
                interactive={message.interactive}
                isSent={isSent}
                onButtonClick={onInteractiveButtonClick}
              />
            )}

            {message.type === 'image' && message.mediaUrl && (
              <div className="mb-2 rounded-lg overflow-hidden">
                <MessageImage src={message.mediaUrl} />
              </div>
            )}

            {message.type === 'video' && message.mediaUrl && (
              <div className="mb-2">
                <VideoPreview
                  url={message.mediaUrl}
                  caption={message.content}
                  isSent={isSent}
                />
              </div>
            )}

            {message.type === 'audio' && message.mediaUrl && (
              <div className="mb-2">
                <AudioMessagePlayer
                  audioUrl={message.mediaUrl}
                  messageId={message.id}
                  isSent={isSent}
                  existingTranscription={message.transcription}
                  transcriptionStatus={message.transcriptionStatus}
                />
              </div>
            )}

            {message.type === 'document' && message.mediaUrl && (
              <div className="mb-2">
                <DocumentPreview
                  url={message.mediaUrl}
                  fileName="document"
                  isSent={isSent}
                />
              </div>
            )}

            {message.type === 'location' && message.location && (
              <LocationMessageDisplay
                location={message.location}
                isSent={isSent}
              />
            )}

            {message.content && message.type === 'text' && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
            
            <div className={cn(
              'flex items-center gap-1 mt-1 text-[10px]',
              isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              <span>{formatMessageTime(message.timestamp)}</span>
              {isSent && <MessageStatusIcon status={message.status} />}
            </div>
          </div>

          <MessageReactions
            messageId={message.id}
            isSent={isSent}
          />
        </div>
      </div>
    );
  }, [onReply, onForward, onCopy, onInteractiveButtonClick, ttsLoading, ttsPlaying, ttsMessageId, onSpeak, onStopSpeak, scrollToMessage]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={Clock}
          title="Nenhuma mensagem ainda"
          description="As mensagens aparecerão aqui quando a conversa começar"
          illustration="messages"
          size="sm"
        />
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="flex-1 overflow-auto scrollbar-thin bg-muted/5"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = listItems[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === 'date-separator' ? (
                <div className="flex justify-center py-2 px-4">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full font-medium border border-border/20">
                    {formatDateSeparator(item.date)}
                  </span>
                </div>
              ) : (
                renderMessage(item.message)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';
