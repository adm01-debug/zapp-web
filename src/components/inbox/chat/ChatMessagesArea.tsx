import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  return format(date, 'HH:mm');
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-[hsl(var(--info))]" />;
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
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4 scrollbar-thin bg-background/50 relative">
      {/* Animated vector watermark background */}
      <ChatWatermark />

      {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          {/* Date separator — pill style */}
          <div className="flex justify-center my-5">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 bg-muted/50 backdrop-blur-sm px-4 py-1 rounded-full border border-border/30 shadow-sm"
            >
              {formatDateSeparator(new Date(dateKey))}
            </motion.span>
          </div>

          {/* Messages for this day */}
          <StaggeredList className="space-y-3">
            {dayMessages.map((message, idx) => {
              const isSent = message.sender === 'agent';
              const senderName = isSent ? 'Você' : (message as any).senderName || 'Contato';
              // Check if next message is from same sender for grouping
              const nextMsg = dayMessages[idx + 1];
              const isLastInGroup = !nextMsg || nextMsg.sender !== message.sender;
              const prevMsg = dayMessages[idx - 1];
              const isFirstInGroup = !prevMsg || prevMsg.sender !== message.sender;

              return (
                <StaggeredItem key={message.id}>
                  <div
                    ref={(el) => { messageRefs.current[message.id] = el; }}
                    className={cn(
                      'flex group gap-2.5 transition-all duration-200',
                      isSent ? 'justify-end' : 'justify-start',
                      !isLastInGroup && 'mb-0.5'
                    )}
                  >
                    {/* Avatar — received messages (left), only on last in group */}
                    {!isSent && (
                      <div className="w-8 shrink-0">
                        {isLastInGroup && (
                          <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                            <AvatarImage src={contactAvatar} />
                            <AvatarFallback className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground text-[10px] font-bold">
                              {senderName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn('max-w-[68%] space-y-0.5 relative', isSent && 'items-end')}>
                      {/* Sender name — only first in group for received */}
                      {!isSent && isFirstInGroup && (
                        <span className="text-[11px] font-semibold text-primary/80 ml-1 block">
                          {senderName}
                        </span>
                      )}

                      {/* Hover actions */}
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10",
                        isSent ? "right-full mr-1.5" : "left-full ml-1.5"
                      )}>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onReply(message)}
                          className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors"
                          title="Responder"
                        >
                          <Reply className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onForward(message)}
                          className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors"
                          title="Encaminhar"
                        >
                          <Forward className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onCopy(message.content)}
                          className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors"
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3" />
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
                            className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 shadow-md"
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
                        <DeletedMessagePlaceholder isSent={isSent} content={message.content} />
                      ) : (
                      <motion.div
                        whileHover={{ scale: 1.005 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={cn(
                          'relative px-3.5 py-2 transition-all',
                          // Bubble shape: rounded corners with tail
                          isSent
                            ? cn(
                                'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-[var(--shadow-glow-primary)]',
                                isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md',
                                isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-br-sm',
                                !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tr-sm rounded-br-md',
                                !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tr-sm rounded-br-sm',
                              )
                            : cn(
                                'bg-card border border-border/30 text-foreground shadow-[var(--shadow-sm)]',
                                isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md',
                                isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-bl-sm',
                                !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tl-sm rounded-bl-md',
                                !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tl-sm rounded-bl-sm',
                              )
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
                          <div className="mb-1.5 -mx-1 -mt-0.5 rounded-xl overflow-hidden">
                            <MessageImage src={message.mediaUrl} />
                          </div>
                        )}

                        {message.type === 'video' && message.mediaUrl && (
                          <div className="mb-1.5">
                            <VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} />
                          </div>
                        )}

                        {message.type === 'audio' && message.mediaUrl && (
                          <div className="mb-1">
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
                          <div className="mb-1.5">
                            <DocumentPreview url={message.mediaUrl} fileName={message.content || 'documento'} isSent={isSent} />
                          </div>
                        )}

                        {message.type === 'location' && message.location && (
                          <LocationMessageDisplay location={message.location} isSent={isSent} />
                        )}

                        {message.type === 'sticker' && message.mediaUrl && (
                          <div className="mb-1 group/sticker relative">
                            <img
                              src={message.mediaUrl}
                              alt="Sticker"
                              className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg"
                              loading="lazy"
                            />
                            {!isSent && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const { data: existing } = await supabase
                                      .from('stickers')
                                      .select('id')
                                      .eq('image_url', message.mediaUrl!)
                                      .maybeSingle();
                                    if (existing) {
                                      toast({ title: 'Figurinha já está na biblioteca!' });
                                      return;
                                    }
                                    await supabase.from('stickers').insert({
                                      name: `Recebida ${new Date().toLocaleDateString('pt-BR')}`,
                                      image_url: message.mediaUrl!,
                                      category: 'recebidas',
                                      is_favorite: false,
                                      use_count: 0,
                                    });
                                    toast({ title: '✅ Figurinha salva na biblioteca!' });
                                  } catch {
                                    toast({ title: 'Erro ao salvar figurinha', variant: 'destructive' });
                                  }
                                }}
                                className="absolute bottom-1 right-1 opacity-0 group-hover/sticker:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background border border-border/50"
                                title="Salvar na biblioteca"
                              >
                                <Download className="w-3.5 h-3.5 text-foreground" />
                              </button>
                            )}
                          </div>
                        )}

                        {message.content && message.type !== 'audio' && message.type !== 'location' && message.type !== 'video' && message.type !== 'document' && message.type !== 'sticker' && (
                          <p className="text-[13.5px] whitespace-pre-wrap leading-[1.45]">{message.content}</p>
                        )}

                        {/* Timestamp + status — inline bottom-right */}
                        <div
                          className={cn(
                            'flex items-center justify-end gap-1 mt-0.5 -mb-0.5',
                            isSent ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
                          )}
                        >
                          {message.isEdited && (
                            <span className="text-[9px] italic mr-0.5">editada</span>
                          )}
                          <span className="text-[10px] font-medium">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {isSent && <MessageStatusIcon status={message.status} />}
                        </div>
                      </motion.div>
                      )}

                      {/* Reactions */}
                      <MessageReactions messageId={message.id} isSent={isSent} />
                    </div>

                    {/* Avatar — sent messages (right), only on last in group */}
                    {isSent && (
                      <div className="w-8 shrink-0">
                        {isLastInGroup && (
                          <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-[10px] font-bold">
                              Eu
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                  </div>
                </StaggeredItem>
              );
            })}
          </StaggeredList>
        </div>
      ))}

      {/* Typing indicator */}
      <div className="flex justify-start pl-10">
        <TypingIndicator 
          isVisible={isContactTyping} 
          userName={typingUserName}
          variant="bubble"
          avatarUrl={contactAvatar}
        />
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
});

ChatMessagesArea.displayName = 'ChatMessagesArea';
