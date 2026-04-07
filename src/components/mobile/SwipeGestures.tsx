import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Archive, CheckCheck, Pin, Trash2, MoreHorizontal } from 'lucide-react';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  action: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
  onSwipeComplete?: (direction: 'left' | 'right', actionIndex: number) => void;
  disabled?: boolean;
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  onSwipeComplete,
  disabled = false,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftScale = useTransform(x, [0, threshold], [0.5, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.5]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldOpenLeft = info.offset.x > threshold && leftActions.length > 0;
    const shouldOpenRight = info.offset.x < -threshold && rightActions.length > 0;

    if (shouldOpenLeft) {
      setIsOpen('left');
      // Trigger haptic feedback
      navigator.vibrate?.(10);
    } else if (shouldOpenRight) {
      setIsOpen('right');
      navigator.vibrate?.(10);
    } else {
      setIsOpen(null);
    }
  };

  const handleActionClick = (direction: 'left' | 'right', index: number) => {
    const actions = direction === 'left' ? leftActions : rightActions;
    actions[index]?.action();
    onSwipeComplete?.(direction, index);
    setIsOpen(null);
    navigator.vibrate?.(25);
  };

  const closeActions = useCallback(() => {
    setIsOpen(null);
  }, []);

  return (
    <div className={cn('relative overflow-hidden touch-pan-y', className)}>
      {/* Left actions */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center gap-1 px-2"
          style={{ opacity: leftOpacity, scale: leftScale }}
        >
          {leftActions.map((action, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleActionClick('left', index)}
              className={cn(
                'p-3 rounded-xl flex flex-col items-center justify-center min-w-[60px]',
                action.bgColor
              )}
            >
              <div className={action.color}>{action.icon}</div>
              <span className={cn('text-xs mt-1 font-medium', action.color)}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center gap-1 px-2"
          style={{ opacity: rightOpacity, scale: rightScale }}
        >
          {rightActions.map((action, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleActionClick('right', index)}
              className={cn(
                'p-3 rounded-xl flex flex-col items-center justify-center min-w-[60px]',
                action.bgColor
              )}
            >
              <div className={action.color}>{action.icon}</div>
              <span className={cn('text-xs mt-1 font-medium', action.color)}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{
          x: isOpen === 'left' ? threshold : isOpen === 'right' ? -threshold : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="relative z-10 bg-card"
        onClick={isOpen ? closeActions : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pull to Refresh component
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    setPullDistance(Math.min(distance, threshold * 1.5));
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      navigator.vibrate?.(25);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ 
              opacity: 1, 
              y: Math.min(pullDistance, threshold) - 40 
            }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-50"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : progress * 180 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isRefreshing ? 'bg-primary' : 'bg-muted'
              )}
            >
              <svg
                className={cn('w-5 h-5', isRefreshing ? 'text-primary-foreground' : 'text-muted-foreground')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        ref={containerRef}
        animate={{ y: isPulling ? pullDistance * 0.3 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full overflow-auto"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Haptic feedback utility
export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([50, 30, 50]),
  error: () => navigator.vibrate?.([100, 50, 100]),
  selection: () => navigator.vibrate?.(5),
  notification: () => navigator.vibrate?.([100, 30, 100, 30, 100]),
};

// Touch Ripple Effect
interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  disabled?: boolean;
}

export function TouchRipple({
  children,
  className,
  color = 'hsl(var(--primary) / 0.3)',
  disabled = false,
}: TouchRippleProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
    haptics.light();
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
      onTouchStart={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => removeRipple(ripple.id)}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: 50,
              height: 50,
              marginLeft: -25,
              marginTop: -25,
              borderRadius: '50%',
              backgroundColor: color,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Default swipe actions presets
export const defaultSwipeActions = {
  archive: {
    icon: <Archive className="w-5 h-5" />,
    label: 'Arquivar',
    color: 'text-warning',
    bgColor: 'bg-warning/20',
    action: () => {},
  },
  markRead: {
    icon: <CheckCheck className="w-5 h-5" />,
    label: 'Lido',
    color: 'text-success',
    bgColor: 'bg-success/20',
    action: () => {},
  },
  pin: {
    icon: <Pin className="w-5 h-5" />,
    label: 'Fixar',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    action: () => {},
  },
  delete: {
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Excluir',
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    action: () => {},
  },
  more: {
    icon: <MoreHorizontal className="w-5 h-5" />,
    label: 'Mais',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    action: () => {},
  },
};
