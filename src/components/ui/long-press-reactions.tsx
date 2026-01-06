import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  label: string;
  shortcut?: string;
}

const DEFAULT_REACTIONS: Reaction[] = [
  { emoji: '👍', label: 'Curtir', shortcut: 'L' },
  { emoji: '❤️', label: 'Amei', shortcut: 'H' },
  { emoji: '😂', label: 'Haha', shortcut: 'A' },
  { emoji: '😮', label: 'Uau', shortcut: 'W' },
  { emoji: '😢', label: 'Triste', shortcut: 'S' },
  { emoji: '😡', label: 'Grr', shortcut: 'G' },
];

interface LongPressReactionsProps {
  children: ReactNode;
  onReact: (emoji: string) => void;
  reactions?: Reaction[];
  longPressDelay?: number;
  disabled?: boolean;
  className?: string;
  position?: 'top' | 'bottom';
  hapticFeedback?: boolean;
}

export function LongPressReactions({
  children,
  onReact,
  reactions = DEFAULT_REACTIONS,
  longPressDelay = 500,
  disabled = false,
  className,
  position = 'top',
  hapticFeedback = true,
}: LongPressReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pressPosition, setPressPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Haptic feedback
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback) return;
    if ('vibrate' in navigator) {
      const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 25 : 50;
      navigator.vibrate(duration);
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    const touch = 'touches' in e ? e.touches[0] : e;
    const rect = containerRef.current?.getBoundingClientRect();
    
    if (rect) {
      setPressPosition({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }

    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium');
      setIsOpen(true);
    }, longPressDelay);
  }, [disabled, longPressDelay, triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isOpen) {
      handleTouchEnd();
      return;
    }

    // Track finger position over reactions
    const touch = 'touches' in e ? e.touches[0] : e;
    const reactionElements = document.querySelectorAll('[data-reaction-index]');
    
    reactionElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        if (hoveredIndex !== index) {
          setHoveredIndex(index);
          triggerHaptic('light');
        }
      }
    });
  }, [isOpen, hoveredIndex, triggerHaptic, handleTouchEnd]);

  const handleRelease = useCallback(() => {
    handleTouchEnd();
    
    if (isOpen && hoveredIndex !== null) {
      const selectedReaction = reactions[hoveredIndex];
      triggerHaptic('medium');
      onReact(selectedReaction.emoji);
    }
    
    setIsOpen(false);
    setHoveredIndex(null);
  }, [isOpen, hoveredIndex, reactions, onReact, triggerHaptic, handleTouchEnd]);

  const handleReactionClick = useCallback((emoji: string) => {
    triggerHaptic('medium');
    onReact(emoji);
    setIsOpen(false);
    setHoveredIndex(null);
  }, [onReact, triggerHaptic]);

  // Close on outside click
  const handleOverlayClick = useCallback(() => {
    setIsOpen(false);
    setHoveredIndex(null);
  }, []);

  return (
    <>
      {/* Overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={handleOverlayClick}
          />
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className={cn("relative touch-none select-none", className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleRelease}
        onTouchMove={handleTouchMove}
        onMouseDown={handleTouchStart}
        onMouseUp={handleRelease}
        onMouseLeave={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}

        {/* Reactions popup */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: position === 'top' ? 20 : -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: position === 'top' ? 20 : -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 z-50",
                position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'
              )}
              style={{
                transformOrigin: position === 'top' ? 'bottom center' : 'top center',
              }}
            >
              <motion.div
                className="flex items-center gap-1 px-3 py-2 bg-card/95 backdrop-blur-xl rounded-full shadow-2xl border border-border"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3), 0 4px 20px -5px rgba(0,0,0,0.2)',
                }}
              >
                {reactions.map((reaction, index) => (
                  <ReactionItem
                    key={reaction.emoji}
                    reaction={reaction}
                    index={index}
                    isHovered={hoveredIndex === index}
                    onClick={() => handleReactionClick(reaction.emoji)}
                    onHover={() => setHoveredIndex(index)}
                    onLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </motion.div>

              {/* Arrow indicator */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-border rotate-45",
                  position === 'top' 
                    ? 'top-full -mt-1.5 border-r border-b' 
                    : 'bottom-full -mb-1.5 border-l border-t'
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

interface ReactionItemProps {
  reaction: Reaction;
  index: number;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}

function ReactionItem({
  reaction,
  index,
  isHovered,
  onClick,
  onHover,
  onLeave,
}: ReactionItemProps) {
  return (
    <motion.button
      data-reaction-index={index}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="relative flex flex-col items-center p-1 rounded-full transition-colors hover:bg-muted/50"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: isHovered ? 1.5 : 1,
        y: isHovered ? -12 : 0,
      }}
      transition={{
        delay: index * 0.03,
        type: 'spring',
        stiffness: 500,
        damping: 25,
      }}
    >
      <span 
        className="text-2xl select-none" 
        style={{ 
          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
        }}
      >
        {reaction.emoji}
      </span>

      {/* Label tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.8 }}
            className="absolute -top-8 px-2 py-0.5 bg-foreground text-background text-xs font-medium rounded whitespace-nowrap"
          >
            {reaction.label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Quick double-tap reaction (like Instagram)
interface DoubleTapReactionProps {
  children: ReactNode;
  onReact: () => void;
  reactionEmoji?: string;
  disabled?: boolean;
  className?: string;
}

export function DoubleTapReaction({
  children,
  onReact,
  reactionEmoji = '❤️',
  disabled = false,
  className,
}: DoubleTapReactionProps) {
  const [showReaction, setShowReaction] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ x: 50, y: 50 });
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300) {
      // Double tap detected
      const touch = 'touches' in e ? e.touches[0] : e;
      const rect = containerRef.current?.getBoundingClientRect();
      
      if (rect) {
        setReactionPosition({
          x: ((touch.clientX - rect.left) / rect.width) * 100,
          y: ((touch.clientY - rect.top) / rect.height) * 100,
        });
      }

      setShowReaction(true);
      onReact();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([15, 10, 25]);
      }

      setTimeout(() => setShowReaction(false), 1000);
    }
    
    lastTapRef.current = now;
  }, [disabled, onReact]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onClick={handleDoubleTap}
      onTouchStart={handleDoubleTap}
    >
      {children}

      {/* Floating reaction animation */}
      <AnimatePresence>
        {showReaction && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1.2, 1.5],
              y: [0, -30, -50, -80],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute pointer-events-none z-50"
            style={{
              left: `${reactionPosition.x}%`,
              top: `${reactionPosition.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="text-6xl drop-shadow-lg">{reactionEmoji}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
