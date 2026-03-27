import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useExternalCatalog');

// ─── Types ────────────────────────────────────────────────────
export interface ExternalCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface ExternalSupplier {
  id: string;
  name: string;
}

export interface ExternalProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string> | null;
  stock_quantity: number;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  capacity_ml: number | null;
  selected_thumbnail: string | null;
  is_active: boolean;
}

export interface ExternalProduct {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  sale_price: number;
  suggested_price: number | null;
  stock_quantity: number;
  primary_image_url: string | null;
  colors: string[] | null;
  brand: string | null;
  origin_country: string | null;
  min_quantity: number | null;
  dimensions_display: string | null;
  weight_g: number | null;
  combined_sizes: string | null;
  product_type: string | null;
  is_kit: boolean;
  is_active: boolean;
  is_stockout: boolean;
  allows_personalization: boolean;
  lead_time_days: number | null;
  supply_mode: string | null;
  category_id: string | null;
  supplier_id: string | null;
  slug: string | null;
  capacity_ml: number | null;
  ncm_code: string | null;
  categories: ExternalCategory | null;
  suppliers: ExternalSupplier | null;
  variants?: ExternalProductVariant[];
}

export interface CatalogFilters {
  search?: string;
  category_id?: string;
  supplier_id?: string;
  only_active?: boolean;
  only_in_stock?: boolean;
  limit?: number;
  offset?: number;
  order_by?: string;
  ascending?: boolean;
}

// ─── API invoke ───────────────────────────────────────────────
async function invokeAction<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('promogifts-catalog', {
    body: { action, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ─── Hook ─────────────────────────────────────────────────────
export function useExternalCatalog() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CatalogFilters>({});

  // Products query - uses filters as query key for caching
  const productsQuery = useQuery({
    queryKey: ['external-catalog', 'products', filters],
    queryFn: async () => {
      const result = await invokeAction<{ data: ExternalProduct[]; meta: { total: number; duration_ms: number } }>('list_products', filters as Record<string, unknown>);
      logger.info('Products fetched', { count: result.data?.length, total: result.meta?.total, ms: result.meta?.duration_ms });
      return result;
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Categories (cached aggressively - rarely change)
  const categoriesQuery = useQuery({
    queryKey: ['external-catalog', 'categories'],
    queryFn: async () => {
      const result = await invokeAction<{ data: ExternalCategory[] }>('list_categories');
      return result.data || [];
    },
    enabled: false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Suppliers (cached aggressively)
  const suppliersQuery = useQuery({
    queryKey: ['external-catalog', 'suppliers'],
    queryFn: async () => {
      const result = await invokeAction<{ data: ExternalSupplier[] }>('list_suppliers');
      return result.data || [];
    },
    enabled: false,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const fetchProducts = useCallback(async (newFilters: CatalogFilters = {}) => {
    setFilters(newFilters);
    const result = await queryClient.fetchQuery({
      queryKey: ['external-catalog', 'products', newFilters],
      queryFn: async () => {
        const res = await invokeAction<{ data: ExternalProduct[]; meta: { total: number; duration_ms: number } }>('list_products', newFilters as Record<string, unknown>);
        logger.info('Products fetched', { count: res.data?.length, total: res.meta?.total });
        return res;
      },
      staleTime: 5 * 60 * 1000,
    });
    return result;
  }, [queryClient]);

  const fetchProduct = useCallback(async (productId: string): Promise<ExternalProduct | null> => {
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['external-catalog', 'product', productId],
        queryFn: async () => {
          const res = await invokeAction<{ data: ExternalProduct }>('get_product', { product_id: productId });
          return res.data || null;
        },
        staleTime: 5 * 60 * 1000,
      });
      return result;
    } catch (err) {
      logger.error('Failed to fetch product', err);
      return null;
    }
  }, [queryClient]);

  const fetchCategories = useCallback(async () => {
    await categoriesQuery.refetch();
  }, [categoriesQuery]);

  const fetchSuppliers = useCallback(async () => {
    await suppliersQuery.refetch();
  }, [suppliersQuery]);

  // Read products from cache using current filters state
  const cachedProducts = queryClient.getQueryData<{ data: ExternalProduct[]; meta: { total: number } }>(['external-catalog', 'products', filters]);

  return {
    products: cachedProducts?.data || productsQuery.data?.data || [],
    totalProducts: cachedProducts?.meta?.total ?? productsQuery.data?.meta?.total ?? 0,
    categories: categoriesQuery.data || [],
    suppliers: suppliersQuery.data || [],
    loading: productsQuery.isFetching,
    error: productsQuery.error?.message || null,
    fetchProducts,
    fetchProduct,
    fetchCategories,
    fetchSuppliers,
  };
}
