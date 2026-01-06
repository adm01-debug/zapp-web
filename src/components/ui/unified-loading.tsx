import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, MessageSquare, Users, BarChart3, Settings, Search, RefreshCw, Zap } from 'lucide-react';
import { Skeleton } from './skeleton';

// =============================================================================
// TIPOS E VARIANTES
// =============================================================================

type LoadingContext = 
  | 'default'
  | 'inbox'
  | 'contacts'
  | 'dashboard'
  | 'settings'
  | 'search'
  | 'ai'
  | 'data'
  | 'action';

type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingConfig {
  icon: React.ElementType;
  color: string;
  glowColor: string;
  message: string;
}

const loadingConfigs: Record<LoadingContext, LoadingConfig> = {
  default: {
    icon: Loader2,
    color: 'text-primary',
    glowColor: 'shadow-primary/30',
    message: 'Carregando...',
  },
  inbox: {
    icon: MessageSquare,
    color: 'text-secondary',
    glowColor: 'shadow-secondary/30',
    message: 'Carregando conversas...',
  },
  contacts: {
    icon: Users,
    color: 'text-secondary',
    glowColor: 'shadow-secondary/30',
    message: 'Carregando contatos...',
  },
  dashboard: {
    icon: BarChart3,
    color: 'text-primary',
    glowColor: 'shadow-primary/30',
    message: 'Carregando métricas...',
  },
  settings: {
    icon: Settings,
    color: 'text-muted-foreground',
    glowColor: 'shadow-muted/30',
    message: 'Carregando configurações...',
  },
  search: {
    icon: Search,
    color: 'text-primary',
    glowColor: 'shadow-primary/30',
    message: 'Buscando...',
  },
  ai: {
    icon: Sparkles,
    color: 'text-secondary',
    glowColor: 'shadow-secondary/40',
    message: 'IA processando...',
  },
  data: {
    icon: RefreshCw,
    color: 'text-primary',
    glowColor: 'shadow-primary/30',
    message: 'Atualizando dados...',
  },
  action: {
    icon: Zap,
    color: 'text-secondary',
    glowColor: 'shadow-secondary/30',
    message: 'Processando...',
  },
};

const sizeConfig: Record<LoadingSize, { icon: string; text: string; container: string }> = {
  xs: { icon: 'w-3 h-3', text: 'text-xs', container: 'gap-1.5' },
  sm: { icon: 'w-4 h-4', text: 'text-sm', container: 'gap-2' },
  md: { icon: 'w-5 h-5', text: 'text-sm', container: 'gap-2' },
  lg: { icon: 'w-6 h-6', text: 'text-base', container: 'gap-3' },
  xl: { icon: 'w-8 h-8', text: 'text-lg', container: 'gap-3' },
};

// =============================================================================
// COMPONENTES DE LOADING
// =============================================================================

interface UnifiedSpinnerProps {
  context?: LoadingContext;
  size?: LoadingSize;
  className?: string;
  animate?: boolean;
}

export function UnifiedSpinner({ 
  context = 'default', 
  size = 'md',
  className,
  animate = true 
}: UnifiedSpinnerProps) {
  const config = loadingConfigs[context];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('relative', className)}
    >
      <Icon 
        className={cn(
          sizes.icon,
          config.color,
          context === 'ai' || context === 'default' ? 'animate-spin' : 'animate-pulse'
        )} 
      />
      {/* Glow effect */}
      <div 
        className={cn(
          'absolute inset-0 rounded-full blur-md opacity-50',
          config.glowColor
        )} 
      />
    </motion.div>
  );
}

interface UnifiedLoadingProps {
  context?: LoadingContext;
  size?: LoadingSize;
  message?: string;
  showMessage?: boolean;
  className?: string;
}

export function UnifiedLoading({ 
  context = 'default',
  size = 'md',
  message,
  showMessage = true,
  className 
}: UnifiedLoadingProps) {
  const config = loadingConfigs[context];
  const sizes = sizeConfig[size];
  const displayMessage = message || config.message;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex items-center justify-center',
        sizes.container,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
    >
      <UnifiedSpinner context={context} size={size} />
      {showMessage && (
        <span className={cn('text-muted-foreground', sizes.text)}>
          {displayMessage}
        </span>
      )}
    </motion.div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  context?: LoadingContext;
  message?: string;
  blur?: boolean;
  children: React.ReactNode;
}

export function LoadingOverlay({ 
  isLoading, 
  context = 'default',
  message,
  blur = true,
  children 
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 z-50 flex items-center justify-center',
              'bg-background/80',
              blur && 'backdrop-blur-sm'
            )}
          >
            <UnifiedLoading context={context} message={message} size="lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// LOADING PULSE (para botões inline)
