import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Star, Flame, Zap, Crown, Target, Award, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AnimatedBadgeProps {
  value: string | number;
  label?: string;
  variant?: 'xp' | 'coins' | 'streak' | 'achievement' | 'rank';
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  className?: string;
}

const variantConfig = {
  xp: {
    icon: Zap,
    gradient: 'from-xp to-primary',
    glow: 'shadow-[0_0_20px_hsl(var(--xp)/0.4)]',
    pulse: true,
  },
  coins: {
    icon: Star,
    gradient: 'from-coins to-warning',
    glow: 'shadow-[0_0_20px_hsl(var(--coins)/0.4)]',
    pulse: true,
  },
  streak: {
    icon: Flame,
    gradient: 'from-streak to-orange-400',
    glow: 'shadow-[0_0_20px_hsl(var(--streak)/0.4)]',
    pulse: true,
  },
  achievement: {
    icon: Trophy,
    gradient: 'from-primary to-primary-glow',
    glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.4)]',
    pulse: false,
  },
  rank: {
    icon: Crown,
    gradient: 'from-rank-gold to-warning',
    glow: 'shadow-[0_0_20px_hsl(var(--rank-gold)/0.4)]',
    pulse: false,
  },
};

const sizeConfig = {
  sm: {
    container: 'px-2.5 py-1 gap-1.5',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 gap-2',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 gap-2.5',
    icon: 'w-5 h-5',
    text: 'text-base',
  },
};

export const AnimatedBadge = React.forwardRef<HTMLDivElement, AnimatedBadgeProps>(function AnimatedBadge({
  value,
  label,
  variant = 'xp',
  size = 'md',
  showAnimation = true,
  className,
}, ref) {
  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'relative inline-flex items-center rounded-full font-semibold',
        'bg-gradient-to-r text-primary-foreground',
        config.gradient,
        showAnimation && config.glow,
        sizeStyles.container,
        className
      )}
    >
      {/* Shimmer effect */}
      {showAnimation && (
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        </motion.div>
      )}

      {/* Pulse ring */}
      {showAnimation && config.pulse && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-r',
            config.gradient
          )}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <motion.div
        animate={showAnimation ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
      >
        <Icon className={cn(sizeStyles.icon, 'relative z-10')} />
      </motion.div>

      <span className={cn(sizeStyles.text, 'font-bold relative z-10')}>
        {value}
        {label && <span className="ml-1 font-medium opacity-80">{label}</span>}
      </span>
    </motion.div>
  );
}

// Mini Sparkline component for stat cards
interface MiniSparklineProps {
  data: number[];
  isPositive: boolean;
  delay?: number;
}

function MiniSparkline({ data, isPositive, delay = 0 }: MiniSparklineProps) {
  const width = 50;
  const height = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <motion.svg
      width={width}
      height={height}
      className="overflow-visible"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <motion.path
        d={pathD}
        fill="none"
        stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.1 }}
      />
      <motion.circle
        cx={points[points.length - 1]?.x || 0}
        cy={points[points.length - 1]?.y || 0}
        r="3"
        fill={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.6 }}
      />
    </motion.svg>
  );
}

interface StatCardWithGamificationProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  changePercentage?: number;
  previousValue?: number;
  currentValue?: number;
  invertTrend?: boolean; // For metrics where lower is better
  sparklineData?: number[];
  icon: LucideIcon;
  gradient: string;
  iconBg?: string;
  achievement?: {
    label: string;
    unlocked: boolean;
  };
  streak?: number;
  index: number;
}

export function StatCardWithGamification({
  title,
  value,
  change,
  changeType,
  changePercentage,
  previousValue,
  currentValue,
  invertTrend = false,
  sparklineData,
  icon: Icon,
  gradient,
  iconBg,
  achievement,
  streak,
  index,
}: StatCardWithGamificationProps) {
  // Calculate if trend is positive based on invertTrend
  const isPositiveTrend = invertTrend ? changeType === 'negative' : changeType === 'positive';
  const ArrowIcon = changeType === 'positive' ? ArrowUp : ArrowDown;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative"
    >
      <div className="card-glow-purple relative overflow-hidden border border-secondary/30 hover:border-secondary/60 h-full rounded-2xl bg-card p-5 transition-all duration-300">
        {/* Purple gradient hover glow */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(350px circle at 80% 20%, hsl(var(--secondary) / 0.15), hsl(var(--primary) / 0.05) 60%, transparent 80%)`
          }}
        />

        <div className="relative flex items-start justify-between">
          {/* Icon container */}
          <motion.div 
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center relative",
              iconBg || 'bg-primary/10'
            )}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Icon className={cn(
              "w-6 h-6",
              gradient.includes('primary') ? 'text-primary' :
              gradient.includes('info') ? 'text-info' :
              gradient.includes('success') ? 'text-success' :
              gradient.includes('coins') ? 'text-coins' : 'text-primary'
            )} />
          </motion.div>

          {/* Streak indicator */}
          {streak && streak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.4, type: 'spring' }}
            >
              <AnimatedBadge 
                value={streak} 
                variant="streak" 
                size="sm"
              />
            </motion.div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-sm text-muted-foreground font-medium">
            {title}
          </p>
          <motion.p 
            className="text-3xl font-display font-bold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: 'spring' }}
          >
            {value}
          </motion.p>
        </div>

        {/* Enhanced Change badge with animated arrow */}
        <motion.div 
          className="flex items-center justify-between gap-2 mt-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 + 0.4 }}
        >
          <div className="flex items-center gap-2">
            <motion.div 
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                isPositiveTrend
                  ? 'bg-success/15 text-success border-success/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              )}
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {/* Animated bouncing arrow */}
              <motion.div
                animate={changeType === 'positive' 
                  ? { y: [0, -2, 0] }
                  : { y: [0, 2, 0] }
                }
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowIcon className="w-3.5 h-3.5" />
              </motion.div>
              {change}
            </motion.div>
            <span className="text-xs text-muted-foreground">vs ontem</span>
          </div>

          {/* Mini sparkline visualization */}
          {sparklineData && sparklineData.length > 1 && (
            <MiniSparkline 
              data={sparklineData} 
              isPositive={isPositiveTrend}
              delay={index * 0.1 + 0.5}
            />
          )}
        </motion.div>

        {/* Achievement badge */}
        {achievement?.unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.5 }}
            className="mt-3 pt-3 border-t border-border/20"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Award className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-xs font-medium text-muted-foreground">
                {achievement.label}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface LevelProgressProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  className?: string;
}

export function LevelProgress({ currentXP, requiredXP, level, className }: LevelProgressProps) {
  const progress = (currentXP / requiredXP) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative", className)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"
            animate={{ boxShadow: ['0 0 0 0 hsl(var(--primary) / 0.4)', '0 0 15px 2px hsl(var(--primary) / 0.2)', '0 0 0 0 hsl(var(--primary) / 0.4)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-sm font-bold text-primary-foreground">{level}</span>
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-foreground">Nível {level}</p>
            <p className="text-xs text-muted-foreground">{currentXP}/{requiredXP} XP</p>
          </div>
        </div>
        <AnimatedBadge value={`${Math.round(progress)}%`} variant="xp" size="sm" />
      </div>

      {/* Progress bar with shimmer */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-xp to-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
        />
        
        {/* Shimmer effect on progress */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
