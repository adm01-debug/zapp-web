import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowRight,
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Zap,
  Target,
  Award
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type TrendDirection = 'up' | 'down' | 'neutral';
type MetricSize = 'sm' | 'md' | 'lg' | 'xl';
type MetricVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

// =============================================================================
// ANIMATED METRIC CARD
// =============================================================================

interface AnimatedMetricCardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  suffix?: string;
  prefix?: string;
  trend?: TrendDirection;
  trendValue?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  variant?: MetricVariant;
  size?: MetricSize;
  sparkline?: number[];
  target?: number;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AnimatedMetricCard({
  label,
  value,
  previousValue,
  suffix = '',
  prefix = '',
  trend,
  trendValue,
  trendLabel,
  icon: Icon,
  variant = 'default',
  size = 'md',
  sparkline,
  target,
  isLoading,
  onClick,
  className,
}: AnimatedMetricCardProps) {
  const [displayValue, setDisplayValue] = React.useState(
    typeof value === 'number' ? 0 : value
  );

  // Animate number counting
  React.useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValue = typeof previousValue === 'number' ? previousValue : 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, previousValue]);

  // Determine trend if not provided
  const calculatedTrend = trend || (
    previousValue !== undefined && typeof value === 'number'
      ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'neutral'
      : 'neutral'
  );

  const variantStyles = {
    default: {
      container: 'bg-card border-border hover:border-primary/30',
      icon: 'bg-primary/10 text-primary',
      value: 'text-foreground',
    },
    success: {
      container: 'bg-success/5 border-success/20 hover:border-success/40',
      icon: 'bg-success/10 text-success',
      value: 'text-success',
    },
    warning: {
      container: 'bg-warning/5 border-yellow-500/20 hover:border-yellow-500/40',
      icon: 'bg-warning/10 text-warning',
      value: 'text-warning',
    },
    danger: {
      container: 'bg-destructive/5 border-destructive/20 hover:border-destructive/40',
      icon: 'bg-destructive/10 text-destructive',
      value: 'text-destructive',
    },
    info: {
      container: 'bg-info/5 border-info/20 hover:border-info/40',
      icon: 'bg-info/10 text-info',
      value: 'text-info',
    },
  };

  const sizeStyles = {
    sm: { padding: 'p-3', value: 'text-xl', label: 'text-xs', icon: 'w-4 h-4' },
    md: { padding: 'p-4', value: 'text-2xl', label: 'text-sm', icon: 'w-5 h-5' },
    lg: { padding: 'p-5', value: 'text-3xl', label: 'text-sm', icon: 'w-6 h-6' },
    xl: { padding: 'p-6', value: 'text-4xl', label: 'text-base', icon: 'w-7 h-7' },
  };

  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return Math.round(val).toLocaleString('pt-BR');
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        'relative rounded-xl border transition-all duration-300',
        styles.container,
        sizes.padding,
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <motion.div
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-muted-foreground', sizes.label)}>{label}</span>
        {Icon && (
          <div className={cn('p-2 rounded-lg', styles.icon)}>
            <Icon className={sizes.icon} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-2">
        {prefix && <span className={cn('font-medium', sizes.label)}>{prefix}</span>}
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('font-bold tabular-nums', sizes.value, styles.value)}
        >
          {formatValue(displayValue)}
        </motion.span>
        {suffix && <span className={cn('text-muted-foreground', sizes.label)}>{suffix}</span>}
      </div>

      {/* Trend indicator */}
      {(trendValue !== undefined || calculatedTrend !== 'neutral') && (
        <div className="flex items-center gap-2">
          <TrendIndicator 
            direction={calculatedTrend} 
            value={trendValue}
            label={trendLabel}
          />
        </div>
      )}

      {/* Progress to target */}
      {target && typeof value === 'number' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Meta</span>
            <span>{Math.round((value / target) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--gradient-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((value / target) * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3">
          <MiniSparkline data={sparkline} />
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// TREND INDICATOR
// =============================================================================

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrendIndicator({
  direction,
  value,
  label,
  size = 'sm',
  className,
}: TrendIndicatorProps) {
  const configs = {
    up: {
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    down: {
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    neutral: {
      icon: Minus,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  };

  const config = configs[direction];
  const Icon = config.icon;

  const sizes = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-1.5 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2 py-1' },
  };

  const sizeConfig = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        config.bg,
        sizeConfig.padding,
        className
      )}
    >
      <Icon className={cn(sizeConfig.icon, config.color)} />
      {value !== undefined && (
        <span className={cn('font-medium', sizeConfig.text, config.color)}>
          {direction === 'up' ? '+' : direction === 'down' ? '' : ''}{value}%
        </span>
      )}
      {label && (
        <span className={cn('text-muted-foreground', sizeConfig.text)}>{label}</span>
      )}
    </motion.div>
  );
}

// =============================================================================
// MINI SPARKLINE
// =============================================================================

interface MiniSparklineProps {
  data: number[];
  height?: number;
  color?: string;
  className?: string;
}

export function MiniSparkline({
  data,
  height = 24,
  color = 'hsl(var(--primary))',
  className,
}: MiniSparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
    >
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      {/* Gradient fill below line */}
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polygon
        fill="url(#sparklineGradient)"
        points={`0,${height} ${points} 100,${height}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />
    </svg>
  );
}

// =============================================================================
// METRIC COMPARISON
// =============================================================================

interface MetricComparisonProps {
  label: string;
  current: number;
  previous: number;
  format?: (value: number) => string;
  className?: string;
}

export function MetricComparison({
  label,
  current,
  previous,
  format = (v) => v.toLocaleString('pt-BR'),
  className,
}: MetricComparisonProps) {
  const diff = current - previous;
  const percentChange = previous > 0 ? ((diff / previous) * 100) : 0;
  const trend: TrendDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-medium text-foreground">{format(current)}</div>
          <div className="text-xs text-muted-foreground">
            vs {format(previous)}
          </div>
        </div>
        <TrendIndicator
          direction={trend}
          value={Math.abs(Math.round(percentChange))}
        />
      </div>
    </div>
  );
}

// =============================================================================
// GOAL PROGRESS RING
// =============================================================================

interface GoalProgressRingProps {
  value: number;
  target: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export function GoalProgressRing({
  value,
  target,
  label,
  size = 'md',
  showPercentage = true,
  className,
}: GoalProgressRingProps) {
  const percentage = Math.min((value / target) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizes = {
    sm: { svg: 80, text: 'text-lg', label: 'text-xs' },
    md: { svg: 100, text: 'text-2xl', label: 'text-sm' },
    lg: { svg: 120, text: 'text-3xl', label: 'text-sm' },
  };

  const sizeConfig = sizes[size];

  const variant = percentage >= 100 ? 'success' : percentage >= 75 ? 'primary' : percentage >= 50 ? 'warning' : 'danger';
  const colors = {
    success: 'stroke-green-500',
    primary: 'stroke-primary',
    warning: 'stroke-yellow-500',
    danger: 'stroke-destructive',
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: sizeConfig.svg, height: sizeConfig.svg }}>
        <svg
          className="transform -rotate-90"
          width={sizeConfig.svg}
          height={sizeConfig.svg}
        >
          {/* Background circle */}
          <circle
            cx={sizeConfig.svg / 2}
            cy={sizeConfig.svg / 2}
            r="40"
            fill="none"
            className="stroke-muted"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx={sizeConfig.svg / 2}
            cy={sizeConfig.svg / 2}
            r="40"
            fill="none"
            className={colors[variant]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage ? (
            <motion.span
              key={Math.round(percentage)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn('font-bold', sizeConfig.text)}
            >
              {Math.round(percentage)}%
            </motion.span>
          ) : (
            <>
              <span className={cn('font-bold', sizeConfig.text)}>{value}</span>
              <span className="text-xs text-muted-foreground">/{target}</span>
            </>
          )}
        </div>

        {/* Completion badge */}
        <AnimatePresence>
          {percentage >= 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center"
            >
              <Award className="w-3.5 h-3.5 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <span className={cn('mt-2 text-muted-foreground', sizeConfig.label)}>{label}</span>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const DashboardMetrics = {
  Card: AnimatedMetricCard,
  Trend: TrendIndicator,
  Sparkline: MiniSparkline,
  Comparison: MetricComparison,
  GoalRing: GoalProgressRing,
};
