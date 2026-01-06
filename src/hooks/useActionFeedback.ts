import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface FeedbackOptions {
  title?: string;
  description: string;
  duration?: number;
}

const variants = {
  success: 'default' as const,
  error: 'destructive' as const,
  warning: 'default' as const,
  info: 'default' as const,
  loading: 'default' as const,
};

export function useActionFeedback() {
  const { toast } = useToast();

  const showFeedback = useCallback(
    (type: FeedbackType, options: FeedbackOptions) => {
      const iconClassName = `w-4 h-4 flex-shrink-0 ${
        type === 'success' ? 'text-success' :
        type === 'error' ? 'text-destructive' :
        type === 'warning' ? 'text-warning' :
        type === 'loading' ? 'text-primary animate-spin' :
        'text-info'
      }`;
      
      let icon;
      if (type === 'success') icon = '✓';
      else if (type === 'error') icon = '✕';
      else if (type === 'warning') icon = '⚠';
      else if (type === 'loading') icon = '⟳';
      else icon = 'ℹ';
      
      return toast({
        title: options.title,
        description: `${icon} ${options.description}`,
        variant: variants[type],
        duration: options.duration || (type === 'error' ? 5000 : 3000),
      });
    },
    [toast]
  );

  const success = useCallback(
    (description: string, title?: string) => 
      showFeedback('success', { description, title: title || 'Sucesso!' }),
    [showFeedback]
  );

  const error = useCallback(
    (description: string, title?: string) => 
      showFeedback('error', { description, title: title || 'Erro!' }),
    [showFeedback]
  );

  const warning = useCallback(
    (description: string, title?: string) => 
      showFeedback('warning', { description, title: title || 'Atenção' }),
    [showFeedback]
  );

  const info = useCallback(
    (description: string, title?: string) => 
      showFeedback('info', { description, title }),
    [showFeedback]
  );

  const loading = useCallback(
    (description: string, title?: string) => 
      showFeedback('loading', { description, title: title || 'Processando...', duration: 60000 }),
    [showFeedback]
  );

  const withFeedback = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        loadingMessage?: string;
        successMessage?: string;
        errorMessage?: string;
      } = {}
    ): Promise<T | undefined> => {
      const {
        loadingMessage = 'Processando...',
        successMessage = 'Operação concluída com sucesso!',
        errorMessage = 'Ocorreu um erro. Tente novamente.',
      } = options;

      const loadingToast = loading(loadingMessage);

      try {
        const result = await action();
        loadingToast.dismiss();
        success(successMessage);
        return result;
      } catch (err) {
        loadingToast.dismiss();
        error(err instanceof Error ? err.message : errorMessage);
        return undefined;
      }
    },
    [loading, success, error]
  );

  return {
    showFeedback,
    success,
    error,
    warning,
    info,
    loading,
    withFeedback,
  };
}

export function useOptimisticAction<T>() {
  const feedback = useActionFeedback();

  const execute = useCallback(
    async (
      optimisticUpdate: () => void,
      serverAction: () => Promise<T>,
      rollback: () => void,
      options?: {
        successMessage?: string;
        errorMessage?: string;
      }
    ): Promise<T | undefined> => {
      optimisticUpdate();

      try {
        const result = await serverAction();
        feedback.success(options?.successMessage || 'Alteração salva!');
        return result;
      } catch (err) {
        rollback();
        feedback.error(
          err instanceof Error ? err.message : options?.errorMessage || 'Erro ao salvar alteração'
        );
        return undefined;
      }
    },
    [feedback]
  );

  return { execute, ...feedback };
}
