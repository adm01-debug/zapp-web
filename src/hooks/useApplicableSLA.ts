import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContactSLAParams {
  contactId?: string;
  company?: string | null;
  jobTitle?: string | null;
  contactType?: string | null;
  queueId?: string | null;
  agentId?: string | null;
}

interface ApplicableSLA {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  ruleName: string;
  ruleId: string | null;
}

export function useApplicableSLA(params: ContactSLAParams) {
  return useQuery({
    queryKey: ['applicable-sla', params],
    queryFn: async (): Promise<ApplicableSLA> => {
      const { data: rules, error } = await supabase
        .from('sla_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Hierarchy: contact > company > job_title > contact_type > queue > agent > global fallback
      for (const rule of rules || []) {
        if (rule.contact_id && rule.contact_id === params.contactId) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }
      for (const rule of rules || []) {
        if (rule.company && rule.company === params.company && !rule.contact_id) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }
      for (const rule of rules || []) {
        if (rule.job_title && rule.job_title === params.jobTitle && !rule.contact_id && !rule.company) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }
      for (const rule of rules || []) {
        if (rule.contact_type && rule.contact_type === params.contactType && !rule.contact_id && !rule.company && !rule.job_title) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }
      for (const rule of rules || []) {
        if (rule.queue_id && rule.queue_id === params.queueId && !rule.contact_id) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }
      for (const rule of rules || []) {
        if (rule.agent_id && rule.agent_id === params.agentId && !rule.contact_id) {
          return { firstResponseMinutes: rule.first_response_minutes, resolutionMinutes: rule.resolution_minutes, ruleName: rule.name, ruleId: rule.id };
        }
      }

      // Global fallback from sla_configurations
      const { data: configs } = await supabase
        .from('sla_configurations')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .limit(1);

      if (configs && configs.length > 0) {
        return {
          firstResponseMinutes: configs[0].first_response_minutes,
          resolutionMinutes: configs[0].resolution_minutes,
          ruleName: configs[0].name,
          ruleId: null,
        };
      }

      return { firstResponseMinutes: 5, resolutionMinutes: 60, ruleName: 'Padrão do Sistema', ruleId: null };
    },
    enabled: !!params.contactId || !!params.company || !!params.queueId || !!params.agentId,
    staleTime: 30000,
  });
}
