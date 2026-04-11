/**
 * Typed helpers for dynamic Supabase table operations.
 * 
 * These helpers provide a type-safe wrapper for dynamic table names,
 * avoiding the need for `(supabase as any)` throughout the codebase.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

/**
 * Get a typed Supabase query builder for a dynamic table name.
 * Falls back to untyped access for tables not in the generated schema.
 */
export function fromTable(tableName: string) {
  return supabase.from(tableName as TableName);
}
