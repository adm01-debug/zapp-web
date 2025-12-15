import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Animation variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    }
  }
};

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={neonReveal}
      className={cn('h-full relative', className)}
    >
      {/* Neon glow overlay on enter */}
      <motion.div
        initial={{ opacity: 0.8, scale: 1.5 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--secondary) / 0.15) 0%, transparent 70%)',
        }}
      />
      {/* Scan line effect */}
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
}

// Enhanced neon page reveal with more effects
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
        transition: {
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }
      }}
      className={cn('relative', className)}
    >
      {/* Corner glow effects */}
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

// Staggered neon reveal for lists
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
  hidden: { 
    opacity: 0, 
    y: 20,
    filter: 'blur(4px)',
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: { 
      duration: 0.4, 
      ease: [0.22, 1, 0.36, 1],
    }
  },
};

// Motion Card with hover effects
interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  hover?: boolean;
  tap?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, hover = true, tap = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        whileTap={tap ? { scale: 0.98 } : undefined}
        className={cn(
          'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-glow',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = 'MotionCard';

// Motion Button with effects
interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
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
    );
  }
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
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={staggerItem}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggeredItem.displayName = 'StaggeredItem';

// Animated presence wrapper for conditional rendering
export { AnimatePresence } from 'framer-motion';
export { motion };
