import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from '@/components/ui/motion';
import { Brain, TrendingUp, Sparkles, AlertTriangle, Mic } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface AIStats {
  totalAnalyses: number;
  avgSentimentScore: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
  transcriptionsCount: number;
  sentimentTrend: { date: string; score: number; positive: number; negative: number; neutral: number }[];
}

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

export function AIStatsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['ai-stats-widget'],
    queryFn: async (): Promise<AIStats> => {
      // Get last 7 days of analyses for trend
      const last7Days = subDays(new Date(), 7);
      
      const { data: analyses, error } = await supabase
        .from('conversation_analyses')
        .select('sentiment, sentiment_score, created_at')
        .gte('created_at', last7Days.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const totalAnalyses = analyses?.length || 0;
      const avgSentimentScore = analyses?.reduce((acc, a) => acc + (a.sentiment_score || 0), 0) / (totalAnalyses || 1);
      const positiveSentiment = analyses?.filter(a => a.sentiment === 'positive').length || 0;
      const negativeSentiment = analyses?.filter(a => a.sentiment === 'negative').length || 0;
      const neutralSentiment = analyses?.filter(a => a.sentiment === 'neutral').length || 0;

      // Group by date for trend chart
      const trendMap = new Map<string, { scores: number[]; positive: number; negative: number; neutral: number }>();
      
      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        trendMap.set(date, { scores: [], positive: 0, negative: 0, neutral: 0 });
      }
      
      analyses?.forEach(a => {
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

      // Count messages with transcriptions
      const { count: transcriptionsCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .not('transcription', 'is', null);

      return {
        totalAnalyses,
        avgSentimentScore: Math.round(avgSentimentScore * 100) / 100,
        positiveSentiment,
        negativeSentiment,
        neutralSentiment,
        transcriptionsCount: transcriptionsCount || 0,
        sentimentTrend,
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
    },
    {
      label: 'Sentimento Médio',
      value: `${((stats?.avgSentimentScore || 0) * 100).toFixed(0)}%`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Alertas Negativos',
      value: stats?.negativeSentiment || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Transcrições',
      value: stats?.transcriptionsCount || 0,
      icon: Mic,
      color: 'text-info',
      bgColor: 'bg-info/10',
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
            <motion.div
              className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors"
              whileHover={{ x: 3 }}
            >
              <Sparkles className="w-3 h-3" />
              <span>Ver mais</span>
            </motion.div>
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
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", metric.bgColor)}>
                    <metric.icon className={cn("w-4 h-4", metric.color)} />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </motion.div>
            ))}
          </div>

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
              <p className="text-xs text-muted-foreground font-medium">Evolução do Sentimento (7 dias)</p>
              <ChartContainer config={chartConfig} className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.sentimentTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Sentimento"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#sentimentGradient)"
                    />
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
