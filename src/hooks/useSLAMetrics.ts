import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { log } from '@/lib/logger';

export type PeriodFilter = 'today' | 'week' | 'month' | 'all';

interface SLAMetric {
  total: number;
  onTime: number;
  breached: number;
  rate: number;
}

interface AgentSLAMetric {
  agentId: string;
  agentName: string;
  avatarUrl?: string;
  firstResponse: SLAMetric;
  resolution: SLAMetric;
  overallRate: number;
}

interface SLADashboardData {
  overall: {
    firstResponse: SLAMetric;
    resolution: SLAMetric;
    totalConversations: number;
    overallRate: number;
  };
  byAgent: AgentSLAMetric[];
}

export const useSLAMetrics = (period: PeriodFilter = 'today') => {
  const [data, setData] = useState<SLADashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return startOfWeek(now, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(now);
      case 'all':
        return subDays(now, 365);
      default:
        return startOfDay(now);
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const startDate = getDateRange().toISOString();

        // Fetch conversation SLA data
        const { data: slaData, error: slaError } = await supabase
          .from('conversation_sla')
          .select(`
            *,
            contacts!inner(
              assigned_to
            )
          `)
          .gte('created_at', startDate);

        if (slaError) throw slaError;

        // Fetch agent profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url');

        if (profilesError) throw profilesError;

        // Calculate overall metrics
        const totalConversations = slaData?.length || 0;
        
        const firstResponseOnTime = slaData?.filter(s => s.first_response_at && !s.first_response_breached).length || 0;
        const firstResponseBreached = slaData?.filter(s => s.first_response_breached).length || 0;
        const firstResponseTotal = firstResponseOnTime + firstResponseBreached;
        
        const resolutionOnTime = slaData?.filter(s => s.resolved_at && !s.resolution_breached).length || 0;
        const resolutionBreached = slaData?.filter(s => s.resolution_breached).length || 0;
        const resolutionTotal = resolutionOnTime + resolutionBreached;

        const overall = {
          firstResponse: {
            total: firstResponseTotal,
            onTime: firstResponseOnTime,
            breached: firstResponseBreached,
            rate: firstResponseTotal > 0 ? (firstResponseOnTime / firstResponseTotal) * 100 : 100
          },
          resolution: {
            total: resolutionTotal,
            onTime: resolutionOnTime,
            breached: resolutionBreached,
            rate: resolutionTotal > 0 ? (resolutionOnTime / resolutionTotal) * 100 : 100
          },
          totalConversations,
          overallRate: totalConversations > 0 
            ? ((firstResponseOnTime + resolutionOnTime) / (firstResponseTotal + resolutionTotal || 1)) * 100 
            : 100
        };

        // Calculate by agent
        const agentMap = new Map<string, {
          firstResponseOnTime: number;
          firstResponseBreached: number;
          resolutionOnTime: number;
          resolutionBreached: number;
        }>();

        slaData?.forEach(sla => {
          const agentId = sla.contacts?.assigned_to;
          if (!agentId) return;

          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              firstResponseOnTime: 0,
              firstResponseBreached: 0,
              resolutionOnTime: 0,
              resolutionBreached: 0
            });
          }

          const agent = agentMap.get(agentId)!;
          
          if (sla.first_response_at && !sla.first_response_breached) {
            agent.firstResponseOnTime++;
          }
          if (sla.first_response_breached) {
            agent.firstResponseBreached++;
          }
          if (sla.resolved_at && !sla.resolution_breached) {
            agent.resolutionOnTime++;
          }
          if (sla.resolution_breached) {
            agent.resolutionBreached++;
          }
        });

        const byAgent: AgentSLAMetric[] = Array.from(agentMap.entries()).map(([agentId, stats]) => {
          const profile = profiles?.find(p => p.id === agentId);
          const frTotal = stats.firstResponseOnTime + stats.firstResponseBreached;
          const resTotal = stats.resolutionOnTime + stats.resolutionBreached;
          
          return {
            agentId,
            agentName: profile?.name || 'Agente',
            avatarUrl: profile?.avatar_url || undefined,
            firstResponse: {
              total: frTotal,
              onTime: stats.firstResponseOnTime,
              breached: stats.firstResponseBreached,
              rate: frTotal > 0 ? (stats.firstResponseOnTime / frTotal) * 100 : 100
            },
            resolution: {
              total: resTotal,
              onTime: stats.resolutionOnTime,
              breached: stats.resolutionBreached,
              rate: resTotal > 0 ? (stats.resolutionOnTime / resTotal) * 100 : 100
            },
            overallRate: (frTotal + resTotal) > 0 
              ? ((stats.firstResponseOnTime + stats.resolutionOnTime) / (frTotal + resTotal)) * 100 
              : 100
          };
        }).sort((a, b) => b.overallRate - a.overallRate);

        setData({ overall, byAgent });
      } catch (error) {
        log.error('Error fetching SLA metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [period]);

  return { data, loading };
};
