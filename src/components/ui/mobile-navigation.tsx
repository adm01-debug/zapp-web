import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  X, 
  Home, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings,
  ChevronRight,
  Menu,
  Search,
  Bell,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { IconButton } from './icon-button';

// =============================================================================
// TIPOS
// =============================================================================

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isPrimary?: boolean;
}

// =============================================================================
// ENHANCED BOTTOM NAVIGATION (com FAB central e gestos)
// =============================================================================

interface EnhancedBottomNavProps {
  items: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  fabAction?: {
    icon: React.ElementType;
    onClick: () => void;
    label: string;
  };
  className?: string;
}

export function EnhancedBottomNav({
  items,
  activeId,
  onNavigate,
  fabAction,
  className,
}: EnhancedBottomNavProps) {
  const [showFabMenu, setShowFabMenu] = React.useState(false);

  // Dividir items em esquerda e direita para o FAB ficar no centro
  const leftItems = items.slice(0, Math.floor(items.length / 2));
  const rightItems = items.slice(Math.floor(items.length / 2));

  return (
    <>
      {/* Backdrop for FAB menu */}
      <AnimatePresence>
        {showFabMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowFabMenu(false)}
          />
        )}
      </AnimatePresence>

      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-card/95 backdrop-blur-xl border-t border-border',
          'safe-area-bottom',
          className
        )}
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="relative flex items-center justify-around h-16 px-4">
          {/* Left items */}
          {leftItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              onClick={() => onNavigate(item.id)}
            />
          ))}

          {/* Central FAB */}
          {fabAction && (
            <div className="relative -mt-6">
              <motion.button
                onClick={fabAction.onClick}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  'shadow-lg shadow-primary/30',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                )}
                style={{ background: 'var(--gradient-primary)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={fabAction.label}
              >
                <fabAction.icon className="w-6 h-6 text-primary-foreground" />
              </motion.button>

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          )}

          {/* Spacer if no FAB */}
          {!fabAction && <div className="w-14" />}

          {/* Right items */}
          {rightItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={item.id === activeId}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

// Nav Button Component
function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 flex-1 py-2',
        'transition-colors duration-200 relative',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
      whileTap={{ scale: 0.9 }}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
    >
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="navIndicator"
            className="absolute -top-0.5 w-8 h-1 rounded-full bg-primary"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </AnimatePresence>

      {/* Icon with badge */}
      <div className="relative">
        <motion.div
          animate={{ 
            scale: isActive ? 1.15 : 1,
            y: isActive ? -2 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Icon className={cn(
            'w-5 h-5 transition-colors',
            isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
          )} />
        </motion.div>

        {/* Badge */}
        {item.badge !== undefined && item.badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1',
              'flex items-center justify-center rounded-full',
              'bg-destructive text-destructive-foreground',
              'text-[10px] font-bold'
            )}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </motion.span>
        )}
      </div>

      {/* Label */}
      <motion.span
        animate={{ opacity: isActive ? 1 : 0.7 }}
        className={cn(
          'text-[10px] font-medium',
          isActive && 'font-semibold'
        )}
      >
        {item.label}
      </motion.span>
    </motion.button>
  );
}

// =============================================================================
// SWIPEABLE DRAWER (drawer com gestos melhorados)
// =============================================================================

interface SwipeableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'bottom';
  height?: 'auto' | 'full' | 'half';
  className?: string;
}

