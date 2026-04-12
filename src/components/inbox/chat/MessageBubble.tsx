import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { Reply, Forward, Copy, Download } from 'lucide-react';
import { SwipeableMessage } from '@/components/mobile/SwipeableMessage';
import { MessageContextMenu } from '../MessageContextMenu';
import { DeletedMessagePlaceholder } from '../DeletedMessagePlaceholder';
import { MessageContextActions } from '../MessageContextActions';
import { HighlightedText } from './HighlightedText';
import { Message, InteractiveButton } from '@/types/chat';
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
import { formatMessageTime, MessageStatusIcon } from './messageUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  contactAvatar?: string;
  instanceName?: string;
  contactJid?: string;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  highlightedMessageIds?: Set<string>;
  activeHighlightId?: string | null;
  searchQuery?: string;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onInteractiveButtonClick: (button: InteractiveButton) => void;
  onEditStart?: (message: Message) => void;
  onMessageDeleted: (messageId: string) => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

export function MessageBubble({
  message, isFirstInGroup, isLastInGroup, contactAvatar, instanceName, contactJid,
  ttsLoading, ttsPlaying, ttsMessageId, highlightedMessageIds, activeHighlightId, searchQuery,
  onSpeak, onStop, onReply, onForward, onCopy, onScrollToMessage, onInteractiveButtonClick,
  onEditStart, onMessageDeleted, registerRef,
}: MessageBubbleProps) {
  const { toast } = useToast();
  const isSent = message.sender === 'agent';
  const senderName = isSent ? 'Você' : message.senderName || 'Contato';

  return (
    <MessageContextMenu
      message={message}
      onReply={onReply}
      onForward={onForward}
      onCopy={(content) => { navigator.clipboard.writeText(content); toast({ title: 'Copiado!' }); }}
      onDelete={(messageId) => { toast({ title: 'Mensagem deletada', description: messageId.slice(0, 8) }); }}
      onSpeak={onSpeak ? (content, msgId) => onSpeak(msgId, content) : undefined}
      onDownload={message.mediaUrl ? (url) => window.open(url, '_blank') : undefined}
    >
      <SwipeableMessage onSwipeRight={() => onReply(message)} onSwipeLeft={() => onForward(message)}>
        <div
          ref={registerRef}
          data-search-highlight={highlightedMessageIds?.has(message.id) ? 'true' : undefined}
          className={cn(
            'flex group gap-2.5 transition-all duration-300',
            isSent ? 'justify-end' : 'justify-start',
            !isLastInGroup && 'mb-0.5',
            highlightedMessageIds?.has(message.id) && 'relative',
            activeHighlightId === message.id && 'ring-2 ring-[hsl(var(--warning))] ring-offset-1 ring-offset-background rounded-2xl animate-[pulse_1.5s_ease-in-out_1]',
            highlightedMessageIds?.has(message.id) && activeHighlightId !== message.id && 'bg-[hsl(var(--warning)/0.08)] rounded-2xl',
          )}
        >
          {/* Avatar — received */}
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
            {!isSent && isFirstInGroup && (
              <span className="text-[11px] font-semibold text-primary/80 ml-1 block">{senderName}</span>
            )}

            {/* Hover actions */}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10",
              isSent ? "right-full mr-1.5" : "left-full ml-1.5"
            )}>
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => onReply(message)} className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors" title="Responder">
                <Reply className="w-3 h-3" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => onForward(message)} className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors" title="Encaminhar">
                <Forward className="w-3 h-3" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => onCopy(message.content)} className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 shadow-md transition-colors" title="Copiar">
                <Copy className="w-3 h-3" />
              </motion.button>
              {message.type === 'text' && (
                <TextToSpeechButton messageId={message.id} text={message.content} isLoading={ttsLoading} isPlaying={ttsPlaying} currentMessageId={ttsMessageId} onSpeak={onSpeak} onStop={onStop} className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 shadow-md" />
              )}
              {instanceName && contactJid && (
                <MessageContextActions message={message} instanceName={instanceName} contactJid={contactJid} onEditStart={onEditStart} onMessageDeleted={onMessageDeleted} />
              )}
            </div>

            {/* Message bubble */}
            {message.is_deleted ? (
              <DeletedMessagePlaceholder isSent={isSent} content={message.content} />
            ) : (
              <motion.div
                whileHover={{ scale: 1.005 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'relative transition-all overflow-hidden',
                  (message.type === 'image' || message.type === 'video') && !message.content ? 'p-0' : 'px-3.5 py-2',
                  isSent
                    ? cn('bg-primary text-primary-foreground shadow-sm',
                        isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md',
                        isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-br-sm',
                        !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tr-sm rounded-br-md',
                        !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tr-sm rounded-br-sm')
                    : cn('bg-card border border-border/30 text-foreground shadow-[var(--shadow-sm)]',
                        isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md',
                        isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-bl-sm',
                        !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-tl-sm rounded-bl-md',
                        !isFirstInGroup && !isLastInGroup && 'rounded-xl rounded-tl-sm rounded-bl-sm')
                )}
              >
                {message.replyTo && <QuotedMessage replyTo={message.replyTo} isSent={isSent} onClick={() => onScrollToMessage(message.replyTo!.messageId)} />}
                {message.buttonResponse && <ButtonResponseBadge buttonTitle={message.buttonResponse.buttonTitle} isSent={isSent} />}
                {message.type === 'interactive' && message.interactive && <InteractiveMessageDisplay interactive={message.interactive} isSent={isSent} onButtonClick={onInteractiveButtonClick} />}

                {message.type === 'image' && message.mediaUrl && (
                  <div className={cn("overflow-hidden", message.content ? "mb-1.5 -mx-1 -mt-0.5 rounded-xl" : "w-full")}>
                    <MessageImage src={message.mediaUrl} />
                  </div>
                )}

                {message.type === 'video' && message.mediaUrl && (
                  <div className="mb-1.5"><VideoPreview url={message.mediaUrl} caption={message.content} isSent={isSent} /></div>
                )}

                {message.type === 'audio' && message.mediaUrl && (
                  <div className="mb-1">
                    <AudioMessagePlayer audioUrl={message.mediaUrl} messageId={message.id} isSent={isSent} existingTranscription={message.transcription} transcriptionStatus={message.transcriptionStatus} />
                    {searchQuery && highlightedMessageIds?.has(message.id) && message.transcription && (
                      <p className="text-[11px] mt-1 px-1 italic text-muted-foreground"><HighlightedText text={message.transcription} query={searchQuery} /></p>
                    )}
                  </div>
                )}

                {message.type === 'document' && message.mediaUrl && (
                  <div className="mb-1.5">
                    <DocumentPreview url={message.mediaUrl} fileName={searchQuery && highlightedMessageIds?.has(message.id) && message.content ? undefined : (message.content || 'documento')} isSent={isSent} />
                    {searchQuery && highlightedMessageIds?.has(message.id) && message.content && (
                      <p className="text-[12px] mt-1 px-1"><HighlightedText text={message.content} query={searchQuery} /></p>
                    )}
                  </div>
                )}

                {message.type === 'location' && message.location && <LocationMessageDisplay location={message.location} isSent={isSent} />}

                {message.type === 'sticker' && message.mediaUrl && (
                  <div className="mb-1 group/sticker relative">
                    <img src={message.mediaUrl} alt="Sticker" className="max-w-[160px] max-h-[160px] object-contain drop-shadow-lg" loading="lazy" />
                    {!isSent && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { data: existing } = await supabase.from('stickers').select('id').eq('image_url', message.mediaUrl!).maybeSingle();
                            if (existing) { toast({ title: 'Figurinha já está na biblioteca!' }); return; }
                            toast({ title: '🔍 Classificando figurinha com IA...' });
                            let category = 'recebidas';
                            try {
                              const { data: classifyData, error: classifyErr } = await supabase.functions.invoke('classify-sticker', { body: { image_url: message.mediaUrl } });
                              if (!classifyErr && classifyData?.category) category = classifyData.category;
                            } catch { /* fallback */ }
                            await supabase.from('stickers').insert({ name: `Recebida ${new Date().toLocaleDateString('pt-BR')}`, image_url: message.mediaUrl!, category, is_favorite: false, use_count: 0 });
                            toast({ title: `✅ Figurinha salva como "${category}"!` });
                          } catch { toast({ title: 'Erro ao salvar figurinha', variant: 'destructive' }); }
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
                  <p className="text-[13.5px] whitespace-pre-wrap leading-[1.45]">
                    {searchQuery && highlightedMessageIds?.has(message.id) ? <HighlightedText text={message.content} query={searchQuery} /> : message.content}
                  </p>
                )}

                <div className={cn(
                  'flex items-center justify-end gap-1 mt-0.5 -mb-0.5',
                  (message.type === 'image' || message.type === 'video') && !message.content
                    ? 'absolute bottom-2 right-3 text-white drop-shadow-md'
                    : isSent ? 'text-primary-foreground/60' : 'text-muted-foreground/70',
                  (message.type === 'image' || message.type === 'video') && !message.content && 'px-3.5 pb-1'
                )}>
                  {message.isEdited && <span className="text-[9px] italic mr-0.5">editada</span>}
                  <span className="text-[10px] font-medium">{formatMessageTime(message.timestamp)}</span>
                  {isSent && <MessageStatusIcon status={message.status} />}
                </div>
              </motion.div>
            )}

            <MessageReactions messageId={message.id} isSent={isSent} />
          </div>

          {/* Avatar — sent */}
          {isSent && (
            <div className="w-8 shrink-0">
              {isLastInGroup && (
                <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-[10px] font-bold">Eu</AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>
      </SwipeableMessage>
    </MessageContextMenu>
  );
}
