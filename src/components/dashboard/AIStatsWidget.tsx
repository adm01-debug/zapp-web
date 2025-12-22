import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from '@/components/ui/motion';
import { Brain, TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, Mic, Calendar, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

type PeriodOption = 7 | 14 | 30;
type SentimentType = 'positive' | 'negative' | 'neutral';

const periodLabels: Record<PeriodOption, string> = {
  7: '7 dias',
  14: '14 dias',
  30: '30 dias',
};

const sentimentTypeLabels: Record<SentimentType, { label: string; color: string }> = {
  positive: { label: 'Positivo', color: 'bg-success' },
  negative: { label: 'Negativo', color: 'bg-destructive' },
  neutral: { label: 'Neutro', color: 'bg-muted-foreground' },
};

interface TrendData {
  direction: 'up' | 'down' | 'stable';
  change: number;
  percentage: number;
}

interface SentimentAlert {
  id: string;
  contactId: string | null;
  createdAt: string;
  contact_name?: string;
  sentiment_score?: number;
  consecutive_low?: number;
}

interface AIStats {
  totalAnalyses: number;
  avgSentimentScore: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
  transcriptionsCount: number;
  activeAlerts: SentimentAlert[];
  sentimentTrend: { date: string; score: number; positive: number; negative: number; neutral: number }[];
  trends: {
    analyses: TrendData;
    sentiment: TrendData;
    negative: TrendData;
    transcriptions: TrendData;
  };
}

const TrendIndicator = ({ trend, label, periodDays }: { trend: TrendData; label: string; periodDays: number }) => {
  const isSignificant = Math.abs(trend.percentage) > 20;
  
  const getTooltipMessage = () => {
    if (trend.direction === 'stable') {
      return `${label} manteve-se estável nos últimos ${periodDays} dias comparado ao período anterior`;
    }
    
    const direction = trend.direction === 'up' ? 'aumentou' : 'diminuiu';
    const absChange = Math.abs(trend.change);
    const absPercentage = Math.abs(trend.percentage).toFixed(1);
    const significantText = isSignificant ? ' (mudança significativa!)' : '';
    
    return `${label} ${direction} ${absPercentage}% (${absChange > 0 ? (trend.direction === 'up' ? '+' : '-') + absChange : 0}) nos últimos ${periodDays} dias comparado ao período anterior (${periodDays}-${periodDays * 2} dias atrás)${significantText}`;
  };

  if (trend.direction === 'stable') {
    return (
      <TooltipProvider>
        <TooltipUI>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-0.5 text-muted-foreground cursor-help">
              <Minus className="w-3 h-3" />
              <span className="text-[10px]">0%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            <p>{getTooltipMessage()}</p>
          </TooltipContent>
        </TooltipUI>
      </TooltipProvider>
    );
  }

  const isUp = trend.direction === 'up';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const colorClass = isUp ? 'text-success' : 'text-destructive';
  const pulseClass = isSignificant ? 'animate-pulse' : '';

  return (
    <TooltipProvider>
      <TooltipUI>
        <TooltipTrigger asChild>
          <motion.div 
            className={cn("flex items-center gap-0.5 cursor-help", colorClass, pulseClass)}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className={cn("w-3 h-3", isSignificant && "drop-shadow-[0_0_3px_currentColor]")} />
            <span className={cn("text-[10px] font-medium", isSignificant && "font-bold")}>
              {isUp ? '+' : ''}{trend.percentage.toFixed(0)}%
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p>{getTooltipMessage()}</p>
        </TooltipContent>
      </TooltipUI>
    </TooltipProvider>
  );
};

const chartConfig = {
  score: {
    label: 'Sentimento',
    color: 'hsl(var(--primary))',
  },
  positive: {
    label: 'Positivo',
    color: 'hsl(var(--success))',
  },
  negative: {
    label: 'Negativo',
    color: 'hsl(var(--destructive))',
  },
};

const calculateTrend = (current: number, previous: number): TrendData => {
  if (previous === 0 && current === 0) {
    return { direction: 'stable', change: 0, percentage: 0 };
  }
  if (previous === 0) {
    return { direction: 'up', change: current, percentage: 100 };
  }
  
  const change = current - previous;
  const percentage = (change / previous) * 100;
  
  if (Math.abs(percentage) < 1) {
    return { direction: 'stable', change: 0, percentage: 0 };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    change,
    percentage,
  };
};

export function AIStatsWidget() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(7);
  const [visibleSentiments, setVisibleSentiments] = useState<Set<SentimentType>>(
    new Set(['positive', 'negative', 'neutral'])
  );

  const toggleSentiment = (sentiment: SentimentType) => {
    setVisibleSentiments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sentiment)) {
        if (newSet.size > 1) {
          newSet.delete(sentiment);
        }
      } else {
        newSet.add(sentiment);
      }
      return newSet;
    });
  };
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['ai-stats-widget', selectedPeriod],
    queryFn: async (): Promise<AIStats> => {
      const now = new Date();
      const periodStart = subDays(now, selectedPeriod);
      const previousPeriodStart = subDays(now, selectedPeriod * 2);
      
      // Current period
      const { data: currentAnalyses, error } = await supabase
        .from('conversation_analyses')
        .select('sentiment, sentiment_score, created_at')
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Previous period
      const { data: previousAnalyses } = await supabase
        .from('conversation_analyses')
        .select('sentiment, sentiment_score, created_at')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', periodStart.toISOString());

      // Current period stats
      const totalAnalyses = currentAnalyses?.length || 0;
      const avgSentimentScore = currentAnalyses?.reduce((acc, a) => acc + (a.sentiment_score || 0), 0) / (totalAnalyses || 1);
      const positiveSentiment = currentAnalyses?.filter(a => a.sentiment === 'positive').length || 0;
      const negativeSentiment = currentAnalyses?.filter(a => a.sentiment === 'negative').length || 0;
      const neutralSentiment = currentAnalyses?.filter(a => a.sentiment === 'neutral').length || 0;

      // Previous period stats
      const prevTotal = previousAnalyses?.length || 0;
      const prevAvgSentiment = previousAnalyses?.reduce((acc, a) => acc + (a.sentiment_score || 0), 0) / (prevTotal || 1);
      const prevNegative = previousAnalyses?.filter(a => a.sentiment === 'negative').length || 0;

      // Group by date for trend chart
      const trendMap = new Map<string, { scores: number[]; positive: number; negative: number; neutral: number }>();
      
      // Initialize days based on selected period
      for (let i = selectedPeriod - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        trendMap.set(date, { scores: [], positive: 0, negative: 0, neutral: 0 });
      }
      
      currentAnalyses?.forEach(a => {
        const date = format(new Date(a.created_at), 'yyyy-MM-dd');
        const existing = trendMap.get(date) || { scores: [], positive: 0, negative: 0, neutral: 0 };
        existing.scores.push(a.sentiment_score || 50);
        if (a.sentiment === 'positive') existing.positive++;
        else if (a.sentiment === 'negative') existing.negative++;
        else existing.neutral++;
        trendMap.set(date, existing);
      });

      const sentimentTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM', { locale: ptBR }),
        score: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 50,
        positive: data.positive,
        negative: data.negative,
        neutral: data.neutral,
      }));

      // Count messages with transcriptions - current period
      const { count: currentTranscriptions } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .not('transcription', 'is', null)
        .gte('created_at', periodStart.toISOString());

      // Previous period transcriptions
      const { count: prevTranscriptions } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .not('transcription', 'is', null)
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', periodStart.toISOString());

      // Fetch recent sentiment alerts (last 24 hours)
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: alertData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'sentiment_alert')
        .gte('created_at', last24h)
        .order('created_at', { ascending: false })
        .limit(5);

      const activeAlerts: SentimentAlert[] = (alertData || []).map(log => ({
        id: log.id,
        contactId: log.entity_id,
        createdAt: log.created_at,
        ...((log.details || {}) as Record<string, unknown>),
      }));

      return {
        totalAnalyses,
        avgSentimentScore: Math.round(avgSentimentScore * 100) / 100,
        positiveSentiment,
        negativeSentiment,
        neutralSentiment,
        transcriptionsCount: currentTranscriptions || 0,
        activeAlerts,
        sentimentTrend,
        trends: {
          analyses: calculateTrend(totalAnalyses, prevTotal),
          sentiment: calculateTrend(avgSentimentScore, prevAvgSentiment),
          negative: calculateTrend(negativeSentiment, prevNegative),
          transcriptions: calculateTrend(currentTranscriptions || 0, prevTranscriptions || 0),
        },
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="border-secondary/20 bg-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Análises de IA',
      value: stats?.totalAnalyses || 0,
      icon: Brain,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: stats?.trends.analyses,
    },
    {
      label: 'Sentimento Médio',
      value: `${((stats?.avgSentimentScore || 0) * 100).toFixed(0)}%`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: stats?.trends.sentiment,
    },
    {
      label: 'Alertas Negativos',
      value: stats?.negativeSentiment || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      trend: stats?.trends.negative,
    },
    {
      label: 'Transcrições',
      value: stats?.transcriptionsCount || 0,
      icon: Mic,
      color: 'text-info',
      bgColor: 'bg-info/10',
      trend: stats?.trends.transcriptions,
    },
  ];

  const sentimentData = [
    { label: 'Positivo', value: stats?.positiveSentiment || 0, color: 'bg-success' },
    { label: 'Neutro', value: stats?.neutralSentiment || 0, color: 'bg-muted-foreground' },
    { label: 'Negativo', value: stats?.negativeSentiment || 0, color: 'bg-destructive' },
  ];

  const total = sentimentData.reduce((acc, s) => acc + s.value, 0) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Card 
        className="border-secondary/20 overflow-hidden bg-card hover:border-secondary/40 transition-all duration-300 cursor-pointer group"
        onClick={() => {
          const tabsList = document.querySelector('[value="ai"]');
          if (tabsList) {
            (tabsList as HTMLElement).click();
          }
        }}
      >
        <CardHeader className="border-b border-secondary/20 bg-secondary/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <Brain className="w-5 h-5 text-primary" />
              </motion.div>
              <CardTitle className="font-display text-lg text-foreground">Inteligência Artificial</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {periodLabels[selectedPeriod]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {([7, 14, 30] as PeriodOption[]).map((period) => (
                    <DropdownMenuItem
                      key={period}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPeriod(period);
                      }}
                      className={cn(selectedPeriod === period && "bg-accent")}
                    >
                      {periodLabels[period]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <motion.div
                className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors"
                whileHover={{ x: 3 }}
              >
                <Sparkles className="w-3 h-3" />
                <span>Ver mais</span>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="p-3 rounded-xl bg-muted/30 border border-border/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", metric.bgColor)}>
                    <metric.icon className={cn("w-4 h-4", metric.color)} />
                  </div>
                  {metric.trend && <TrendIndicator trend={metric.trend} label={metric.label} periodDays={selectedPeriod} />}
                </div>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Active Alerts Indicator */}
          {stats?.activeAlerts && stats.activeAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bell className="w-4 h-4 text-destructive" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  </div>
                  <span className="text-sm font-medium text-destructive">
                    {stats.activeAlerts.length} Alerta{stats.activeAlerts.length > 1 ? 's' : ''} Ativo{stats.activeAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">Últimas 24h</span>
              </div>
              <div className="space-y-1">
                {stats.activeAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate max-w-[150px]">
                      {alert.contact_name || 'Cliente'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive font-medium">
                        {alert.sentiment_score || 0}%
                      </span>
                      {alert.consecutive_low && (
                        <span className="text-muted-foreground">
                          ({alert.consecutive_low}x)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {stats.activeAlerts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{stats.activeAlerts.length - 3} mais alertas
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Sentiment Distribution Bar */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Distribuição de Sentimento</p>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              {sentimentData.map((s, i) => (
                <motion.div
                  key={s.label}
                  className={cn("h-full", s.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {sentimentData.map((s) => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", s.color)} />
                  <span>{s.label}: {s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment Trend Chart */}
          {stats?.sentimentTrend && stats.sentimentTrend.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Evolução do Sentimento ({periodLabels[selectedPeriod]})</p>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {(['positive', 'negative', 'neutral'] as SentimentType[]).map((sentiment) => (
                    <label
                      key={sentiment}
                      className="flex items-center gap-1.5 cursor-pointer text-[10px]"
                    >
                      <Checkbox
                        checked={visibleSentiments.has(sentiment)}
                        onCheckedChange={() => toggleSentiment(sentiment)}
                        className="w-3 h-3"
                      />
                      <div className={cn("w-2 h-2 rounded-full", sentimentTypeLabels[sentiment].color)} />
                      <span className="text-muted-foreground">{sentimentTypeLabels[sentiment].label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <ChartContainer config={chartConfig} className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.sentimentTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="neutralGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    {visibleSentiments.has('positive') && (
                      <Area
                        type="monotone"
                        dataKey="positive"
                        name="Positivo"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        fill="url(#positiveGradient)"
                      />
                    )}
                    {visibleSentiments.has('negative') && (
                      <Area
                        type="monotone"
                        dataKey="negative"
                        name="Negativo"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        fill="url(#negativeGradient)"
                      />
                    )}
                    {visibleSentiments.has('neutral') && (
                      <Area
                        type="monotone"
                        dataKey="neutral"
                        name="Neutro"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        fill="url(#neutralGradient)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
