import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ============= RIPPLE BUTTON WITH ENHANCED EFFECTS =============

interface RippleConfig {
  color?: string;
  duration?: number;
  size?: 'sm' | 'md' | 'lg';
}

interface RippleButtonProps {
  rippleConfig?: RippleConfig;
  variant?: 'default' | 'primary' | 'ghost' | 'neon';
  hapticFeedback?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

const rippleVariants = {
  default: 'rgba(255, 255, 255, 0.3)',
  primary: 'hsl(var(--primary) / 0.4)',
  ghost: 'hsl(var(--foreground) / 0.1)',
  neon: 'hsl(var(--primary) / 0.6)',
};

const rippleSizes = {
  sm: 80,
  md: 150,
  lg: 250,
};

export function RippleButton({ 
  rippleConfig = {},
  variant = 'default',
  hapticFeedback = true,
  children,
  className,
  onClick,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
}: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ 
    x: number; 
    y: number; 
    id: number;
    size: number;
  }>>([]);
  const [isPressed, setIsPressed] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const controls = useAnimation();

  const rippleColor = rippleConfig.color || rippleVariants[variant];
  const rippleDuration = rippleConfig.duration || 600;
  const rippleSize = rippleSizes[rippleConfig.size || 'md'];

  const triggerHaptic = React.useCallback(() => {
    if (!hapticFeedback) return;
    controls.start({
      scale: [1, 0.97, 1.02, 1],
      transition: { duration: 0.2, ease: 'easeInOut' }
    });
  }, [hapticFeedback, controls]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id, size: rippleSize }]);
    triggerHaptic();

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, rippleDuration);

    onClick?.(e);
  };

  const handleMouseDown = () => !disabled && setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <motion.button
      ref={buttonRef}
      animate={controls}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        isPressed && 'scale-[0.98]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: rippleDuration / 1000, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: rippleSize,
              height: rippleSize,
              backgroundColor: rippleColor,
              transform: 'translate(-50%, -50%)',
              boxShadow: variant === 'neon' ? `0 0 20px ${rippleColor}` : undefined,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

// ============= INTERACTIVE ICON BUTTON =============

interface InteractiveIconButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  pulseOnHover?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

const iconButtonVariants = {
  default: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const iconButtonSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function InteractiveIconButton({
  children,
  variant = 'ghost',
  size = 'md',
  pulseOnHover = false,
  className,
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: InteractiveIconButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.button
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg',
        'transition-all duration-200 overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        iconButtonVariants[variant],
        iconButtonSizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <motion.span
        animate={isHovered && pulseOnHover ? {
          scale: [1, 1.1, 1],
          transition: { repeat: Infinity, duration: 0.8 }
        } : {}}
      >
        {children}
      </motion.span>
      
      {isHovered && variant === 'primary' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-xl -z-10"
        />
      )}
    </motion.button>
  );
}

// ============= BOUNCE TAP BUTTON =============

interface BounceTapProps {
  children: React.ReactNode;
  bounceIntensity?: 'light' | 'medium' | 'strong';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const bounceValues = {
  light: { scale: 0.98, y: 1 },
  medium: { scale: 0.95, y: 2 },
  strong: { scale: 0.92, y: 4 },
};

export function BounceTapButton({
  children,
  bounceIntensity = 'medium',
  className,
  onClick,
  disabled,
  type = 'button',
}: BounceTapProps) {
  const bounce = bounceValues[bounceIntensity];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: bounce.scale, y: bounce.y }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn('relative overflow-hidden', className)}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </motion.button>
  );
}

// ============= MAGNETIC BUTTON =============

interface MagneticButtonProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MagneticButton({
  children,
  intensity = 0.3,
  className,
  onClick,
  disabled,
}: MagneticButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || disabled) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    setPosition({
      x: (e.clientX - centerX) * intensity,
      y: (e.clientY - centerY) * intensity,
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      className={cn('relative', disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      {children}
    </motion.button>
  );
}

// ============= GLOW BUTTON =============

interface GlowButtonProps {
  children: React.ReactNode;
  glowColor?: string;
  glowIntensity?: 'subtle' | 'medium' | 'intense';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const glowIntensities = {
  subtle: '0 0 20px',
  medium: '0 0 40px',
  intense: '0 0 60px',
};

export function GlowButton({
  children,
  glowColor = 'hsl(var(--primary))',
  glowIntensity = 'medium',
  className,
  onClick,
  disabled,
  type = 'button',
}: GlowButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.button
      onHoverStart={() => !disabled && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={cn(
        'relative overflow-hidden transition-shadow duration-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        boxShadow: isHovered ? `${glowIntensities[glowIntensity]} ${glowColor}` : 'none',
      }}
    >
      {children}
      
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${glowColor}, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '2px',
          }}
        />
      )}
    </motion.button>
  );
}

