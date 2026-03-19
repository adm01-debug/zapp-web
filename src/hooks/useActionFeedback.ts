import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface FeedbackOptions {
  title?: string;
  description: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface WithFeedbackOptions<T> {
  loadingMessage?: string;
  successMessage?: string | ((result: T) => string);
  errorMessage?: string;
  showLoading?: boolean;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface UndoableOptions<T> {
  description: string;
  undoDuration?: number;
  onUndo: () => void;
  onConfirm?: (result: T) => void;
}

// ============================================================================
// Icon Mapping (using text symbols for toast compatibility)
// ============================================================================

const FEEDBACK_ICONS: Record<FeedbackType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  loading: '⟳',
};

const FEEDBACK_TITLES: Record<FeedbackType, string> = {
  success: 'Sucesso!',
  error: 'Erro!',
  warning: 'Atenção',
  info: 'Informação',
  loading: 'Processando...',
};

const FEEDBACK_VARIANTS: Record<FeedbackType, 'default' | 'destructive'> = {
  success: 'default',
  error: 'destructive',
  warning: 'default',
  info: 'default',
  loading: 'default',
};

const FEEDBACK_DURATIONS: Record<FeedbackType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  loading: 60000,
};

// ============================================================================
// Main Hook
// ============================================================================

export function useActionFeedback() {
  const { toast } = useToast();
  const activeToasts = useRef<Map<string, { dismiss: () => void }>>(new Map());

  const showFeedback = useCallback(
    (type: FeedbackType, options: FeedbackOptions) => {
      const icon = FEEDBACK_ICONS[type];
      const title = options.title || FEEDBACK_TITLES[type];
      const duration = options.duration ?? FEEDBACK_DURATIONS[type];

      // Build description with action hint if present
      const description = options.action 
        ? `${icon} ${options.description} [${options.action.label}]`
        : `${icon} ${options.description}`;

      const toastResult = toast({
        title,
        description,
        variant: FEEDBACK_VARIANTS[type],
        duration,
      });

      // If action provided, set up click handler via toast ID
      if (options.action) {
        const actionCallback = options.action.onClick;
        // Store callback for potential use
        activeToasts.current.set(toastResult.id, { 
          dismiss: () => {
            toastResult.dismiss();
            activeToasts.current.delete(toastResult.id);
          }
        });
      }

      return toastResult;
    },
    [toast]
  );
  const success = useCallback(
    (description: string, title?: string) =>
      showFeedback('success', { description, title }),
    [showFeedback]
  );

  const error = useCallback(
    (description: string, title?: string) =>
      showFeedback('error', { description, title }),
    [showFeedback]
  );

  const warning = useCallback(
    (description: string, title?: string) =>
      showFeedback('warning', { description, title }),
    [showFeedback]
  );

  const info = useCallback(
    (description: string, title?: string) =>
      showFeedback('info', { description, title }),
    [showFeedback]
  );

  const loading = useCallback(
    (description: string, title?: string) =>
      showFeedback('loading', { description, title }),
    [showFeedback]
  );

  // Universal async action wrapper with feedback
  const withFeedback = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: WithFeedbackOptions<T> = {}
    ): Promise<T | undefined> => {
      const {
        loadingMessage = 'Processando...',
        successMessage = 'Operação concluída com sucesso!',
        errorMessage = 'Ocorreu um erro. Tente novamente.',
        showLoading = true,
        onSuccess,
        onError,
      } = options;

      const loadingToast = showLoading ? loading(loadingMessage) : null;

      try {
        const result = await action();
        loadingToast?.dismiss();

        const message = typeof successMessage === 'function' 
          ? successMessage(result) 
          : successMessage;
        success(message);

        onSuccess?.(result);
        return result;
      } catch (err) {
        loadingToast?.dismiss();
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        error(errorInstance.message || errorMessage);
        onError?.(errorInstance);
        return undefined;
      }
    },
    [loading, success, error]
  );

  // Undoable action with countdown
  const withUndo = useCallback(
    <T,>(
      action: () => Promise<T>,
      options: UndoableOptions<T>
    ): Promise<T | 'undone' | undefined> => {
      return new Promise((resolve) => {
        const { description, undoDuration = 5000, onUndo, onConfirm } = options;
        let undone = false;

        const toastResult = showFeedback('info', {
          description,
          duration: undoDuration,
          action: {
            label: 'Desfazer',
            onClick: () => {
              undone = true;
              clearTimeout(delayedTimeoutId);
              toastResult.dismiss();
              onUndo();
              info('Ação desfeita');
              resolve('undone');
            },
          },
        });

        const delayedTimeoutId = setTimeout(async () => {
          if (!undone) {
            try {
              const result = await action();
              onConfirm?.(result);
              resolve(result);
            } catch (err) {
              error(err instanceof Error ? err.message : 'Erro ao executar ação');
              resolve(undefined);
            }
          }
        }, undoDuration);
      });
    },
    [showFeedback, info, error]
  );

  // Batch operations feedback
  const withBatchFeedback = useCallback(
    async <T,>(
      actions: (() => Promise<T>)[],
      options: {
        progressMessage?: (current: number, total: number) => string;
        successMessage?: string;
        errorMessage?: string;
        stopOnError?: boolean;
      } = {}
    ): Promise<{ results: T[]; errors: Error[] }> => {
      const {
        progressMessage = (current, total) => `Processando ${current} de ${total}...`,
        successMessage = 'Todas as operações concluídas!',
        errorMessage = 'Algumas operações falharam',
        stopOnError = false,
      } = options;

      const results: T[] = [];
      const errors: Error[] = [];
      const total = actions.length;

      const loadingToast = loading(progressMessage(0, total));

      for (let i = 0; i < actions.length; i++) {
        loadingToast.update({
          id: loadingToast.id,
          description: `⟳ ${progressMessage(i + 1, total)}`,
        });

        try {
          const result = await actions[i]();
          results.push(result);
        } catch (err) {
          const errorInstance = err instanceof Error ? err : new Error(String(err));
          errors.push(errorInstance);
          if (stopOnError) break;
        }
      }

      loadingToast.dismiss();

      if (errors.length === 0) {
        success(successMessage);
      } else if (errors.length === total) {
        error(errorMessage);
      } else {
        warning(`${results.length} sucesso, ${errors.length} falhas`);
      }

      return { results, errors };
    },
    [loading, success, error, warning]
  );

  // Dismiss all active toasts
  const dismissAll = useCallback(() => {
    activeToasts.current.forEach((t) => t.dismiss());
    activeToasts.current.clear();
  }, []);

  return {
    showFeedback,
    success,
    error,
    warning,
    info,
    loading,
    withFeedback,
    withUndo,
    withBatchFeedback,
    dismissAll,
  };
}

