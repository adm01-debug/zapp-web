import { useRef, forwardRef, useImperativeHandle } from 'react';
import { DeletedMessagePlaceholder } from '../DeletedMessagePlaceholder';
import { MessageContextActions } from '../MessageContextActions';
import { ChatWatermark } from './ChatWatermark';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Check,
  CheckCheck,
  Clock,
  X,
  Reply,
  Forward,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatMessageTime(date: Date): string {
  return format(date, 'hh:mm a');
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3.5 h-3.5" />;
    case 'delivered':
      return <CheckCheck className="w-3.5 h-3.5" />;
    case 'read':
      return <CheckCheck className="w-3.5 h-3.5 text-[hsl(var(--online))]" />;
    case 'failed':
      return <X className="w-3.5 h-3.5 text-destructive" />;
    default:
      return <Clock className="w-3.5 h-3.5 animate-pulse" />;
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
  contactAvatar?: string;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  onEditStart?: (message: Message) => void;
}

export interface ChatMessagesAreaRef {
  scrollToBottom: () => void;
  registerMessageRef: (messageId: string, el: HTMLDivElement | null) => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessagesArea = forwardRef<ChatMessagesAreaRef, ChatMessagesAreaProps>(( {
  messages,
  isContactTyping,
  typingUserName,
  ttsLoading,
  ttsPlaying,
  ttsMessageId,
  instanceName,
  contactJid,
  contactAvatar,
  onSpeak,
  onStop,
  onReply,
  onForward,
  onCopy,
  onScrollToMessage,
  onInteractiveButtonClick,
  onEditStart,
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-background relative">
      {/* Animated vector watermark background */}
      <ChatWatermark />
      {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          {/* Date separator — DreamsChat style */}
          <div className="flex justify-center my-6">
            <span className="text-xs text-muted-foreground bg-muted/60 px-4 py-1.5 rounded-full font-medium">
              {formatDateSeparator(new Date(dateKey))}
            </span>
          </div>

          {/* Messages for this day */}
          <StaggeredList className="space-y-5">
            {dayMessages.map((message) => {
              const isSent = message.sender === 'agent';
              const senderName = isSent ? 'You' : (message as any).senderName || 'Contato';

              return (
                <StaggeredItem key={message.id}>
                  <div
                    ref={(el) => { messageRefs.current[message.id] = el; }}
                    className={cn('flex group gap-3', isSent ? 'justify-end' : 'justify-start')}
                  >
                    {/* Avatar — received messages (left) */}
                    {!isSent && (
                      <Avatar className="w-9 h-9 shrink-0 mt-6">
                        <AvatarImage src={contactAvatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {senderName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="max-w-[65%] space-y-1 relative">
                      {/* Sender header — DreamsChat style: "Name • Time ✓✓" or "Time • You" */}
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs text-muted-foreground mb-1",
                        isSent ? "justify-end" : "justify-start"
                      )}>
                        {isSent ? (
                          <>
                            <MessageStatusIcon status={message.status} />
                            <span>{formatMessageTime(message.timestamp)}</span>
                            {message.isEdited && (
                              <span className="text-[10px] italic text-muted-foreground">editada</span>
                            )}
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            <span className="font-medium text-foreground">You</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">{senderName}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            <span>{formatMessageTime(message.timestamp)}</span>
                            {message.isEdited && (
                              <span className="text-[10px] italic text-muted-foreground">editada</span>
                            )}
                            <MessageStatusIcon status={message.status} />
                          </>
                        )}
                      </div>

                      {/* Hover actions — 3-dot menu */}
                      <div className={cn(
                        "absolute top-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                        isSent ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        <button
                          onClick={() => onReply(message)}
                          className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Responder"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onForward(message)}
                          className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Encaminhar"
                        >
                          <Forward className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onCopy(message.content)}
                          className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {message.type === 'text' && (
                          <TextToSpeechButton
                            messageId={message.id}
                            text={message.content}
                            isLoading={ttsLoading}
                            isPlaying={ttsPlaying}
                            currentMessageId={ttsMessageId}
                            onSpeak={onSpeak}
                            onStop={onStop}
                            className="p-1.5 rounded-full bg-muted"
                          />
                        )}
                        {instanceName && contactJid && (
                          <MessageContextActions
                            message={message}
                            instanceName={instanceName}
                            contactJid={contactJid}
                            onEditStart={onEditStart}
                          />
                        )}
                      </div>

                      {/* Message bubble */}
                      {(message as any).is_deleted ? (
                        <DeletedMessagePlaceholder isSent={isSent} />
                      ) : (
                      <div
                        className={cn(
                          'relative px-4 py-2.5 rounded-2xl transition-all',
                          isSent 
                            ? 'rounded-br-sm bg-primary text-primary-foreground' 
                            : 'rounded-bl-sm bg-card border border-border/40 text-foreground'
                        )}
                      >
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
                      </div>
                      )}

                      {/* Reactions */}
                      <MessageReactions
                        messageId={message.id}
                        isSent={isSent}
                      />
                    </div>

                    {/* Avatar — sent messages (right) */}
                    {isSent && (
                      <Avatar className="w-9 h-9 shrink-0 mt-6">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                          You
                        </AvatarFallback>
                      </Avatar>
                    )}
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