// ============= PRESS FEEDBACK =============

interface PressFeedbackProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PressFeedback({
  children,
  onPress,
  disabled,
  className,
}: PressFeedbackProps) {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={!disabled ? onPress : undefined}
      className={cn(
        'cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// ============= MICRO FEEDBACK INDICATOR =============

interface MicroFeedbackProps {
  type: 'success' | 'error' | 'loading' | 'warning';
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const feedbackColors = {
  success: 'bg-green-500',
  error: 'bg-destructive',
  loading: 'bg-primary',
  warning: 'bg-yellow-500',
};

const feedbackSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function MicroFeedback({ type, show, size = 'md' }: MicroFeedbackProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: 1,
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-full',
            feedbackColors[type],
            feedbackSizes[size],
            type === 'loading' && 'animate-pulse'
          )}
        />
      )}
    </AnimatePresence>
  );
}

// ============= SKELETON COMPONENTS =============

interface SkeletonPulseProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function SkeletonPulse({ className, rounded = 'md' }: SkeletonPulseProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        roundedClasses[rounded],
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

interface ContentSkeletonProps {
  type: 'card' | 'list-item' | 'message' | 'avatar' | 'stat';
  count?: number;
}

export function ContentSkeleton({ type, count = 1 }: ContentSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (type) {
    case 'card':
      return (
        <div className="space-y-4">
          {items.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-4 mb-4">
                <SkeletonPulse className="w-12 h-12" rounded="full" />
                <div className="space-y-2 flex-1">
                  <SkeletonPulse className="h-4 w-1/3" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
              </div>
              <SkeletonPulse className="h-4 w-full mb-2" />
              <SkeletonPulse className="h-4 w-4/5" />
            </motion.div>
          ))}
        </div>
      );

    case 'list-item':
      return (
        <div className="space-y-2">
          {items.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg"
            >
              <SkeletonPulse className="w-10 h-10" rounded="full" />
              <div className="flex-1 space-y-2">
                <SkeletonPulse className="h-4 w-1/2" />
                <SkeletonPulse className="h-3 w-3/4" />
              </div>
              <SkeletonPulse className="h-3 w-16" />
            </motion.div>
          ))}
        </div>
      );

    case 'message':
      return (
        <div className="space-y-3">
          {items.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'flex gap-2',
                i % 2 === 0 ? 'justify-start' : 'justify-end'
              )}
            >
              {i % 2 === 0 && <SkeletonPulse className="w-8 h-8" rounded="full" />}
              <SkeletonPulse 
                className={cn('h-12', i % 2 === 0 ? 'w-48' : 'w-40')} 
                rounded="xl" 
              />
            </motion.div>
          ))}
        </div>
      );

    case 'avatar':
      return (
        <div className="flex gap-2">
          {items.map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring' }}
            >
              <SkeletonPulse className="w-10 h-10" rounded="full" />
            </motion.div>
          ))}
        </div>
      );

    case 'stat':
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <SkeletonPulse className="h-4 w-1/2 mb-3" />
              <SkeletonPulse className="h-8 w-3/4 mb-2" />
              <SkeletonPulse className="h-3 w-1/3" />
            </motion.div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

// ============= LOADING INDICATORS =============

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function SpinnerGlow({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        'rounded-full border-primary border-t-transparent',
        'shadow-[0_0_15px_hsl(var(--primary)/0.4)]',
        sizes[size],
        className
      )}
    />
  );
}

// ============= SUCCESS/ERROR ANIMATIONS =============

interface FeedbackAnimationProps {
  type: 'success' | 'error';
  show: boolean;
  size?: number;
}

export function FeedbackAnimation({ type, show, size = 48 }: FeedbackAnimationProps) {
  const successPath = 'M7 13l3 3 7-7';
  const errorPath = 'M18 6L6 18M6 6l12 12';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className={cn(
            'rounded-full flex items-center justify-center',
            type === 'success' ? 'bg-green-500/20' : 'bg-destructive/20'
          )}
          style={{ width: size, height: size }}
        >
          <motion.svg
            width={size * 0.5}
            height={size * 0.5}
            viewBox="0 0 24 24"
            fill="none"
            stroke={type === 'success' ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d={type === 'success' ? successPath : errorPath}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}