// ============================================================================
// Optimistic Action Hook
// ============================================================================

export function useOptimisticAction<T>() {
  const feedback = useActionFeedback();
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    async (
      optimisticUpdate: () => void,
      serverAction: () => Promise<T>,
      rollback: () => void,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        silent?: boolean;
      }
    ): Promise<T | undefined> => {
      setIsPending(true);
      optimisticUpdate();

      try {
        const result = await serverAction();
        if (!options?.silent) {
          feedback.success(options?.successMessage || 'Alteração salva!');
        }
        return result;
      } catch (err) {
        rollback();
        feedback.error(
          err instanceof Error ? err.message : options?.errorMessage || 'Erro ao salvar alteração'
        );
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [feedback]
  );

  return { execute, isPending, ...feedback };
}

// ============================================================================
// Confirmation Hook
// ============================================================================

export function useConfirmAction() {
  const feedback = useActionFeedback();

  const confirm = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
      }
    ): Promise<T | 'cancelled' | undefined> => {
      return new Promise((resolve) => {
        const toastResult = feedback.showFeedback('warning', {
          title: 'Confirmação',
          description: options.message,
          duration: 30000,
          action: {
            label: options.confirmLabel || 'Confirmar',
            onClick: async () => {
              toastResult.dismiss();
              options.onConfirm?.();
              try {
                const result = await action();
                feedback.success('Ação confirmada!');
                resolve(result);
              } catch (err) {
                feedback.error(err instanceof Error ? err.message : 'Erro ao executar');
                resolve(undefined);
              }
            },
          },
        });
      });
    },
    [feedback]
  );

  return { confirm, ...feedback };
}
