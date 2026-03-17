import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Archive, Check, Trash2, RotateCcw, Pin, PinOff, Star, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeAction {
  icon: typeof Archive;
  color: string;
  bgColor: string;
  label: string;
  action: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  leftSecondaryAction?: SwipeAction;
  rightSecondaryAction?: SwipeAction;
  threshold?: number;
  secondaryThreshold?: number;
  velocityThreshold?: number; // Velocity to trigger action immediately
  hapticFeedback?: boolean;
  showHints?: boolean; // Show action hints on first render
  className?: string;
  disabled?: boolean;
}

const DEFAULT_LEFT_ACTION: SwipeAction = {
  icon: Check,
  color: 'text-primary-foreground',
  bgColor: 'bg-success',
  label: 'Lido',
  action: () => {},
};

const DEFAULT_RIGHT_ACTION: SwipeAction = {
  icon: Archive,
  color: 'text-primary-foreground',
  bgColor: 'bg-warning',
  label: 'Arquivar',
  action: () => {},
};

export function SwipeableListItem({
  children,
  leftAction = DEFAULT_LEFT_ACTION,
  rightAction = DEFAULT_RIGHT_ACTION,
  leftSecondaryAction,
  rightSecondaryAction,
  threshold = 80,
  secondaryThreshold = 150,
  velocityThreshold = 500,
  hapticFeedback = true,
  showHints = false,
  className,
  disabled = false,
}: SwipeableListItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [triggeredAction, setTriggeredAction] = useState<'left' | 'right' | 'left-secondary' | 'right-secondary' | null>(null);
  const [showHint, setShowHint] = useState(showHints);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Determine which action to show based on swipe distance
  const currentLeftAction = leftSecondaryAction 
    ? useTransform(x, (val) => val > secondaryThreshold ? leftSecondaryAction : leftAction)
    : leftAction;
  const currentRightAction = rightSecondaryAction
    ? useTransform(x, (val) => val < -secondaryThreshold ? rightSecondaryAction : rightAction)
    : rightAction;
  
  // Transform for left action (swipe right)
  const leftOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const leftScale = useTransform(x, [0, threshold / 2, threshold], [0.5, 0.8, 1]);
  const leftIconX = useTransform(x, [0, threshold], [-20, 20]);
  const leftBgColor = useTransform(x, (val) => {
    if (leftSecondaryAction && val > secondaryThreshold) return leftSecondaryAction.bgColor;
    return leftAction.bgColor;
  });
  
  // Transform for right action (swipe left)
  const rightOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.5, 0]);
  const rightScale = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.8, 0.5]);
  const rightIconX = useTransform(x, [-threshold, 0], [-20, 20]);
  const rightBgColor = useTransform(x, (val) => {
    if (rightSecondaryAction && val < -secondaryThreshold) return rightSecondaryAction.bgColor;
    return rightAction.bgColor;
  });

  // Haptic feedback
  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback) return;
    if ('vibrate' in navigator) {
      const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 25 : 50;
      navigator.vibrate(duration);
    }
  };

  // Hide hint after first interaction
  const handleDragStart = () => {
    setIsDragging(true);
    setShowHint(false);
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetX = info.offset.x;
    
    // Check for secondary actions with haptic feedback
    if (leftSecondaryAction && offsetX > secondaryThreshold && triggeredAction !== 'left-secondary') {
      setTriggeredAction('left-secondary');
      triggerHaptic('heavy');
    } else if (offsetX > threshold && offsetX <= secondaryThreshold && triggeredAction !== 'left') {
      setTriggeredAction('left');
      triggerHaptic('light');
    } else if (rightSecondaryAction && offsetX < -secondaryThreshold && triggeredAction !== 'right-secondary') {
      setTriggeredAction('right-secondary');
      triggerHaptic('heavy');
    } else if (offsetX < -threshold && offsetX >= -secondaryThreshold && triggeredAction !== 'right') {
      setTriggeredAction('right');
      triggerHaptic('light');
    } else if (Math.abs(offsetX) < threshold) {
      setTriggeredAction(null);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setTriggeredAction(null);
    
    if (disabled) return;
    
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    
    // Fast swipe triggers action even before threshold
    const fastSwipeRight = velocityX > velocityThreshold && offsetX > threshold / 2;
    const fastSwipeLeft = velocityX < -velocityThreshold && offsetX < -threshold / 2;
    
    // Trigger secondary left action (swipe far right)
    if (leftSecondaryAction && offsetX > secondaryThreshold) {
      triggerHaptic('medium');
      leftSecondaryAction.action();
    }
    // Trigger left action (swiped right or fast swipe)
    else if (offsetX > threshold || fastSwipeRight) {
      triggerHaptic('medium');
      leftAction.action();
    }
    // Trigger secondary right action (swipe far left)
    else if (rightSecondaryAction && offsetX < -secondaryThreshold) {
      triggerHaptic('medium');
      rightSecondaryAction.action();
    }
    // Trigger right action (swiped left or fast swipe)
    else if (offsetX < -threshold || fastSwipeLeft) {
      triggerHaptic('medium');
      rightAction.action();
    }
  };

  const LeftIcon = leftSecondaryAction && triggeredAction === 'left-secondary' 
    ? leftSecondaryAction.icon 
    : leftAction.icon;
  const RightIcon = rightSecondaryAction && triggeredAction === 'right-secondary' 
    ? rightSecondaryAction.icon 
    : rightAction.icon;
  
  const leftLabel = leftSecondaryAction && triggeredAction === 'left-secondary'
    ? leftSecondaryAction.label
    : leftAction.label;
  const rightLabel = rightSecondaryAction && triggeredAction === 'right-secondary'
    ? rightSecondaryAction.label
    : rightAction.label;

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Left action background (revealed when swiping right) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start pl-6 w-40 rounded-l-xl transition-colors",
          triggeredAction === 'left-secondary' && leftSecondaryAction ? leftSecondaryAction.bgColor : leftAction.bgColor
        )}
        style={{ opacity: leftOpacity }}
      >
        <motion.div
          style={{ scale: leftScale, x: leftIconX }}
          className="flex flex-col items-center gap-1"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={triggeredAction === 'left-secondary' ? 'secondary' : 'primary'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-1"
            >
              <LeftIcon className={cn("w-6 h-6", triggeredAction === 'left-secondary' && leftSecondaryAction ? leftSecondaryAction.color : leftAction.color)} />
              <span className={cn("text-xs font-medium whitespace-nowrap", triggeredAction === 'left-secondary' && leftSecondaryAction ? leftSecondaryAction.color : leftAction.color)}>
                {leftLabel}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Right action background (revealed when swiping left) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end pr-6 w-40 rounded-r-xl transition-colors",
          triggeredAction === 'right-secondary' && rightSecondaryAction ? rightSecondaryAction.bgColor : rightAction.bgColor
        )}
        style={{ opacity: rightOpacity }}
      >
        <motion.div
          style={{ scale: rightScale, x: rightIconX }}
          className="flex flex-col items-center gap-1"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={triggeredAction === 'right-secondary' ? 'secondary' : 'primary'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-1"
            >
              <RightIcon className={cn("w-6 h-6", triggeredAction === 'right-secondary' && rightSecondaryAction ? rightSecondaryAction.color : rightAction.color)} />
              <span className={cn("text-xs font-medium whitespace-nowrap", triggeredAction === 'right-secondary' && rightSecondaryAction ? rightSecondaryAction.color : rightAction.color)}>
                {rightLabel}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Swipe hint animation */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <motion.div
              animate={{ x: [0, 30, 0, -30, 0] }}
              transition={{ duration: 2, repeat: 2, repeatDelay: 1 }}
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 bg-gradient-to-r from-transparent via-primary/10 to-transparent rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
        className={cn(
          "relative bg-card z-10 touch-pan-y rounded-xl",
          isDragging && "cursor-grabbing shadow-lg"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pre-configured swipe actions
export const SWIPE_ACTIONS = {
  markAsRead: (onAction: () => void): SwipeAction => ({
    icon: Check,
    color: 'text-primary-foreground',
    bgColor: 'bg-success',
    label: 'Lido',
    action: onAction,
  }),
  
  markAsUnread: (onAction: () => void): SwipeAction => ({
    icon: RotateCcw,
    color: 'text-primary-foreground',
    bgColor: 'bg-info',
    label: 'Não lido',
    action: onAction,
  }),
  
  archive: (onAction: () => void): SwipeAction => ({
    icon: Archive,
    color: 'text-primary-foreground',
    bgColor: 'bg-warning',
    label: 'Arquivar',
    action: onAction,
  }),
  
  delete: (onAction: () => void): SwipeAction => ({
    icon: Trash2,
    color: 'text-primary-foreground',
    bgColor: 'bg-destructive',
    label: 'Excluir',
    action: onAction,
  }),
  
  pin: (onAction: () => void): SwipeAction => ({
    icon: Pin,
    color: 'text-primary-foreground',
    bgColor: 'bg-primary',
    label: 'Fixar',
    action: onAction,
  }),
  
  unpin: (onAction: () => void): SwipeAction => ({
    icon: PinOff,
    color: 'text-primary-foreground',
    bgColor: 'bg-muted-foreground',
    label: 'Desafixar',
    action: onAction,
  }),
  
  star: (onAction: () => void): SwipeAction => ({
    icon: Star,
    color: 'text-primary-foreground',
    bgColor: 'bg-amber-500',
    label: 'Favoritar',
    action: onAction,
  }),
  
  mute: (onAction: () => void): SwipeAction => ({
    icon: BellOff,
    color: 'text-primary-foreground',
    bgColor: 'bg-slate-500',
    label: 'Silenciar',
    action: onAction,
  }),
  
  unmute: (onAction: () => void): SwipeAction => ({
    icon: Bell,
    color: 'text-primary-foreground',
    bgColor: 'bg-info',
    label: 'Ativar som',
    action: onAction,
  }),
};
