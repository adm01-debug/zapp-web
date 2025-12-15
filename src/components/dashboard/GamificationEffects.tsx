import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Star, Flame, Zap, Crown, Target, Award } from 'lucide-react';
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
    gradient: 'from-xp to-purple-400',
    glow: 'shadow-[0_0_20px_hsl(var(--xp)/0.4)]',
    pulse: true,
  },
  coins: {
    icon: Star,
    gradient: 'from-coins to-yellow-400',
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
    gradient: 'from-rank-gold to-yellow-300',
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

export function AnimatedBadge({
  value,
  label,
  variant = 'xp',
  size = 'md',
  showAnimation = true,
  className,
}: AnimatedBadgeProps) {
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

interface StatCardWithGamificationProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  gradient: string;
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
  icon: Icon,
  gradient,
  achievement,
  streak,
  index,
}: StatCardWithGamificationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <div className="card-interactive relative overflow-hidden border-border/50 hover:border-primary/30 h-full rounded-xl bg-card p-6">
        {/* Gradient accent top */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
          gradient
        )} />
        
        {/* Hover glow */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(300px circle at 50% 0%, hsl(var(--primary) / 0.08), transparent 70%)`
          }}
        />

        {/* Achievement unlocked effect */}
        {achievement?.unlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-20",
              gradient
            )} />
          </motion.div>
        )}

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
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
            
            {/* Animated icon container */}
            <motion.div 
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br relative overflow-hidden",
                gradient
              )}
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {/* Icon glow pulse */}
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Icon className="w-6 h-6 text-primary-foreground relative z-10" />
            </motion.div>
          </div>

          {/* Change badge with animation */}
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.4 }}
          >
            <motion.div 
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                changeType === 'positive'
                  ? 'bg-success/15 text-success'
                  : 'bg-destructive/15 text-destructive'
              )}
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                animate={changeType === 'positive' ? { y: [0, -2, 0] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {changeType === 'positive' ? '↑' : '↓'}
              </motion.span>
              {change}
            </motion.div>
            <span className="text-xs text-muted-foreground">vs ontem</span>
          </motion.div>

          {/* Streak indicator */}
          {streak && streak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.6, type: 'spring' }}
              className="absolute -top-2 -right-2"
            >
              <AnimatedBadge 
                value={streak} 
                variant="streak" 
                size="sm"
              />
            </motion.div>
          )}

          {/* Achievement badge */}
          {achievement?.unlocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              className="mt-3 pt-3 border-t border-border/30"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Award className="w-4 h-4 text-coins" />
                </motion.div>
                <span className="text-xs font-medium text-muted-foreground">
                  {achievement.label}
                </span>
              </div>
            </motion.div>
          )}
        </div>
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
