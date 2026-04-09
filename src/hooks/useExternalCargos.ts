import { useQuery } from '@tanstack/react-query';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { log } from '@/lib/logger';

export function useExternalCargos() {
  return useQuery<string[]>({
    queryKey: ['external-cargos'],
    queryFn: async () => {
      const allCargos: string[] = [];

      // Fetch from contacts.cargo
      const { data: contactsCargos, error: e1 } = await externalSupabase
        .from('contacts')
        .select('cargo')
        .not('cargo', 'is', null)
        .limit(1000);

      if (e1) {
        log.error('Error fetching cargos from contacts:', e1);
      } else {
        (contactsCargos || []).forEach((r: any) => {
          const v = String(r.cargo || '').trim();
          if (v) allCargos.push(v);
        });
      }

      // Fetch from salespeople.role
      const { data: salesRoles, error: e2 } = await externalSupabase
        .from('salespeople')
        .select('role')
        .not('role', 'is', null)
        .limit(500);

      if (e2) {
        log.error('Error fetching roles from salespeople:', e2);
      } else {
        (salesRoles || []).forEach((r: any) => {
          const v = String(r.role || '').trim();
          if (v) allCargos.push(v);
        });
      }

      const unique = [...new Set(allCargos)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return unique;
    },
    enabled: isExternalConfigured,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
