import { useQuery } from '@tanstack/react-query';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { log } from '@/lib/logger';

export function useExternalEmpresas() {
  return useQuery<string[]>({
    queryKey: ['external-empresas'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('companies')
        .select('nome_fantasia')
        .not('nome_fantasia', 'is', null)
        .order('nome_fantasia', { ascending: true })
        .limit(1000);

      if (error) {
        log.error('Error fetching empresas from external DB:', error);
        return [];
      }

      const unique = [...new Set(
        (data || [])
          .map((r: any) => String(r.nome_fantasia || '').trim())
          .filter(Boolean)
      )];

      return unique;
    },
    enabled: isExternalConfigured,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
