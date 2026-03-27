import { useState, useCallback, useEffect } from 'react';
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
  cost_price: number;
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

// ─── Hook ─────────────────────────────────────────────────────
export function useExternalCatalog() {
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState<ExternalCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ExternalSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('promogifts-catalog', {
      body: { action, params },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchProducts = useCallback(async (filters: CatalogFilters = {}) => {
    const params = { ...filters } as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('list_products', filters);
      setProducts(result.data || []);
      setTotalProducts(result.meta?.total ?? 0);
      logger.info('Products fetched', { count: result.data?.length, total: result.meta?.total });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar produtos';
      setError(msg);
      logger.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const fetchProduct = useCallback(async (productId: string): Promise<ExternalProduct | null> => {
    try {
      const result = await invoke('get_product', { product_id: productId });
      return result.data || null;
    } catch (err) {
      logger.error('Failed to fetch product', err);
      return null;
    }
  }, [invoke]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await invoke('list_categories');
      setCategories(result.data || []);
    } catch (err) {
      logger.error('Failed to fetch categories', err);
    }
  }, [invoke]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const result = await invoke('list_suppliers');
      setSuppliers(result.data || []);
    } catch (err) {
      logger.error('Failed to fetch suppliers', err);
    }
  }, [invoke]);

  return {
    products,
    totalProducts,
    categories,
    suppliers,
    loading,
    error,
    fetchProducts,
    fetchProduct,
    fetchCategories,
    fetchSuppliers,
  };
}
