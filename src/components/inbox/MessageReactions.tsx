import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageReactionsProps {
  messageId: string;
  reactions?: { emoji: string; count: number }[];
  onReact?: (emoji: string) => void;
  isSent?: boolean;
}

export function MessageReactions({ messageId, reactions = [], onReact, isSent }: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact?.(emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1', isSent ? 'justify-end' : 'justify-start')}>
      {/* Existing reactions */}
      <AnimatePresence>
        {reactions.map((reaction, index) => (
          <motion.button
            key={reaction.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: index * 0.05 }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReact(reaction.emoji)}
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs',
              'bg-muted/80 hover:bg-muted border border-border/50',
              'transition-colors cursor-pointer'
            )}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="text-muted-foreground">{reaction.count}</span>
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          align={isSent ? 'end' : 'start'}
          sideOffset={4}
        >
          <div className="flex items-center gap-1">
            {REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReact(emoji)}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-lg"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
