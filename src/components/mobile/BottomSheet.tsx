import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, GripHorizontal } from 'lucide-react';
import { haptics } from './SwipeGestures';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  defaultSnap?: number;
  title?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  preventClose?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [0.5, 0.9],
  defaultSnap = 0,
  title,
  showHandle = true,
  showCloseButton = true,
  className,
  overlayClassName,
  preventClose = false,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Fast swipe down closes the sheet
    if (velocity > 500 && !preventClose) {
      haptics.light();
      onClose();
      return;
    }

    // Calculate which snap point to go to
    const windowHeight = window.innerHeight;
    const currentHeight = windowHeight * snapPoints[currentSnap];
    const newHeight = currentHeight - offset;
    const newPercentage = newHeight / windowHeight;

    // Find the closest snap point
    let closestSnap = 0;
    let minDiff = Math.abs(snapPoints[0] - newPercentage);

    snapPoints.forEach((snap, index) => {
      const diff = Math.abs(snap - newPercentage);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = index;
      }
    });

    // If dragged below minimum and not prevented, close
    if (newPercentage < snapPoints[0] * 0.5 && !preventClose) {
      haptics.light();
      onClose();
    } else {
      setCurrentSnap(closestSnap);
      haptics.selection();
    }
  };

  const sheetHeight = `${snapPoints[currentSnap] * 100}%`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={preventClose ? undefined : onClose}
            className={cn(
              'fixed inset-0 bg-black/50 z-50 backdrop-blur-sm',
              overlayClassName
            )}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: sheetHeight }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl overflow-hidden flex flex-col',
              'safe-area-bottom',
              className
            )}
          >
            {/* Handle */}
            {showHandle && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                {title && (
                  <h3 className="font-display font-semibold text-lg text-foreground">
                    {title}
                  </h3>
                )}
                {showCloseButton && !preventClose && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Floating Action Button
interface FABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
  badge?: number;
  extended?: boolean;
}

const fabVariants = {
  primary: 'bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]',
  secondary: 'bg-secondary text-secondary-foreground hover:shadow-[0_0_30px_hsl(var(--secondary)/0.5)]',
  whatsapp: 'bg-whatsapp text-white hover:shadow-[0_0_30px_hsl(var(--whatsapp)/0.5)]',
};

const fabSizes = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const fabPositions = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
};

export function FloatingActionButton({
  icon,
  onClick,
  label,
  variant = 'primary',
  size = 'md',
  position = 'bottom-right',
  className,
  badge,
  extended = false,
}: FABProps) {
  const handleClick = () => {
    haptics.medium();
    onClick();
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        'fixed z-40 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center gap-2',
        fabVariants[variant],
        extended ? 'px-6' : fabSizes[size],
        fabPositions[position],
        'safe-area-bottom',
        className
      )}
    >
      {icon}
      {extended && label && (
        <span className="font-medium whitespace-nowrap">{label}</span>
      )}
      
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center"
        >
          {badge > 99 ? '99+' : badge}
        </motion.span>
      )}
    </motion.button>
  );
}

// Speed Dial FAB
interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface SpeedDialFABProps {
  mainIcon: React.ReactNode;
  openIcon?: React.ReactNode;
  actions: SpeedDialAction[];
  variant?: 'primary' | 'secondary' | 'whatsapp';
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function SpeedDialFAB({
  mainIcon,
  openIcon,
  actions,
  variant = 'primary',
  position = 'bottom-right',
  className,
}: SpeedDialFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    haptics.medium();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: SpeedDialAction) => {
    haptics.selection();
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn('fixed z-40', fabPositions[position], 'safe-area-bottom', className)}>
      {/* Actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 flex flex-col-reverse gap-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0, y: 20, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="bg-card px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAction(action)}
                  className={cn(
                    'w-12 h-12 rounded-full shadow-lg flex items-center justify-center',
                    action.color || 'bg-card text-foreground'
                  )}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 -z-10"
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        animate={{ rotate: isOpen ? 45 : 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          fabVariants[variant]
        )}
      >
        {isOpen && openIcon ? openIcon : mainIcon}
      </motion.button>
    </div>
  );
}

// Keyboard Aware Container
interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function KeyboardAwareContainer({ children, className }: KeyboardAwareContainerProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(Math.max(0, heightDiff));
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('transition-all duration-200', className)}
      style={{ paddingBottom: keyboardHeight }}
    >
      {children}
    </div>
  );
}
