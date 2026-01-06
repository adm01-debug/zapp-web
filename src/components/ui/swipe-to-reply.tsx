import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Reply, CornerUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeToReplyProps {
  children: ReactNode;
  onReply: () => void;
  disabled?: boolean;
  direction?: 'left' | 'right';
  threshold?: number;
  className?: string;
  replyIcon?: typeof Reply;
  hapticFeedback?: boolean;
}

export function SwipeToReply({
  children,
  onReply,
  disabled = false,
  direction = 'left',
  threshold = 60,
  className,
  replyIcon: ReplyIcon = Reply,
  hapticFeedback = true,
}: SwipeToReplyProps) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);

  // Haptic feedback
  const triggerHaptic = () => {
    if (!hapticFeedback) return;
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 10, 25]);
    }
  };

  // Transform values based on direction
  const isLeftSwipe = direction === 'left';
  const dragConstraints = isLeftSwipe 
    ? { left: -threshold * 1.5, right: 0 }
    : { left: 0, right: threshold * 1.5 };

  // Icon transforms
  const iconOpacity = useTransform(
    x, 
    isLeftSwipe ? [-threshold, -threshold / 2, 0] : [0, threshold / 2, threshold],
    [1, 0.5, 0]
  );
  const iconScale = useTransform(
    x,
    isLeftSwipe ? [-threshold, -threshold / 2, 0] : [0, threshold / 2, threshold],
    [1.2, 0.8, 0.4]
  );
  const iconX = useTransform(
    x,
    isLeftSwipe ? [-threshold, 0] : [0, threshold],
    isLeftSwipe ? [-10, 30] : [-30, 10]
  );

  // Background color intensity
  const bgOpacity = useTransform(
    x,
    isLeftSwipe ? [-threshold, 0] : [0, threshold],
    [0.15, 0]
  );

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const triggered = isLeftSwipe ? offset < -threshold : offset > threshold;
    
    if (triggered && !isTriggered) {
      setIsTriggered(true);
      triggerHaptic();
    } else if (!triggered && isTriggered) {
      setIsTriggered(false);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    setIsTriggered(false);
    
    if (disabled) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Fast swipe or past threshold
    const shouldTrigger = isLeftSwipe 
      ? (offset < -threshold || velocity < -300)
      : (offset > threshold || velocity > 300);

    if (shouldTrigger) {
      triggerHaptic();
      onReply();
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden", className)}>
      {/* Reply indicator */}
      <motion.div
        className={cn(
          "absolute inset-y-0 flex items-center justify-center w-16 pointer-events-none",
          isLeftSwipe ? "right-0" : "left-0"
        )}
        style={{ opacity: iconOpacity }}
      >
        <motion.div
          style={{ scale: iconScale, x: iconX }}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
            isTriggered 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isTriggered ? 'triggered' : 'default'}
              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.15, type: 'spring', stiffness: 400 }}
            >
              {isTriggered ? (
                <CornerUpLeft className="w-5 h-5" />
              ) : (
                <ReplyIcon className="w-5 h-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Background indicator */}
      <motion.div
        className={cn(
          "absolute inset-0 bg-primary pointer-events-none",
          isLeftSwipe ? "origin-right" : "origin-left"
        )}
        style={{ opacity: bgOpacity }}
      />

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
        className={cn(
          "relative bg-transparent z-10 touch-pan-y",
          isDragging && "cursor-grabbing"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Message-specific wrapper with visual reply preview
interface SwipeToReplyMessageProps extends SwipeToReplyProps {
  messageContent?: string;
  senderName?: string;
}

export function SwipeToReplyMessage({
  children,
  onReply,
  messageContent,
  senderName,
  ...props
}: SwipeToReplyMessageProps) {
  const [showReplyHint, setShowReplyHint] = useState(false);

  return (
    <div className="relative">
      <SwipeToReply 
        onReply={() => {
          setShowReplyHint(true);
          setTimeout(() => setShowReplyHint(false), 300);
          onReply();
        }}
        {...props}
      >
        {children}
      </SwipeToReply>

      {/* Reply activation feedback */}
      <AnimatePresence>
        {showReplyHint && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg z-20 whitespace-nowrap"
          >
            <span className="flex items-center gap-1.5">
              <Reply className="w-3 h-3" />
              Respondendo...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
