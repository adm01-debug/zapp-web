import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Paperclip, ChevronDown, ChevronUp, Reply, Forward, Star } from 'lucide-react';
import type { EmailMessage } from '@/hooks/useGmail';

interface EmailChatBubbleProps {
  message: EmailMessage;
  isLast: boolean;
  onReply?: (message: EmailMessage) => void;
  onForward?: (message: EmailMessage) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return email[0]?.toUpperCase() || '?';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function EmailChatBubble({ message, isLast, onReply, onForward }: EmailChatBubbleProps) {
  const [expanded, setExpanded] = useState(isLast);
  const isSent = message.direction === 'outbound';

  const bodyPreview = message.body_text?.slice(0, 300) || message.snippet || '';
  const hasMore = (message.body_text?.length || 0) > 300;

  return (
    <div className={cn('flex group gap-2 mb-3', isSent ? 'justify-end' : 'justify-start')}>
      {/* Avatar for inbound */}
      {!isSent && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600">
            {getInitials(message.from_name, message.from_address)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="max-w-[75%] space-y-0.5 relative">
        {/* Hover actions */}
        <div className={cn(
          'absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10',
          isSent ? 'right-full mr-1' : 'left-full ml-1'
        )}>
          {onReply && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onReply(message)}
                  className="p-1 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                >
                  <Reply className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Responder</TooltipContent>
            </Tooltip>
          )}
          {onForward && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onForward(message)}
                  className="p-1 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                >
                  <Forward className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Encaminhar</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Sender name for inbound */}
        {!isSent && (
          <p className="text-[10px] text-muted-foreground ml-1 truncate">
            {message.from_name || message.from_address}
          </p>
        )}

        {/* Bubble */}
        <motion.div
          initial={{ opacity: 0, x: isSent ? 10 : -10, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'rounded-2xl px-3.5 py-2.5 shadow-sm relative overflow-hidden',
            isSent
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-card border border-border/30 text-foreground'
          )}
        >
          {/* Subject line if present */}
          {message.subject && (
            <p className={cn(
              'text-[11px] font-semibold mb-1.5 pb-1.5 border-b',
              isSent ? 'border-primary-foreground/20' : 'border-border/30'
            )}>
              {message.subject}
            </p>
          )}

          {/* Body */}
          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">
            {expanded ? (message.body_text || message.snippet) : bodyPreview}
            {hasMore && !expanded && '…'}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                'text-[10px] mt-1 flex items-center gap-0.5',
                isSent ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Menos' : 'Mais'}
            </button>
          )}

          {/* Attachments */}
          {message.has_attachments && (
            <div className={cn(
              'flex items-center gap-1 mt-1.5 pt-1.5 border-t text-[10px]',
              isSent ? 'border-primary-foreground/20 text-primary-foreground/70' : 'border-border/30 text-muted-foreground'
            )}>
              <Paperclip className="w-3 h-3" />
              <span>Anexo(s)</span>
            </div>
          )}

          {/* Time + status */}
          <div className={cn(
            'flex items-center justify-end gap-1.5 mt-1',
            isSent ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}>
            {message.is_starred && <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />}
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px]">{formatTime(message.internal_date)}</span>
              </TooltipTrigger>
              <TooltipContent>{formatFullDate(message.internal_date)}</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      </div>

      {/* Avatar for outbound */}
      {isSent && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            Eu
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
