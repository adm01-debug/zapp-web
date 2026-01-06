import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Smile, Search, Clock, Heart, ThumbsUp, Laugh, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Emoji categories
const emojiCategories = {
  recent: {
    label: 'Recentes',
    icon: Clock,
    emojis: ['👍', '❤️', '😂', '😊', '🙏', '👏', '🎉', '🔥'],
  },
  smileys: {
    label: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
      '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
      '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    ],
  },
  gestures: {
    label: 'Gestos',
    icon: ThumbsUp,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
    ],
  },
  hearts: {
    label: 'Corações',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋',
    ],
  },
  celebration: {
    label: 'Celebração',
    icon: Laugh,
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈',
      '🥉', '🏅', '🎖️', '🎗️', '🎄', '🎃', '🎆', '🎇',
      '✨', '🎍', '🎋', '🎑', '🎎', '🎏', '🎐', '🎠',
      '🎡', '🎢', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧',
    ],
  },
};

type EmojiCategory = keyof typeof emojiCategories;

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
  recentEmojis?: string[];
  onRecentUpdate?: (emojis: string[]) => void;
}

export function EmojiPicker({
  onEmojiSelect,
  trigger,
  className,
  recentEmojis = [],
  onRecentUpdate,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<EmojiCategory>('smileys');
  const [hoveredEmoji, setHoveredEmoji] = React.useState<string | null>(null);

  // Handle emoji selection
  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Update recent emojis
    if (onRecentUpdate) {
      const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 8);
      onRecentUpdate(updated);
    }
    
    setIsOpen(false);
  };

  // Filter emojis based on search
  const filteredEmojis = React.useMemo(() => {
    if (!searchQuery) return null;
    
    const query = searchQuery.toLowerCase();
    const allEmojis = Object.values(emojiCategories).flatMap(cat => cat.emojis);
    
    // Simple filter - in real app would use emoji names/keywords
    return allEmojis.filter((_, idx) => idx % 3 === 0).slice(0, 24);
  }, [searchQuery]);

  const currentEmojis = filteredEmojis || emojiCategories[activeCategory].emojis;
  const displayRecent = recentEmojis.length > 0 ? recentEmojis : emojiCategories.recent.emojis;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className={cn('h-9 w-9', className)}>
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col h-[320px]">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar emoji..."
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          {!searchQuery && (
            <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
              {Object.entries(emojiCategories).map(([key, category]) => {
                const Icon = category.icon;
                const isActive = activeCategory === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key as EmojiCategory)}
                    className={cn(
                      'flex-shrink-0 p-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title={category.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Emoji grid */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* Recent section */}
              {!searchQuery && activeCategory !== 'recent' && displayRecent.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    Recentes
                  </h4>
                  <div className="grid grid-cols-8 gap-1">
                    {displayRecent.map((emoji, idx) => (
                      <EmojiButton
                        key={`recent-${idx}`}
                        emoji={emoji}
                        onSelect={handleSelect}
                        isHovered={hoveredEmoji === `recent-${emoji}`}
                        onHover={() => setHoveredEmoji(`recent-${emoji}`)}
                        onLeave={() => setHoveredEmoji(null)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Main grid */}
              <div>
                {!searchQuery && (
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    {emojiCategories[activeCategory].label}
                  </h4>
                )}
                <div className="grid grid-cols-8 gap-1">
                  {currentEmojis.map((emoji, idx) => (
                    <EmojiButton
                      key={idx}
                      emoji={emoji}
                      onSelect={handleSelect}
                      isHovered={hoveredEmoji === emoji}
                      onHover={() => setHoveredEmoji(emoji)}
                      onLeave={() => setHoveredEmoji(null)}
                    />
                  ))}
                </div>
              </div>

              {/* Empty search state */}
              {searchQuery && filteredEmojis?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Smile className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum emoji encontrado</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Preview footer */}
          <AnimatePresence>
            {hoveredEmoji && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border overflow-hidden"
              >
                <div className="flex items-center gap-3 p-2">
                  <span className="text-2xl">{hoveredEmoji.replace(/^recent-/, '')}</span>
                  <span className="text-xs text-muted-foreground">
                    Clique para adicionar
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual emoji button
interface EmojiButtonProps {
  emoji: string;
  onSelect: (emoji: string) => void;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

function EmojiButton({ emoji, onSelect, isHovered, onHover, onLeave }: EmojiButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onSelect(emoji)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-md text-xl',
        'transition-colors hover:bg-muted',
        isHovered && 'bg-muted'
      )}
    >
      {emoji}
    </motion.button>
  );
}

// Quick reaction picker (compact version for messages)
interface QuickReactionPickerProps {
  onReact: (emoji: string) => void;
  currentReaction?: string;
  className?: string;
}

export function QuickReactionPicker({ 
  onReact, 
  currentReaction,
  className 
}: QuickReactionPickerProps) {
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  const [showMore, setShowMore] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className={cn(
        'flex items-center gap-1 p-1.5 rounded-full bg-popover border border-border shadow-lg',
        className
      )}
    >
      {quickEmojis.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReact(emoji)}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-full text-lg',
            'transition-colors hover:bg-muted',
            currentReaction === emoji && 'bg-primary/10 ring-2 ring-primary'
          )}
        >
          {emoji}
        </motion.button>
      ))}
      
      <EmojiPicker
        onEmojiSelect={onReact}
        trigger={
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        }
      />
    </motion.div>
  );
}

// Floating reaction animation
interface FloatingReactionProps {
  emoji: string;
  onComplete: () => void;
}

export function FloatingReaction({ emoji, onComplete }: FloatingReactionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.5, 1.2, 1],
        y: -100,
      }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className="fixed pointer-events-none text-4xl z-50"
      style={{ left: '50%', bottom: '50%', transform: 'translateX(-50%)' }}
    >
      {emoji}
    </motion.div>
  );
}
