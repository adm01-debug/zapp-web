import { useQuery } from '@tanstack/react-query';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { log } from '@/lib/logger';

export function useExternalCargos() {
  return useQuery<string[]>({
    queryKey: ['external-cargos'],
    queryFn: async () => {
      // Try fetching from contacts table first, then fallback
      const { data, error } = await externalSupabase
        .from('contacts')
        .select('cargo')
        .not('cargo', 'is', null)
        .limit(1000);

      if (error) {
        log.error('Error fetching cargos from external DB:', error);
        return [];
      }

      const unique = [...new Set(
        (data || [])
          .map((r: any) => String(r.cargo).trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

      return unique;
    },
    enabled: isExternalConfigured,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
