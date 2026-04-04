import * as React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

// Page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  },
};

const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  enter: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.3,
      ease: [0.175, 0.885, 0.32, 1.275] // spring-like
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  },
};

// Enhanced Page Transition
interface PageTransitionEnhancedProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'slide' | 'fade' | 'scale';
}

export function PageTransitionEnhanced({ 
  children, 
  className,
  variant = 'default'
}: PageTransitionEnhancedProps) {
  const variants = {
    default: pageVariants,
    slide: slideUpVariants,
    fade: fadeInVariants,
    scale: scaleInVariants,
  };

  return (
    <motion.div
      variants={variants[variant]}
      initial="initial"
      animate="enter"
      exit="exit"
      className={cn('h-full', className)}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function StaggerContainer({ 
  children, 
  className,
  staggerDelay = 0.05,
  direction = 'up'
}: StaggerContainerProps) {
  const directionOffset = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { y: 0, x: 20 },
    right: { y: 0, x: -20 },
  };

  const containerVariants: Variants = {
    initial: {},
    enter: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    initial: { 
      opacity: 0, 
      ...directionOffset[direction]
    },
    enter: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="enter"
      className={className}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Reveal on scroll
interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function RevealOnScroll({ 
  children, 
  className,
  delay = 0,
  once = true,
  direction = 'up'
}: RevealOnScrollProps) {
  const directionOffset = {
    up: { y: 50, x: 0 },
    down: { y: -50, x: 0 },
    left: { y: 0, x: 50 },
    right: { y: 0, x: -50 },
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directionOffset[direction]
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      viewport={{ once, margin: '-100px' }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating animation
interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}

export function Floating({ 
  children, 
  className,
  duration = 3,
  distance = 10
}: FloatingProps) {
  return (
    <motion.div
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Pulse glow effect
interface PulseGlowProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  duration?: number;
}

export function PulseGlow({ 
  children, 
  className,
  color = 'var(--primary)',
  duration = 2
}: PulseGlowProps) {
  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        boxShadow: [
          `0 0 0 0 hsl(${color} / 0)`,
          `0 0 20px 10px hsl(${color} / 0.3)`,
          `0 0 0 0 hsl(${color} / 0)`,
        ],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}

// Magnetic effect on hover
interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({ 
  children, 
  className,
  strength = 0.3
}: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Parallax effect
interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

export function Parallax({ 
  children, 
  className,
  speed = 0.5
}: ParallaxProps) {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <motion.div
      style={{ y: offset }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Text reveal animation
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function TextReveal({ 
  text, 
  className,
  delay = 0,
  duration = 0.05
}: TextRevealProps) {
  const words = text.split(' ');

  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * duration,
            duration: 0.3,
          }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// Counter animation
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1,
  className,
  prefix = '',
  suffix = ''
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const current = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// Morphing shape background
interface MorphingBackgroundProps {
  className?: string;
  colors?: string[];
  duration?: number;
}

export function MorphingBackground({ 
  className,
  colors = ['hsl(var(--primary) / 0.1)', 'hsl(var(--secondary) / 0.1)'],
  duration = 10
}: MorphingBackgroundProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden -z-10', className)}>
      <motion.div
        className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
        style={{
          background: `radial-gradient(ellipse at center, ${colors[0]} 0%, transparent 50%)`,
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute w-[150%] h-[150%] -top-1/4 -right-1/4"
        style={{
          background: `radial-gradient(ellipse at center, ${colors[1]} 0%, transparent 50%)`,
        }}
        animate={{
          rotate: [360, 0],
          scale: [1.2, 1, 1.2],
        }}
        transition={{
          duration: duration * 0.8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Skeleton with wave animation
interface WaveSkeletonProps {
  className?: string;
  lines?: number;
}

export function WaveSkeleton({ className, lines = 3 }: WaveSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-muted rounded-full overflow-hidden"
          style={{ width: `${100 - i * 15}%` }}
        >
          <motion.div
            className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// Confetti burst
interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiBurst({ trigger, onComplete }: ConfettiBurstProps) {
  const particles = Array.from({ length: 50 });
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--primary-glow))',
    'hsl(var(--accent-foreground))',
  ];

  if (!trigger) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map((_, i) => {
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const randomX = (Math.random() - 0.5) * window.innerWidth;
          const randomRotation = Math.random() * 720 - 360;
          
          return (
            <motion.div
              key={i}
              initial={{
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                x: window.innerWidth / 2 + randomX,
                y: window.innerHeight + 100,
                scale: [0, 1, 1, 0.5],
                rotate: randomRotation,
              }}
              transition={{
                duration: 2 + Math.random(),
                ease: [0.1, 0.8, 0.2, 1],
              }}
              onAnimationComplete={() => {
                if (i === 0) onComplete?.();
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{ backgroundColor: randomColor }}
            />
          );
        })}
      </div>
    </AnimatePresence>
  );
}