// =============================================================================

interface LoadingPulseProps {
  context?: LoadingContext;
  size?: LoadingSize;
  className?: string;
}

export function LoadingPulse({ context = 'default', size = 'sm', className }: LoadingPulseProps) {
  const config = loadingConfigs[context];

  return (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'rounded-full',
            config.color.replace('text-', 'bg-'),
            size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// LOADING CARD (skeleton contextual)
// =============================================================================

interface LoadingCardProps {
  context?: 'conversation' | 'contact' | 'metric' | 'message' | 'default';
  className?: string;
}

export function LoadingCard({ context = 'default', className }: LoadingCardProps) {
  const renderContent = () => {
    switch (context) {
      case 'conversation':
        return (
          <div className="flex gap-3 p-3">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" speed="default" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" speed="fast" />
                <Skeleton className="h-3 w-12" speed="slow" />
              </div>
              <Skeleton className="h-3 w-full" speed="default" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-14 rounded-full" speed="fast" />
                <Skeleton className="h-5 w-10 rounded-full" speed="default" />
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        );

      case 'metric':
        return (
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-8 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="flex gap-2 p-2">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        );
    }
  };

  return (
    <div className={cn('animate-in fade-in duration-300', className)}>
      {renderContent()}
    </div>
  );
}

// =============================================================================
// LOADING LIST (múltiplos items)
// =============================================================================

interface LoadingListProps {
  context?: 'conversation' | 'contact' | 'metric' | 'message' | 'default';
  count?: number;
  className?: string;
}

export function LoadingList({ context = 'default', count = 5, className }: LoadingListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <LoadingCard context={context} />
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// FULL PAGE LOADING (melhorado)
// =============================================================================

interface FullPageLoadingProps {
  context?: LoadingContext;
  title?: string;
  subtitle?: string;
}

export function FullPageLoading({ 
  context = 'default',
  title = 'Carregando',
  subtitle = 'Preparando sua experiência...'
}: FullPageLoadingProps) {
  const config = loadingConfigs[context];
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl bg-primary/10"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl bg-secondary/10"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 4, repeat: Infinity, delay: 2 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center"
      >
        {/* Icon container */}
        <motion.div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
          style={{ background: 'var(--gradient-primary)' }}
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Icon className="w-10 h-10 text-primary-foreground" />
          
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-primary/30"
            animate={{
              scale: [1, 1.3],
              opacity: [0.5, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>

        {/* Text */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl font-semibold text-foreground mb-2"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm mb-6"
        >
          {subtitle}
        </motion.p>

        {/* Loading dots */}
        <LoadingPulse context={context} size="md" className="justify-center" />
      </motion.div>
    </div>
  );
}

// =============================================================================
// INLINE LOADING (para uso dentro de componentes)
// =============================================================================

interface InlineLoadingProps {
  context?: LoadingContext;
  message?: string;
  size?: LoadingSize;
  className?: string;
}

export function InlineLoading({ 
  context = 'default',
  message,
  size = 'sm',
  className 
}: InlineLoadingProps) {
  const config = loadingConfigs[context];

  return (
    <div 
      className={cn(
        'flex items-center justify-center gap-2 py-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <UnifiedSpinner context={context} size={size} />
      <span className={cn('text-muted-foreground', sizeConfig[size].text)}>
        {message || config.message}
      </span>
    </div>
  );
}

// =============================================================================
// ACTION LOADING (para botões/ações)
// =============================================================================

interface ActionLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  context?: LoadingContext;
}

export function ActionLoading({ 
  isLoading, 
  loadingText = 'Processando...', 
  children,
  context = 'action' 
}: ActionLoadingProps) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <UnifiedSpinner context={context} size="xs" animate={false} />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

// =============================================================================
// PROGRESS LOADING (com barra de progresso)
// =============================================================================

interface ProgressLoadingProps {
  progress: number;
  context?: LoadingContext;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressLoading({
  progress,
  context = 'default',
  message,
  showPercentage = true,
  className
}: ProgressLoadingProps) {
  const config = loadingConfigs[context];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {message || config.message}
        </span>
        {showPercentage && (
          <motion.span 
            key={Math.round(clampedProgress)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('font-medium', config.color)}
          >
            {Math.round(clampedProgress)}%
          </motion.span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-primary)' }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const UnifiedLoadingStates = {
  Spinner: UnifiedSpinner,
  Loading: UnifiedLoading,
  Overlay: LoadingOverlay,
  Pulse: LoadingPulse,
  Card: LoadingCard,
  List: LoadingList,
  FullPage: FullPageLoading,
  Inline: InlineLoading,
  Action: ActionLoading,
  Progress: ProgressLoading,
};
