import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  is_enabled: boolean;
  target_percentage: number;
  target_organizations: string[];
  metadata: Record<string, unknown>;
}

/**
 * Hook to check feature flags from the database.
 * Caches flags for 5 minutes to avoid excessive DB calls.
 */
export function useFeatureFlags() {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags' as string)
        .select('*')
        .eq('is_enabled', true);

      if (error) {
        console.warn('Failed to load feature flags:', error.message);
        return [] as FeatureFlag[];
      }

      return (data || []) as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
    retry: 1,
  });

  const isEnabled = (key: string): boolean => {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return false;
    return flag.is_enabled;
  };

  const getFlag = (key: string): FeatureFlag | undefined => {
    return flags.find((f) => f.key === key);
  };

  return {
    flags,
    isLoading,
    isEnabled,
    getFlag,
  };
}

/**
 * Known feature flag keys for type-safe access.
 */
export const FEATURE_FLAGS = {
  CAMPAIGN_EXECUTION: 'campaign_execution',
  AUTO_CLOSE_CONVERSATIONS: 'auto_close_conversations',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AI_SUGGESTIONS: 'ai_suggestions',
} as const;
