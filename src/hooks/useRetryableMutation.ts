import { useMutation, useQueryClient, UseMutationOptions, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';

interface RetryableMutationOptions<TData, TError, TVariables, TContext> extends
  Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Toast message on success */
  successMessage?: string;
  /** Toast message prefix on error (details appended) */
  errorMessage?: string;
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Enable optimistic update with rollback */
  optimisticUpdate?: {
    queryKey: QueryKey;
    updater: (old: unknown, variables: TVariables) => unknown;
  };
  /** Max retries (default: 2) */
  maxRetries?: number;
}

/**
 * Enhanced mutation hook with:
 * - Automatic retry with exponential backoff
 * - Toast notifications for success/error
 * - Optimistic updates with automatic rollback
 * - Query invalidation on success
 * - Deduplication (prevents double-submit)
 */
export function useRetryableMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>({
  mutationFn,
  successMessage,
  errorMessage = 'Erro ao processar',
  invalidateKeys,
  optimisticUpdate,
  maxRetries = 2,
  ...options
}: RetryableMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();
  const isSubmitting = useRef(false);

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables) => {
      if (isSubmitting.current) {
        throw new Error('Operação já em andamento');
      }
      isSubmitting.current = true;
      try {
        return await mutationFn(variables);
      } finally {
        isSubmitting.current = false;
      }
    },
    retry: maxRetries,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 8000),

    onMutate: async (variables) => {
      // Call user's onMutate first
      const userContext = await options.onMutate?.(variables);

      if (optimisticUpdate) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });

        // Snapshot previous value
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);

        // Optimistically update
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          (old: unknown) => optimisticUpdate.updater(old, variables)
        );

        return { previousData, userContext } as TContext;
      }

      return userContext as TContext;
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (optimisticUpdate && context && typeof context === 'object' && 'previousData' in context) {
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          (context as { previousData: unknown }).previousData
        );
      }

      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`${errorMessage}: ${msg}`);

      options.onError?.(error, variables, context);
    },

    onSuccess: (data, variables, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }

      // Invalidate related queries
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      options.onSuccess?.(data, variables, context);
    },

    onSettled: options.onSettled,
  });

  // Guarded mutate that prevents double-submit
  const safeMutate = useCallback(
    (variables: TVariables) => {
      if (!mutation.isPending) {
        mutation.mutate(variables);
      }
    },
    [mutation]
  );

  return {
    ...mutation,
    safeMutate,
    isSubmitting: mutation.isPending,
  };
}
