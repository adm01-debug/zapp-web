import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type HistoryPeriod = '7d' | '14d' | '30d' | '90d';

interface DailyViolation {
  date: string;
  dateLabel: string;
  firstResponseBreaches: number;
  resolutionBreaches: number;
  totalBreaches: number;
  totalConversations: number;
  slaRate: number;
}

interface ViolationTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

interface SLAHistoryData {
  dailyData: DailyViolation[];
  totals: {
    firstResponseBreaches: number;
    resolutionBreaches: number;
    totalBreaches: number;
    totalConversations: number;
    overallSLARate: number;
  };
  trends: {
    firstResponse: ViolationTrend;
    resolution: ViolationTrend;
    overall: ViolationTrend;
  };
  worstDays: DailyViolation[];
  bestDays: DailyViolation[];
}

export const useSLAHistory = (period: HistoryPeriod = '30d') => {
  const [data, setData] = useState<SLAHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  const getPeriodDays = useCallback((): number => {
    switch (period) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  }, [period]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const days = getPeriodDays();
        const startDate = startOfDay(subDays(new Date(), days));
        
        const { data: slaRecords, error } = await supabase
          .from('conversation_sla')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true })
          .limit(5000);

        if (error) throw error;

        // Generate all days in range
        const allDays = eachDayOfInterval({
          start: startDate,
          end: new Date()
        });

        // Group by day
        const dailyMap = new Map<string, DailyViolation>();
        
        allDays.forEach(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          dailyMap.set(dateKey, {
            date: dateKey,
            dateLabel: format(day, 'dd MMM', { locale: ptBR }),
            firstResponseBreaches: 0,
            resolutionBreaches: 0,
            totalBreaches: 0,
            totalConversations: 0,
            slaRate: 100
          });
        });

        // Populate with actual data
        slaRecords?.forEach(record => {
          const dateKey = format(new Date(record.created_at), 'yyyy-MM-dd');
          const dayData = dailyMap.get(dateKey);
          
          if (dayData) {
            dayData.totalConversations++;
            if (record.first_response_breached) {
              dayData.firstResponseBreaches++;
              dayData.totalBreaches++;
            }
            if (record.resolution_breached) {
              dayData.resolutionBreaches++;
              dayData.totalBreaches++;
            }
          }
        });

        // Calculate SLA rates
        dailyMap.forEach(day => {
          if (day.totalConversations > 0) {
            const successCount = (day.totalConversations * 2) - day.totalBreaches;
            day.slaRate = (successCount / (day.totalConversations * 2)) * 100;
          }
        });

        const dailyData = Array.from(dailyMap.values());

        // Calculate totals
        const totals = dailyData.reduce((acc, day) => ({
          firstResponseBreaches: acc.firstResponseBreaches + day.firstResponseBreaches,
          resolutionBreaches: acc.resolutionBreaches + day.resolutionBreaches,
          totalBreaches: acc.totalBreaches + day.totalBreaches,
          totalConversations: acc.totalConversations + day.totalConversations,
          overallSLARate: 0
        }), {
          firstResponseBreaches: 0,
          resolutionBreaches: 0,
          totalBreaches: 0,
          totalConversations: 0,
          overallSLARate: 0
        });

        if (totals.totalConversations > 0) {
          const successCount = (totals.totalConversations * 2) - totals.totalBreaches;
          totals.overallSLARate = (successCount / (totals.totalConversations * 2)) * 100;
        } else {
          totals.overallSLARate = 100;
        }

        // Calculate trends (compare first half vs second half)
        const midpoint = Math.floor(dailyData.length / 2);
        const firstHalf = dailyData.slice(0, midpoint);
        const secondHalf = dailyData.slice(midpoint);

        const calcTrend = (getVal: (d: DailyViolation) => number): ViolationTrend => {
          const firstAvg = firstHalf.reduce((sum, d) => sum + getVal(d), 0) / (firstHalf.length || 1);
          const secondAvg = secondHalf.reduce((sum, d) => sum + getVal(d), 0) / (secondHalf.length || 1);
          
          if (firstAvg === 0 && secondAvg === 0) return { direction: 'stable', percentage: 0 };
          if (firstAvg === 0) return { direction: 'up', percentage: 100 };
          
          const change = ((secondAvg - firstAvg) / firstAvg) * 100;
          return {
            direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            percentage: Math.abs(change)
          };
        };

        const trends = {
          firstResponse: calcTrend(d => d.firstResponseBreaches),
          resolution: calcTrend(d => d.resolutionBreaches),
          overall: calcTrend(d => d.slaRate)
        };

        // Worst and best days (with conversations)
        const daysWithConversations = dailyData.filter(d => d.totalConversations > 0);
        const worstDays = [...daysWithConversations]
          .sort((a, b) => a.slaRate - b.slaRate)
          .slice(0, 5);
        const bestDays = [...daysWithConversations]
          .sort((a, b) => b.slaRate - a.slaRate)
          .slice(0, 5);

        setData({
          dailyData,
          totals,
          trends,
          worstDays,
          bestDays
        });
      } catch (error) {
        log.error('Error fetching SLA history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [period, getPeriodDays]);

  return { data, loading };
};