export function SwipeableDrawer({
  isOpen,
  onClose,
  onOpen,
  children,
  side = 'bottom',
  height = 'auto',
  className,
}: SwipeableDrawerProps) {
  const dragY = useMotionValue(0);
  const dragX = useMotionValue(0);
  
  const heightClasses = {
    auto: 'max-h-[90vh]',
    full: 'h-full',
    half: 'h-[50vh]',
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (side === 'bottom') {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    } else if (side === 'left') {
      if (info.offset.x < -100 || info.velocity.x < -500) {
        onClose();
      }
    } else if (side === 'right') {
      if (info.offset.x > 100 || info.velocity.x > 500) {
        onClose();
      }
    }
  };

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const variants = {
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  };

  const positionClasses = {
    left: 'left-0 top-0 h-full w-[85%] max-w-sm',
    right: 'right-0 top-0 h-full w-[85%] max-w-sm',
    bottom: `left-0 right-0 bottom-0 rounded-t-3xl ${heightClasses[height]}`,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            {...variants[side]}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={side === 'bottom' ? 'y' : 'x'}
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ 
              y: side === 'bottom' ? dragY : 0,
              x: side !== 'bottom' ? dragX : 0
            }}
            className={cn(
              'fixed z-50 bg-card border border-border shadow-2xl overflow-hidden',
              positionClasses[side],
              className
            )}
          >
            {/* Drag handle for bottom drawer */}
            {side === 'bottom' && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Close button for side drawers */}
            {side !== 'bottom' && (
              <div className="absolute top-4 right-4 z-10">
                <IconButton
                  aria-label="Fechar"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </IconButton>
              </div>
            )}

            <div className={cn(
              'overflow-y-auto',
              side === 'bottom' ? 'max-h-[calc(90vh-40px)]' : 'h-full'
            )}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// MOBILE ACTION SHEET (action sheet iOS style)
// =============================================================================

interface ActionSheetItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  items,
  cancelLabel = 'Cancelar',
}: MobileActionSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom"
          >
            {/* Actions group */}
            <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-xl mb-2">
              {/* Title */}
              {title && (
                <div className="px-4 py-3 text-center border-b border-border">
                  <p className="text-sm text-muted-foreground">{title}</p>
                </div>
              )}

              {/* Items */}
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick();
                        onClose();
                      }
                    }}
                    disabled={item.disabled}
                    className={cn(
                      'w-full flex items-center justify-center gap-3 px-4 py-3.5',
                      'text-base font-medium transition-colors',
                      'active:bg-muted',
                      index > 0 && 'border-t border-border',
                      item.destructive && 'text-destructive',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                      !item.destructive && !item.disabled && 'text-primary'
                    )}
                    whileTap={{ scale: item.disabled ? 1 : 0.98 }}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    {item.label}
                  </motion.button>
                );
              })}
            </div>

            {/* Cancel button */}
            <motion.button
              onClick={onClose}
              className={cn(
                'w-full py-3.5 rounded-2xl',
                'bg-card border border-border',
                'text-base font-semibold text-foreground',
                'active:bg-muted transition-colors'
              )}
              whileTap={{ scale: 0.98 }}
            >
              {cancelLabel}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// GESTURE HINT (indicador de gestos disponíveis)
// =============================================================================

interface GestureHintProps {
  type: 'swipe-left' | 'swipe-right' | 'swipe-down' | 'pull-refresh' | 'tap-hold';
  message: string;
  isVisible: boolean;
  onDismiss?: () => void;
}

export function GestureHint({ type, message, isVisible, onDismiss }: GestureHintProps) {
  const gestureAnimations = {
    'swipe-left': { x: [0, -20, 0] },
    'swipe-right': { x: [0, 20, 0] },
    'swipe-down': { y: [0, 10, 0] },
    'pull-refresh': { y: [0, 15, 0] },
    'tap-hold': { scale: [1, 0.9, 1] },
  };

  React.useEffect(() => {
    if (isVisible && onDismiss) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-lg border border-border shadow-lg">
            <motion.div
              animate={gestureAnimations[type]}
              transition={{ duration: 1, repeat: 2 }}
              className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <ChevronRight className={cn(
                'w-4 h-4 text-primary',
                type === 'swipe-left' && 'rotate-180',
                type === 'swipe-down' && 'rotate-90',
                type === 'pull-refresh' && 'rotate-90'
              )} />
            </motion.div>
            <span className="text-sm text-foreground">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// FLOATING HEADER (header que esconde no scroll)
// =============================================================================

interface FloatingHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingHeader({ children, className }: FloatingHeaderProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{ 
        y: isVisible ? 0 : -100,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'bg-card/95 backdrop-blur-xl border-b border-border',
        'safe-area-top',
        className
      )}
    >
      {children}
    </motion.header>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const MobileNavigation = {
  BottomNav: EnhancedBottomNav,
  Drawer: SwipeableDrawer,
  ActionSheet: MobileActionSheet,
  GestureHint,
  FloatingHeader,
};
