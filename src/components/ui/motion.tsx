import { motion, HTMLMotionProps, Variants, AnimatePresence } from 'framer-motion';
import { forwardRef, ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ============ ANIMATION VARIANTS ============

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { opacity: 0, scale: 0.95 }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: 20 }
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20 }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
};

// Neon reveal animation variants
export const neonReveal: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    filter: 'blur(10px)',
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(5px)',
    transition: { duration: 0.3, ease: 'easeIn' }
  }
};

export const staggeredNeonContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

export const staggeredNeonItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
};

// ============ MOTION COMPONENTS ============

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className }, ref) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={neonReveal}
      className={cn('h-full relative', className)}
    >
      <motion.div
        initial={{ opacity: 0.8, scale: 1.5 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--secondary) / 0.15) 0%, transparent 70%)',
        }}
      />
      <motion.div
        initial={{ top: '-100%' }}
        animate={{ top: '200%' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute left-0 right-0 h-px pointer-events-none z-50"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--secondary) / 0.8), hsl(var(--primary) / 0.6), transparent)',
          boxShadow: '0 0 20px hsl(var(--secondary) / 0.5), 0 0 40px hsl(var(--secondary) / 0.3)',
        }}
      />
      {children}
    </motion.div>
  );
});
PageTransition.displayName = 'PageTransition';

// Enhanced neon page reveal
interface NeonPageRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function NeonPageReveal({ children, className, delay = 0 }: NeonPageRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
      }}
      className={cn('relative', className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 1, delay: delay + 0.2 }}
        className="absolute -top-4 -left-4 w-32 h-32 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary) / 0.4) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 1, delay: delay + 0.3 }}
        className="absolute -bottom-4 -right-4 w-32 h-32 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      {children}
    </motion.div>
  );
}

// Motion Card with hover effects
interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  hover?: boolean;
  tap?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, hover = true, tap = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      whileTap={tap ? { scale: 0.98 } : undefined}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-glow-primary',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionCard.displayName = 'MotionCard';

// Motion Button with effects
interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
);
MotionButton.displayName = 'MotionButton';

// Staggered list container
interface StaggeredListProps {
  children: ReactNode;
  className?: string;
}

export function StaggeredList({ children, className }: StaggeredListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list item
interface StaggeredItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
}

export const StaggeredItem = forwardRef<HTMLDivElement, StaggeredItemProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggeredItem.displayName = 'StaggeredItem';

// ============ NEW ACCESSIBILITY-ENHANCED COMPONENTS ============

// Motion container with fade-in
interface MotionFadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
}

export const MotionFadeIn = forwardRef<HTMLDivElement, MotionFadeInProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionFadeIn.displayName = 'MotionFadeIn';

// Motion slide up
export const MotionSlideUp = forwardRef<HTMLDivElement, MotionFadeInProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInUp}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionSlideUp.displayName = 'MotionSlideUp';

// Motion scale
export const MotionScale = forwardRef<HTMLDivElement, MotionFadeInProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionScale.displayName = 'MotionScale';

// Interactive hover/tap component
interface MotionInteractiveProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  hoverScale?: number;
  tapScale?: number;
}

export const MotionInteractive = forwardRef<HTMLDivElement, MotionInteractiveProps>(
  ({ children, className, hoverScale = 1.02, tapScale = 0.98, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      transition={{ duration: 0.2 }}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionInteractive.displayName = 'MotionInteractive';

// Skeleton with shimmer effect
interface SkeletonShimmerProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function SkeletonShimmer({ className, rounded = 'md' }: SkeletonShimmerProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  return (
    <div className={cn(
      'relative overflow-hidden bg-muted',
      roundedClasses[rounded],
      className
    )}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-background/60 to-transparent" />
    </div>
  );
}

// Animated counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1, className }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * easeProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <motion.span
      key={displayValue}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
}

// Animated progress bar
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  showValue = false,
  size = 'md'
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      {showValue && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute right-0 -top-6 text-xs text-muted-foreground"
        >
          {Math.round(percentage)}%
        </motion.span>
      )}
    </div>
  );
}

// Presence wrapper
interface PresenceProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function Presence({ children, mode = 'wait' }: PresenceProps) {
  return <AnimatePresence mode={mode}>{children}</AnimatePresence>;
}

// ============ NEW CHOREOGRAPHY COMPONENTS ============

// Stagger container for coordinated animations
interface StaggerContainerEnhancedProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  delayChildren?: number;
}

export function StaggerContainerEnhanced({ 
  children, 
  staggerDelay = 0.1,
  delayChildren = 0.1,
  className 
}: StaggerContainerEnhancedProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide transitions
type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideTransitionProps {
  children: ReactNode;
  direction?: SlideDirection;
  distance?: number;
  className?: string;
}

export function SlideTransition({ 
  children, 
  direction = 'up', 
  distance = 20,
  className 
}: SlideTransitionProps) {
  const getInitial = () => {
    switch (direction) {
      case 'left': return { opacity: 0, x: distance };
      case 'right': return { opacity: 0, x: -distance };
      case 'up': return { opacity: 0, y: distance };
      case 'down': return { opacity: 0, y: -distance };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={getInitial()}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover animation wrapper
interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function HoverScale({ 
  children, 
  className,
  scale = 1.02
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// List animation wrapper
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.ul className={className} layout>
        {children}
      </motion.ul>
    </AnimatePresence>
  );
}

// List item with animation
interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  layoutId?: string;
}

export function AnimatedListItem({ 
  children, 
  className,
  layoutId
}: AnimatedListItemProps) {
  return (
    <motion.li
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        duration: 0.2,
        layout: { duration: 0.3 }
      }}
      className={className}
    >
      {children}
    </motion.li>
  );
}

// Typewriter effect
interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({ 
  text, 
  speed = 50, 
  className,
  onComplete 
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {displayText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

// Re-exports
export { AnimatePresence, motion };
