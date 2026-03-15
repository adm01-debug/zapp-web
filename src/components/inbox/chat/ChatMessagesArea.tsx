import { useRef, forwardRef, useImperativeHandle } from 'react';
import { DeletedMessagePlaceholder } from '../DeletedMessagePlaceholder';
import { cn } from '@/lib/utils';
import { Message, InteractiveButton } from '@/types/chat';
import { TypingIndicator } from '../TypingIndicator';
import { MessageImage } from '../ImagePreview';
import { DocumentPreview, VideoPreview } from '../MediaPreview';
import { AudioMessagePlayer } from '../AudioMessagePlayer';
import { InteractiveMessageDisplay, ButtonResponseBadge } from '../InteractiveMessage';
import { QuotedMessage } from '../ReplyQuote';
import { LocationMessageDisplay } from '../LocationMessage';
import { Check, CheckCheck, Clock, X } from 'lucide-react';
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
      return <Check className="w-3.5 h-3.5" />;
    case 'delivered':
      return <CheckCheck className="w-3.5 h-3.5" />;
    case 'read':
      return <CheckCheck className="w-3.5 h-3.5 text-info" />;
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

export const ChatMessagesArea = forwardRef<ChatMessagesAreaRef, ChatMessagesAreaProps>(
  ({ messages, isContactTyping, typingUserName, onScrollToMessage, onInteractiveButtonClick }, ref) => {
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
          }, 1800);
        }
      },
    }));

    const groupedMessages = messages.reduce((groups, message) => {
      const dateKey = format(message.timestamp, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(message);
      return groups;
    }, {} as Record<string, Message[]>);

    return (
      <div className="flex-1 overflow-y-auto px-3 md:px-5 py-2 space-y-1 scrollbar-thin whatsapp-chat-wallpaper">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            <div className="flex justify-center my-4">
              <span className="text-[12px] text-muted-foreground bg-background/85 px-3 py-1 rounded-md shadow-xs">
                {formatDateSeparator(new Date(dateKey))}
              </span>
            </div>

            <div className="space-y-0.5">
              {dayMessages.map((message) => {
                const isSent = message.sender === 'agent';

                return (
                  <div
                    key={message.id}
                    ref={(el) => {
                      messageRefs.current[message.id] = el;
                    }}
                    className={cn('flex', isSent ? 'justify-end' : 'justify-start')}
                  >
                    {(message as any).is_deleted ? (
                      <DeletedMessagePlaceholder isSent={isSent} />
                    ) : (
                      <div
                        className={cn(
                          'relative max-w-[82%] md:max-w-[68%] px-2.5 pt-1.5 pb-1 rounded-lg shadow-xs',
                          isSent
                            ? 'rounded-tr-[3px] bg-[hsl(var(--chat-bubble-sent))] text-[hsl(var(--chat-bubble-sent-foreground))]'
                            : 'rounded-tl-[3px] bg-[hsl(var(--chat-bubble-received))] text-[hsl(var(--chat-bubble-received-foreground))]'
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
                          <ButtonResponseBadge buttonTitle={message.buttonResponse.buttonTitle} isSent={isSent} />
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
                            <VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} />
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
                          <LocationMessageDisplay location={message.location} isSent={isSent} />
                        )}

                        {message.content &&
                          message.type !== 'audio' &&
                          message.type !== 'location' &&
                          message.type !== 'video' &&
                          message.type !== 'document' && (
                            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</p>
                          )}

                        <div
                          className={cn(
                            'flex items-center justify-end gap-1 mt-0.5 text-[11px]',
                            isSent ? 'text-foreground/55' : 'text-muted-foreground'
                          )}
                        >
                          <span>{formatMessageTime(message.timestamp)}</span>
                          {isSent && <MessageStatusIcon status={message.status} />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-start px-1 py-1">
          <TypingIndicator isVisible={isContactTyping} userName={typingUserName} />
        </div>

        <div ref={messagesEndRef} />
      </div>
    );
  }
);

ChatMessagesArea.displayName = 'ChatMessagesArea';
