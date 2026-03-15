import { useRef, forwardRef, useImperativeHandle } from 'react';
import { DeletedMessagePlaceholder } from '../DeletedMessagePlaceholder';
import { MessageContextActions } from '../MessageContextActions';
import { cn } from '@/lib/utils';
import { Message, InteractiveButton } from '@/types/chat';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { TypingIndicator } from '../TypingIndicator';
import { MessageReactions } from '../MessageReactions';
import { MessageImage } from '../ImagePreview';
import { DocumentPreview, VideoPreview } from '../MediaPreview';
import { AudioMessagePlayer } from '../AudioMessagePlayer';
import { InteractiveMessageDisplay, ButtonResponseBadge } from '../InteractiveMessage';
import { QuotedMessage } from '../ReplyQuote';
import { LocationMessageDisplay } from '../LocationMessage';
import { TextToSpeechButton } from '../TextToSpeechButton';
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

function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
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

interface ChatMessagesAreaProps {
  messages: Message[];
  isContactTyping: boolean;
  typingUserName: string;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  instanceName?: string;
  contactJid?: string;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
}

export interface ChatMessagesAreaRef {
  scrollToBottom: () => void;
  registerMessageRef: (messageId: string, el: HTMLDivElement | null) => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessagesArea = forwardRef<ChatMessagesAreaRef, ChatMessagesAreaProps>(({
  messages,
  isContactTyping,
  typingUserName,
  ttsLoading,
  ttsPlaying,
  ttsMessageId,
  instanceName,
  contactJid,
  onSpeak,
  onStop,
  onReply,
  onForward,
  onCopy,
  onScrollToMessage,
  onInteractiveButtonClick,
}, ref) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    registerMessageRef: (messageId: string, el: HTMLDivElement | null) => {
      messageRefs.current[messageId] = el;
    },
    scrollToMessage: (messageId: string) => {
      const element = messageRefs.current[messageId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    },
  }));

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = format(message.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-muted/5">
      {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          {/* Date separator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center my-4"
          >
            <span className="text-xs text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full font-medium border border-border/20">
              {formatDateSeparator(new Date(dateKey))}
            </span>
          </motion.div>

          {/* Messages for this day */}
          <StaggeredList className="space-y-3">
            {dayMessages.map((message) => {
              const isSent = message.sender === 'agent';

              return (
                <StaggeredItem key={message.id}>
                  <div 
                    ref={(el) => { messageRefs.current[message.id] = el; }}
                    className={cn('flex group', isSent ? 'justify-end' : 'justify-start')}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: isSent ? 20 : -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="max-w-[70%] space-y-1 relative"
                    >
                      {/* Message Actions (visible on hover) */}
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
                            onStop={onStop}
                            className="p-1.5 rounded-full bg-card border border-border/50 shadow-sm"
                          />
                        )}
                        {instanceName && contactJid && (
                          <MessageContextActions
                            message={message}
                            instanceName={instanceName}
                            contactJid={contactJid}
                          />
                        )}
                      </div>

                      {(message as any).is_deleted ? (
                        <DeletedMessagePlaceholder isSent={isSent} />
                      ) : (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
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
                            onClick={() => onScrollToMessage(message.replyTo!.messageId)}
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
                              fileName={message.content || 'documento'}
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

                        {message.content && message.type !== 'audio' && message.type !== 'location' && message.type !== 'video' && message.type !== 'document' && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}

                        <div
                          className={cn(
                            'flex items-center justify-end gap-1.5 mt-1',
                            isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}
                        >
                          <span className="text-[10px]">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {isSent && <MessageStatusIcon status={message.status} />}
                        </div>
                      </motion.div>
                      )}

                      <MessageReactions
                        messageId={message.id}
                        isSent={isSent}
                      />
                    </motion.div>
                  </div>
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        </div>
      ))}

      {/* Typing indicator */}
      <div className="flex justify-start">
        <TypingIndicator 
          isVisible={isContactTyping} 
          userName={typingUserName}
        />
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
});

ChatMessagesArea.displayName = 'ChatMessagesArea';
