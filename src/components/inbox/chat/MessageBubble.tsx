import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { Reply, Forward, Copy, Download } from 'lucide-react';
import { SwipeableMessage } from '@/components/mobile/SwipeableMessage';
import { DeletedMessagePlaceholder } from '../DeletedMessagePlaceholder';
import { HighlightedText } from './HighlightedText';
import { Message, InteractiveButton } from '@/types/chat';
import { TypingIndicator } from '../TypingIndicator';
import { MessageReactions, QuickReactionBar } from '../MessageReactions';
import { MessageHoverToolbar } from './MessageHoverToolbar';
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

import { getLogger } from '@/lib/logger';
const log = getLogger('MessageBubble');

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
  const { profile } = useAuth();
  const isSent = message.sender === 'agent';
  const senderName = isSent ? 'Você' : message.senderName || 'Contato';
  const agentInitials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'EU';

  return (
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

            {/* Floating emoji reactions on hover — WhatsApp Web style */}
            <AnimatePresence>
              <QuickReactionBar
                messageId={message.id}
                isSent={isSent}
                instanceName={instanceName}
                contactJid={contactJid}
                externalId={message.external_id}
                senderType={message.sender}
                refreshKey={message.updated_at}
                disableRealtime
              />
            </AnimatePresence>
...
            <MessageReactions
              messageId={message.id}
              isSent={isSent}
              instanceName={instanceName}
              contactJid={contactJid}
              externalId={message.external_id}
              senderType={message.sender}
              refreshKey={message.updated_at}
              disableRealtime
            />
          </div>

          {/* Avatar — sent */}
          {isSent && (
            <div className="w-8 shrink-0">
              {isLastInGroup && (
                <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-[10px] font-bold">
                    {agentInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}
        </div>
      </SwipeableMessage>
  );
}
