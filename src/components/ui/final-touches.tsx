import React, { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull,
  BatteryCharging,
  Signal,
  Clock,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Loader2
} from 'lucide-react';
import { Button } from './button';
import { useReducedMotion } from './focus-trap';

// ============================================
// FINAL POLISH COMPONENTS
// ============================================

/**
 * Connection status indicator
 */
interface ConnectionStatusProps {
  isConnected: boolean;
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  isConnected,
  showLabel = true,
  className,
}: ConnectionStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center gap-2', className)}
    >
      {isConnected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Wifi className="w-4 h-4 text-success" />
          </motion.div>
          {showLabel && <span className="text-xs text-success">Conectado</span>}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-destructive" />
          {showLabel && <span className="text-xs text-destructive">Desconectado</span>}
        </>
      )}
    </motion.div>
  );
});

/**
 * Battery status indicator (mock for web)
 */
interface BatteryStatusProps {
  level?: number;
  isCharging?: boolean;
  className?: string;
}

export const BatteryStatus = memo(function BatteryStatus({
  level = 100,
  isCharging = false,
  className,
}: BatteryStatusProps) {
  const getBatteryIcon = () => {
    if (isCharging) return BatteryCharging;
    if (level <= 20) return BatteryLow;
    if (level <= 50) return BatteryMedium;
    return BatteryFull;
  };

  const Icon = getBatteryIcon();
  const color = level <= 20 ? 'text-destructive' : level <= 50 ? 'text-warning' : 'text-success';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon className={cn('w-4 h-4', color)} />
      <span className="text-xs text-muted-foreground">{level}%</span>
    </div>
  );
});

/**
 * Signal strength indicator
 */
interface SignalStrengthProps {
  strength: 0 | 1 | 2 | 3 | 4;
  className?: string;
}

export const SignalStrength = memo(function SignalStrength({
  strength,
  className,
}: SignalStrengthProps) {
  const bars = [1, 2, 3, 4];
  
  return (
    <div className={cn('flex items-end gap-0.5 h-4', className)}>
      {bars.map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm transition-colors',
            bar <= strength ? 'bg-foreground' : 'bg-muted',
            bar === 1 && 'h-1',
            bar === 2 && 'h-2',
            bar === 3 && 'h-3',
            bar === 4 && 'h-4'
          )}
        />
      ))}
    </div>
  );
});

/**
 * Live clock component
 */
interface LiveClockProps {
  format?: '12h' | '24h';
  showSeconds?: boolean;
  className?: string;
}

export const LiveClock = memo(function LiveClock({
  format = '24h',
  showSeconds = false,
  className,
}: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    const hours = format === '12h' ? time.getHours() % 12 || 12 : time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ampm = format === '12h' ? (time.getHours() >= 12 ? ' PM' : ' AM') : '';

    return showSeconds
      ? `${hours}:${minutes}:${seconds}${ampm}`
      : `${hours}:${minutes}${ampm}`;
  };

  return (
    <div className={cn('flex items-center gap-1.5 font-mono text-sm', className)}>
      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      <span>{formatTime()}</span>
    </div>
  );
});

/**
 * Notification toggle
 */
interface NotificationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: 'sm' | 'md';
}

export const NotificationToggle = memo(function NotificationToggle({
  enabled,
  onChange,
  size = 'sm',
}: NotificationToggleProps) {
  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'default'}
      onClick={() => onChange(!enabled)}
      className={cn(size === 'sm' && 'h-8 w-8')}
    >
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div
            key="on"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Bell className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="off"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <BellOff className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
});

/**
 * Sound toggle
 */
interface SoundToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: 'sm' | 'md';
}

export const SoundToggle = memo(function SoundToggle({
  enabled,
  onChange,
  size = 'sm',
}: SoundToggleProps) {
  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon' : 'default'}
      onClick={() => onChange(!enabled)}
      className={cn(size === 'sm' && 'h-8 w-8')}
    >
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div
            key="on"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Volume2 className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="off"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
});

/**
 * Theme toggle (enhanced)
 */
interface ThemeToggleEnhancedProps {
  theme: 'light' | 'dark' | 'system';
  onChange: (theme: 'light' | 'dark') => void;
}

export const ThemeToggleEnhanced = memo(function ThemeToggleEnhanced({
  theme,
  onChange,
}: ThemeToggleEnhancedProps) {
  const isDark = theme === 'dark';
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className="relative h-9 w-9 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="dark"
            initial={{ y: 20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="light"
            initial={{ y: 20, opacity: 0, rotate: 90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -90 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
});

/**
 * Loading spinner with text
 */
interface SpinnerWithTextProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SpinnerWithText = memo(function SpinnerWithText({
  text = 'Carregando...',
  size = 'md',
  className,
}: SpinnerWithTextProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      <span className={cn('text-muted-foreground', textSizes[size])}>{text}</span>
    </div>
  );
});

/**
 * Typing indicator (three dots)
 */
interface TypingDotsProps {
  className?: string;
}

export const TypingDots = memo(function TypingDots({ className }: TypingDotsProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <span className={cn('flex items-center gap-1', className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
      </span>
    );
  }

  return (
    <span className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
});

/**
 * Pulse ring animation
 */
interface PulseRingProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  active?: boolean;
}

export const PulseRing = memo(function PulseRing({
  children,
  color = 'bg-primary',
  className,
  active = true,
}: PulseRingProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('relative inline-flex', className)}>
      {active && !prefersReducedMotion && (
        <>
          <span className={cn('absolute inset-0 rounded-full animate-ping opacity-30', color)} />
          <span className={cn('absolute inset-0 rounded-full animate-pulse opacity-20', color)} />
        </>
      )}
      {children}
    </div>
  );
});

/**
 * Count up animation
 */
interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp = memo(function CountUp({
  end,
  duration = 1000,
  prefix = '',
  suffix = '',
  className,
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    const startTime = Date.now();
    const startValue = countRef.current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.round(startValue + (end - startValue) * eased);
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        countRef.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, prefersReducedMotion]);

  return (
    <span className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
});

/**
 * Shimmer effect for loading
 */
interface ShimmerProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const Shimmer = memo(function Shimmer({
  width = '100%',
  height = 20,
  rounded = 'md',
  className,
}: ShimmerProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        roundedClasses[rounded],
        className
      )}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
});

/**
 * Notification dot
 */
interface NotificationDotProps {
  count?: number;
  showCount?: boolean;
  className?: string;
}

export const NotificationDot = memo(function NotificationDot({
  count = 0,
  showCount = false,
  className,
}: NotificationDotProps) {
  if (count === 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground',
        showCount && count > 0 ? 'min-w-[18px] h-[18px] px-1 text-[10px] font-semibold' : 'w-2.5 h-2.5',
        className
      )}
    >
      {showCount && (count > 99 ? '99+' : count)}
    </motion.span>
  );
});
