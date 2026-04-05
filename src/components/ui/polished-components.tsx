import React, { memo, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ExternalLink, ChevronRight, Sparkles, Crown, Star, Zap } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';

// ============================================
// POLISHED UI COMPONENTS
// ============================================

/**
 * Gradient text component
 */
interface GradientTextProps {
  children: React.ReactNode;
  gradient?: 'primary' | 'rainbow' | 'gold' | 'emerald' | 'custom';
  customGradient?: string;
  className?: string;
  animate?: boolean;
}

export const GradientText = memo(function GradientText({
  children,
  gradient = 'primary',
  customGradient,
  className,
  animate = false,
}: GradientTextProps) {
  const gradients = {
    primary: 'from-primary via-primary/80 to-primary/60',
    rainbow: 'from-red-500 via-warning via-green-500 via-blue-500 to-primary',
    gold: 'from-warning via-warning to-warning',
    emerald: 'from-success via-info to-info',
    custom: customGradient || '',
  };

  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        gradients[gradient],
        animate && 'animate-gradient bg-[length:200%_auto]',
        className
      )}
    >
      {children}
    </span>
  );
});

/**
 * Glass card with frosted effect
 */
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ blur = 'md', border = true, glow = false, children, className, ...props }, ref) => {
    const blurClasses = {
      sm: '',
      md: 'backdrop-blur-sm',
      lg: 'backdrop-blur-sm',
      xl: 'backdrop-blur-md',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-background/90',
          blurClasses[blur],
          border && 'border border-border/50',
          glow && 'shadow-lg shadow-primary/5',
          'rounded-xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = 'GlassCard';

/**
 * Premium badge with icon
 */
interface PremiumBadgeProps {
  type: 'pro' | 'premium' | 'gold' | 'new' | 'beta' | 'hot';
  size?: 'sm' | 'md';
  animate?: boolean;
}

export const PremiumBadge = memo(function PremiumBadge({
  type,
  size = 'sm',
  animate = true,
}: PremiumBadgeProps) {
  const configs = {
    pro: { icon: Crown, label: 'PRO', className: 'bg-gradient-to-r from-warning to-warning text-primary-foreground' },
    premium: { icon: Star, label: 'Premium', className: 'bg-gradient-to-r from-primary to-destructive text-primary-foreground' },
    gold: { icon: Sparkles, label: 'Gold', className: 'bg-gradient-to-r from-warning to-warning text-foreground' },
    new: { icon: Zap, label: 'Novo', className: 'bg-gradient-to-r from-success to-info text-primary-foreground' },
    beta: { icon: Sparkles, label: 'Beta', className: 'bg-gradient-to-r from-info to-info text-primary-foreground' },
    hot: { icon: Zap, label: 'Hot', className: 'bg-gradient-to-r from-red-500 to-warning text-primary-foreground' },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.span
      initial={animate ? { scale: 0 } : false}
      animate={{ scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className
      )}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {config.label}
    </motion.span>
  );
});

/**
 * Copy to clipboard button
 */
interface CopyButtonProps {
  text: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outline';
  onCopy?: () => void;
}

export const CopyButton = memo(function CopyButton({
  text,
  size = 'sm',
  variant = 'ghost',
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant={variant}
      size={size === 'sm' ? 'icon' : 'sm'}
      onClick={handleCopy}
      className={cn(size === 'sm' && 'h-7 w-7')}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="w-3.5 h-3.5 text-success" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
});

/**
 * External link with icon
 */
interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  showIcon?: boolean;
}

export const ExternalLinkStyled = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ children, showIcon = true, className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1 text-primary hover:underline underline-offset-4 transition-colors',
          className
        )}
        {...props}
      >
        {children}
        {showIcon && <ExternalLink className="w-3 h-3" />}
      </a>
    );
  }
);
ExternalLinkStyled.displayName = 'ExternalLinkStyled';

/**
 * Breadcrumb item
 */
interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItemProps[];
  className?: string;
}

export const Breadcrumb = memo(function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          {item.active ? (
            <span className="text-foreground font-medium">{item.children}</span>
          ) : item.href ? (
            <a href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.children}
            </a>
          ) : (
            <span className="text-muted-foreground">{item.children}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

/**
 * Status indicator with pulse
 */
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'dnd';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  pulse?: boolean;
}

export const StatusIndicator = memo(function StatusIndicator({
  status,
  size = 'sm',
  showLabel = false,
  pulse = true,
}: StatusIndicatorProps) {
  const configs = {
    online: { color: 'bg-success', label: 'Online' },
    offline: { color: 'bg-muted-foreground', label: 'Offline' },
    busy: { color: 'bg-destructive', label: 'Ocupado' },
    away: { color: 'bg-warning', label: 'Ausente' },
    dnd: { color: 'bg-destructive', label: 'Não perturbe' },
  };

  const sizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  const config = configs[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative">
        <span className={cn('block rounded-full', sizes[size], config.color)} />
        {pulse && status === 'online' && (
          <span className={cn('absolute inset-0 rounded-full animate-ping opacity-75', config.color)} />
        )}
      </span>
      {showLabel && <span className="text-xs text-muted-foreground">{config.label}</span>}
    </span>
  );
});

/**
 * Keyboard shortcut badge
 */
interface KbdProps {
  keys: string[];
  className?: string;
}

export const Kbd = memo(function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded shadow-sm">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-[10px] text-muted-foreground">+</span>}
        </React.Fragment>
      ))}
    </span>
  );
});

/**
 * Progress bar with label
 */
interface LabeledProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const LabeledProgress = memo(function LabeledProgress({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
}: LabeledProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showPercentage && <span className="text-xs font-medium">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full', variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
});

/**
 * Tag/chip component
 */
interface TagProps {
  children: React.ReactNode;
  color?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const Tag = memo(function Tag({ children, color, onRemove, size = 'sm' }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        color ? '' : 'bg-muted/50 border-border/50'
      )}
      style={color ? { backgroundColor: `${color}20`, borderColor: `${color}40`, color } : undefined}
    >
      {color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:bg-background/10 rounded-full p-0.5 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
});

/**
 * Divider with optional text
 */
interface DividerProps {
  text?: string;
  className?: string;
}

export const Divider = memo(function Divider({ text, className }: DividerProps) {
  if (text) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{text}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return <div className={cn('h-px bg-border', className)} />;
});

/**
 * Feature highlight card
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export const FeatureCard = memo(function FeatureCard({
  icon,
  title,
  description,
  badge,
  className,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      className={cn(
        'relative p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300',
        className
      )}
    >
      {badge && (
        <div className="absolute -top-2 -right-2">
          <PremiumBadge type={badge as 'pro' | 'premium' | 'gold' | 'new' | 'beta' | 'hot'} size="sm" />
        </div>
      )}
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
});
