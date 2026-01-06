import * as React from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const animatedBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-bold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        outline: 'border border-border bg-background text-foreground',
        neon: 'bg-secondary/20 text-secondary border border-secondary/50 shadow-[0_0_10px_hsl(var(--secondary)/0.4)]',
        pulse: 'bg-primary text-primary-foreground animate-pulse',
      },
      size: {
        sm: 'min-w-4 h-4 px-1 text-[10px]',
        default: 'min-w-5 h-5 px-1.5 text-xs',
        lg: 'min-w-6 h-6 px-2 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface AnimatedBadgeProps extends VariantProps<typeof animatedBadgeVariants> {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
  animate?: boolean;
}

// Animated number component with count-up effect
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => Math.round(current));
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  React.useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}

export function AnimatedBadge({
  count,
  max = 99,
  showZero = false,
  variant,
  size,
  className,
  animate = true,
}: AnimatedBadgeProps) {
  const prevCountRef = React.useRef(count);
  const [isIncreasing, setIsIncreasing] = React.useState(false);

  React.useEffect(() => {
    if (count > prevCountRef.current) {
      setIsIncreasing(true);
      const timer = setTimeout(() => setIsIncreasing(false), 300);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count;
  const isOverMax = count > max;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={count > max ? 'overflow' : count}
        initial={animate ? { scale: 0, opacity: 0 } : false}
        animate={{ 
          scale: isIncreasing ? [1, 1.3, 1] : 1, 
          opacity: 1,
        }}
        exit={animate ? { scale: 0, opacity: 0 } : undefined}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 25,
        }}
        className={cn(
          animatedBadgeVariants({ variant, size }),
          isIncreasing && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background',
          className
        )}
      >
        {animate && !isOverMax ? (
          <AnimatedNumber value={count} />
        ) : (
          displayCount
        )}
      </motion.span>
    </AnimatePresence>
  );
}

// Dot badge for simple indicators
interface DotBadgeProps {
  show?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  pulse?: boolean;
  className?: string;
}

export function DotBadge({ 
  show = true, 
  variant = 'default', 
  pulse = false,
  className 
}: DotBadgeProps) {
  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
  };

  if (!show) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        'w-2.5 h-2.5 rounded-full',
        variantStyles[variant],
        pulse && 'animate-pulse',
        className
      )}
    >
      {pulse && (
        <motion.span
          className={cn('absolute inset-0 rounded-full', variantStyles[variant])}
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.span>
  );
}

// Badge with icon
interface IconBadgeProps extends AnimatedBadgeProps {
  icon?: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  children: React.ReactNode;
}

export function IconBadge({
  count,
  max,
  showZero,
  variant,
  size,
  icon,
  position = 'top-right',
  children,
  className,
}: IconBadgeProps) {
  const positionStyles = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      <span className={cn('absolute', positionStyles[position])}>
        {icon || (
          <AnimatedBadge
            count={count}
            max={max}
            showZero={showZero}
            variant={variant}
            size={size}
          />
        )}
      </span>
    </div>
  );
}

export { animatedBadgeVariants };
