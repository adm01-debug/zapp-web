import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Archive, Check, Trash2, RotateCcw } from 'lucide-react';
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
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_LEFT_ACTION: SwipeAction = {
  icon: Check,
  color: 'text-white',
  bgColor: 'bg-success',
  label: 'Marcar como lido',
  action: () => {},
};

const DEFAULT_RIGHT_ACTION: SwipeAction = {
  icon: Archive,
  color: 'text-white',
  bgColor: 'bg-warning',
  label: 'Arquivar',
  action: () => {},
};

export function SwipeableListItem({
  children,
  leftAction = DEFAULT_LEFT_ACTION,
  rightAction = DEFAULT_RIGHT_ACTION,
  threshold = 100,
  className,
  disabled = false,
}: SwipeableListItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Transform for left action (swipe right)
  const leftOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const leftScale = useTransform(x, [0, threshold / 2, threshold], [0.5, 0.8, 1]);
  const leftIconX = useTransform(x, [0, threshold], [-20, 20]);
  
  // Transform for right action (swipe left)
  const rightOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.5, 0]);
  const rightScale = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.8, 0.5]);
  const rightIconX = useTransform(x, [-threshold, 0], [-20, 20]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (disabled) return;
    
    // Trigger left action (swiped right)
    if (info.offset.x > threshold) {
      leftAction.action();
    }
    // Trigger right action (swiped left)
    else if (info.offset.x < -threshold) {
      rightAction.action();
    }
  };

  const LeftIcon = leftAction.icon;
  const RightIcon = rightAction.icon;

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden", className)}>
      {/* Left action background (revealed when swiping right) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start pl-6 w-32",
          leftAction.bgColor
        )}
        style={{ opacity: leftOpacity }}
      >
        <motion.div
          style={{ scale: leftScale, x: leftIconX }}
          className="flex flex-col items-center gap-1"
        >
          <LeftIcon className={cn("w-6 h-6", leftAction.color)} />
          <span className={cn("text-xs font-medium", leftAction.color)}>
            {leftAction.label}
          </span>
        </motion.div>
      </motion.div>

      {/* Right action background (revealed when swiping left) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end pr-6 w-32",
          rightAction.bgColor
        )}
        style={{ opacity: rightOpacity }}
      >
        <motion.div
          style={{ scale: rightScale, x: rightIconX }}
          className="flex flex-col items-center gap-1"
        >
          <RightIcon className={cn("w-6 h-6", rightAction.color)} />
          <span className={cn("text-xs font-medium", rightAction.color)}>
            {rightAction.label}
          </span>
        </motion.div>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
        className={cn(
          "relative bg-card z-10 touch-pan-y",
          isDragging && "cursor-grabbing"
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
    color: 'text-white',
    bgColor: 'bg-success',
    label: 'Lido',
    action: onAction,
  }),
  
  markAsUnread: (onAction: () => void): SwipeAction => ({
    icon: RotateCcw,
    color: 'text-white',
    bgColor: 'bg-info',
    label: 'Não lido',
    action: onAction,
  }),
  
  archive: (onAction: () => void): SwipeAction => ({
    icon: Archive,
    color: 'text-white',
    bgColor: 'bg-warning',
    label: 'Arquivar',
    action: onAction,
  }),
  
  delete: (onAction: () => void): SwipeAction => ({
    icon: Trash2,
    color: 'text-white',
    bgColor: 'bg-destructive',
    label: 'Excluir',
    action: onAction,
  }),
};
