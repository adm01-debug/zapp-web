import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SmilePlus, X } from 'lucide-react';
import { MessageReaction } from '@/types/chat';

// WhatsApp supported reactions
const WHATSAPP_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Extended reactions for more options
const EXTENDED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '👏', '💯', '✅', '❌'];

interface MessageReactionsProps {
  messageId: string;
  reactions?: MessageReaction[];
  onReact?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  isSent?: boolean;
  currentUserId?: string;
  showExtended?: boolean;
}

export function MessageReactions({ 
  messageId, 
  reactions = [], 
  onReact, 
  onRemoveReaction,
  isSent,
  currentUserId = 'agent',
  showExtended = false
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasCurrentUser: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.userName || reaction.userId);
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasCurrentUser: boolean }>);

  const reactionsList = Object.values(groupedReactions);

  const handleReact = (emoji: string) => {
    const existingReaction = groupedReactions[emoji];
    
    // If user already reacted with this emoji, remove it
    if (existingReaction?.hasCurrentUser) {
      onRemoveReaction?.(emoji);
    } else {
      onReact?.(emoji);
    }
    setIsOpen(false);
  };

  const availableReactions = showExtended ? EXTENDED_REACTIONS : WHATSAPP_REACTIONS;

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', isSent ? 'justify-end' : 'justify-start')}>
      {/* Existing reactions */}
      <TooltipProvider>
        <AnimatePresence mode="popLayout">
          {reactionsList.map((reaction, index) => (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: index * 0.03 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReact(reaction.emoji)}
                  className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs',
                    'border transition-all cursor-pointer',
                    reaction.hasCurrentUser
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                      : 'bg-muted/80 hover:bg-muted border-border/50'
                  )}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className={cn(
                      "text-[10px] font-medium",
                      reaction.hasCurrentUser ? "text-primary" : "text-muted-foreground"
                    )}>
                      {reaction.count}
                    </span>
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="max-w-[150px]">
                  {reaction.users.slice(0, 5).join(', ')}
                  {reaction.users.length > 5 && ` +${reaction.users.length - 5}`}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </AnimatePresence>
      </TooltipProvider>

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'p-1 rounded-full transition-all',
              'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
              reactionsList.length === 0 
                ? 'opacity-0 group-hover:opacity-100' 
                : 'opacity-60 hover:opacity-100'
            )}
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 bg-popover/95 backdrop-blur-sm" 
          align={isSent ? 'end' : 'start'}
          sideOffset={4}
        >
          <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
            {availableReactions.map((emoji) => {
              const hasReacted = groupedReactions[emoji]?.hasCurrentUser;
              
              return (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReact(emoji)}
                  className={cn(
                    "p-1.5 rounded-md transition-all text-lg relative",
                    hasReacted 
                      ? "bg-primary/10 ring-1 ring-primary/30" 
                      : "hover:bg-muted"
                  )}
                >
                  {emoji}
                  {hasReacted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center"
                    >
                      <X className="w-2 h-2 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Quick reaction bar that appears on hover
interface QuickReactionBarProps {
  onReact: (emoji: string) => void;
  isSent?: boolean;
}

export function QuickReactionBar({ onReact, isSent }: QuickReactionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute -top-8 flex items-center gap-0.5 p-1 rounded-full",
        "bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg",
        isSent ? "right-0" : "left-0"
      )}
    >
      {WHATSAPP_REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onReact(emoji)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <span className="text-sm">{emoji}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
