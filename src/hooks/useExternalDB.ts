/**
 * useExternalDB — Generic hook for querying any table in the external CRM database
 * Routes through external-db-bridge edge function for security + telemetry
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ExternalDBFilter,
  ExternalDBOrder,
  ExternalDBQueryResult,
  ExternalTableName,
} from '@/types/externalDB';

// ─── Bridge invoke helper ─────────────────────────────────────
async function invokeBridge<T = unknown>(body: Record<string, unknown>): Promise<ExternalDBQueryResult<T>> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return {
    data: Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [],
    meta: data?.meta || { record_count: null, duration_ms: 0, severity: 'ok' },
  };
}

// ─── Select query ─────────────────────────────────────────────
interface UseExternalSelectOptions<T> {
  table: ExternalTableName | string;
  select?: string;
  filters?: ExternalDBFilter[];
  order?: ExternalDBOrder;
  limit?: number;
  offset?: number;
  countMode?: 'exact' | 'planned' | 'estimated';
  enabled?: boolean;
  staleTime?: number;
}

export function useExternalSelect<T = Record<string, unknown>>(options: UseExternalSelectOptions<T>) {
  const { table, select, filters, order, limit = 50, offset = 0, countMode, enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['external-db', table, { select, filters, order, limit, offset, countMode }],
    queryFn: () => invokeBridge<T>({
      action: 'select',
      table,
      params: { select, filters },
      ...(order && { params: { select, filters, order } }),
      limit,
      offset,
      countMode,
    }),
    enabled,
    staleTime,
    gcTime: staleTime * 2,
  });
}

// ─── RPC call ─────────────────────────────────────────────────
interface UseExternalRPCOptions {
  rpc: string;
  params?: Record<string, unknown>;
  enabled?: boolean;
  staleTime?: number;
}

export function useExternalRPC<T = unknown>(options: UseExternalRPCOptions) {
  return useQuery({
    queryKey: ['external-db', 'rpc', options.rpc, options.params],
    queryFn: async () => {
      const result = await invokeBridge<T>({
        action: 'rpc',
        rpc: options.rpc,
        params: options.params || {},
      });
      return result;
    },
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 10 * 60 * 1000,
  });
}

// ─── Paginated table browser ──────────────────────────────────
export function useExternalTableBrowser<T = Record<string, unknown>>(tableName: ExternalTableName | string) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<ExternalDBFilter[]>([]);
  const [order, setOrder] = useState<ExternalDBOrder | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const query = useExternalSelect<T>({
    table: tableName,
    filters,
    order,
    limit: pageSize,
    offset: page * pageSize,
    countMode: 'exact',
    staleTime: 2 * 60 * 1000,
  });

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const goToPage = useCallback((p: number) => setPage(p), []);

  const addFilter = useCallback((filter: ExternalDBFilter) => {
    setFilters(prev => [...prev, filter]);
    setPage(0);
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setPage(0);
  }, []);

  const setSort = useCallback((column: string, ascending = true) => {
    setOrder({ column, ascending });
    setPage(0);
  }, []);

  return {
    data: query.data?.data || [],
    totalRecords: query.data?.meta?.record_count ?? 0,
    duration: query.data?.meta?.duration_ms ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message || null,
    page,
    pageSize,
    filters,
    order,
    searchTerm,
    setSearchTerm,
    setPageSize: (size: number) => { setPageSize(size); setPage(0); },
    nextPage,
    prevPage,
    goToPage,
    addFilter,
    removeFilter,
    clearFilters,
    setSort,
    refetch: query.refetch,
  };
}

// ─── Mutation (insert/update/delete) ──────────────────────────
export function useExternalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      action: 'insert' | 'update' | 'delete';
      table: string;
      params: Record<string, unknown>;
    }) => {
      return invokeBridge(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['external-db', variables.table] });
    },
  });
}
