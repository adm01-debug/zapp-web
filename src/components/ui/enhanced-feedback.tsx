import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  Loader2,
  Undo2,
  ExternalLink
} from 'lucide-react';
import { Button } from './button';

// =============================================================================
// TIPOS
// =============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'action';
type ToastPosition = 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';

interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

// =============================================================================
// ENHANCED TOAST (toast com ações e progresso)
// =============================================================================

interface EnhancedToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ToastAction;
  undoAction?: () => void;
  duration?: number;
  showProgress?: boolean;
  onClose: () => void;
  className?: string;
}

export function EnhancedToast({
  id,
  type,
  title,
  description,
  action,
  undoAction,
  duration = 5000,
  showProgress = true,
  onClose,
  className,
}: EnhancedToastProps) {
  const [progress, setProgress] = React.useState(100);
  const [isPaused, setIsPaused] = React.useState(false);

  // Auto-dismiss with progress
  React.useEffect(() => {
    if (type === 'loading' || isPaused) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, type, isPaused, onClose]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check className="w-4 h-4 text-success" />,
    error: <X className="w-4 h-4 text-destructive" />,
    warning: <AlertCircle className="w-4 h-4 text-warning" />,
    info: <Info className="w-4 h-4 text-info" />,
    loading: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
    action: <Info className="w-4 h-4 text-primary" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error: 'border-l-destructive',
    warning: 'border-l-yellow-500',
    info: 'border-l-blue-500',
    loading: 'border-l-primary',
    action: 'border-l-primary',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-lg border-l-4 shadow-lg',
        'bg-card border border-border',
        borderColors[type],
        className
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}

          {/* Actions */}
          {(action || undoAction) && (
            <div className="flex items-center gap-2 mt-3">
              {action && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={action.onClick}
                  className="h-7 text-xs"
                >
                  {action.icon}
                  {action.label}
                </Button>
              )}
              {undoAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={undoAction}
                  className="h-7 text-xs"
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Desfazer
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {showProgress && type !== 'loading' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-primary/20"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        >
          <div className="h-full bg-primary/50" />
        </motion.div>
      )}
    </motion.div>
  );
}

// =============================================================================
// TOAST CONTAINER (gerenciador de toasts)
// =============================================================================

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ToastAction;
  undoAction?: () => void;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  position?: ToastPosition;
  onRemove: (id: string) => void;
}

export function ToastContainer({ 
  toasts, 
  position = 'bottom-right',
  onRemove 
}: ToastContainerProps) {
  const positionClasses: Record<ToastPosition, string> = {
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position]
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <EnhancedToast
              {...toast}
              onClose={() => onRemove(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// USE ENHANCED TOAST HOOK
// =============================================================================

let toastId = 0;

export function useEnhancedToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = React.useCallback((title: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, ...options });
  }, [addToast]);

  const error = React.useCallback((title: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, ...options });
  }, [addToast]);

  const warning = React.useCallback((title: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, ...options });
  }, [addToast]);

  const info = React.useCallback((title: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, ...options });
  }, [addToast]);

  const loading = React.useCallback((title: string, options?: Partial<Toast>) => {
    return addToast({ type: 'loading', title, ...options });
  }, [addToast]);

  const withUndo = React.useCallback((
    title: string, 
    undoFn: () => void,
    options?: Partial<Toast>
  ) => {
    return addToast({ 
      type: 'success', 
      title, 
      undoAction: undoFn,
      duration: 8000,
      ...options 
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    loading,
    withUndo,
    ToastContainer: (
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    ),
  };
}

// =============================================================================
// INLINE FEEDBACK (para campos de formulário)
// =============================================================================

interface InlineFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
}

export function InlineFeedback({ type, message, className }: InlineFeedbackProps) {
  const configs = {
    success: { icon: Check, color: 'text-success', bg: 'bg-green-50 dark:bg-green-950/30' },
    error: { icon: X, color: 'text-destructive', bg: 'bg-destructive/10' },
    warning: { icon: AlertCircle, color: 'text-warning', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    info: { icon: Info, color: 'text-info', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
        config.bg,
        config.color,
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

// =============================================================================
// CONFIRMATION FEEDBACK (para ações destrutivas)
// =============================================================================

interface ConfirmationFeedbackProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmationFeedback({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'danger',
}: ConfirmationFeedbackProps) {
  const typeConfigs = {
    danger: { icon: AlertCircle, color: 'text-destructive', buttonVariant: 'destructive' as const },
    warning: { icon: AlertCircle, color: 'text-warning', buttonVariant: 'default' as const },
    info: { icon: Info, color: 'text-info', buttonVariant: 'default' as const },
  };

  const config = typeConfigs[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 bg-card rounded-xl border border-border shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className={cn('p-2 rounded-full bg-muted', config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={config.buttonVariant} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// STATUS BADGE (badge com status animado)
// =============================================================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending';
  label?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showPulse = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const statusConfigs = {
    online: { color: 'bg-success', label: 'Online' },
    offline: { color: 'bg-muted', label: 'Offline' },
    busy: { color: 'bg-destructive', label: 'Ocupado' },
    away: { color: 'bg-warning', label: 'Ausente' },
    pending: { color: 'bg-info', label: 'Pendente' },
  };

  const sizeConfigs = {
    sm: { dot: 'w-1.5 h-1.5', text: 'text-xs', gap: 'gap-1' },
    md: { dot: 'w-2 h-2', text: 'text-sm', gap: 'gap-1.5' },
    lg: { dot: 'w-2.5 h-2.5', text: 'text-sm', gap: 'gap-2' },
  };

  const config = statusConfigs[status];
  const sizeConfig = sizeConfigs[size];

  return (
    <div className={cn('flex items-center', sizeConfig.gap, className)}>
      <span className="relative flex">
        <span className={cn('rounded-full', sizeConfig.dot, config.color)} />
        {showPulse && (status === 'online' || status === 'pending') && (
          <motion.span
            className={cn(
              'absolute inline-flex rounded-full opacity-75',
              sizeConfig.dot,
              config.color
            )}
            animate={{ scale: [1, 1.5], opacity: [0.75, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </span>
      {label !== undefined && (
        <span className={cn('text-muted-foreground', sizeConfig.text)}>
          {label || config.label}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const EnhancedFeedback = {
  Toast: EnhancedToast,
  Container: ToastContainer,
  Inline: InlineFeedback,
  Confirmation: ConfirmationFeedback,
  StatusBadge,
  useToast: useEnhancedToast,
};
