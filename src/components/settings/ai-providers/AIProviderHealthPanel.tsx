import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Zap, TrendingUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UsageLog {
  id: string;
  function_name: string;
  model: string | null;
  status: string;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-primary';
    case 'fallback': return 'text-accent-foreground';
    case 'error': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

function getHealthColor(good: boolean, warn: boolean): string {
  if (good) return 'text-primary';
  if (warn) return 'text-accent-foreground';
  return 'text-destructive';
}

export function AIProviderHealthPanel() {
  const { data: recentLogs = [], isLoading } = useQuery({
    queryKey: ['ai-provider-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('function_name', 'ai-proxy')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as UsageLog[];
    },
    refetchInterval: 30000,
  });

  const stats = {
    total: recentLogs.length,
    success: recentLogs.filter(l => l.status === 'success').length,
    fallback: recentLogs.filter(l => l.status === 'fallback').length,
    error: recentLogs.filter(l => l.status === 'error').length,
    avgLatency: recentLogs.length > 0
      ? Math.round(recentLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / recentLogs.length)
      : 0,
    totalTokens: recentLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0),
  };

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100;

  const kpis = [
    {
      label: 'Taxa de Sucesso',
      value: `${successRate}%`,
      icon: successRate >= 95 ? CheckCircle : successRate >= 80 ? AlertTriangle : XCircle,
      color: getHealthColor(successRate >= 95, successRate >= 80),
    },
    {
      label: 'Latência Média',
      value: `${stats.avgLatency}ms`,
      icon: Clock,
      color: getHealthColor(stats.avgLatency < 2000, stats.avgLatency < 5000),
    },
    {
      label: 'Fallbacks',
      value: String(stats.fallback),
      icon: AlertTriangle,
      color: getHealthColor(stats.fallback === 0, true),
    },
    {
      label: 'Tokens Usados',
      value: stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : String(stats.totalTokens),
      icon: Zap,
      color: 'text-primary',
    },
  ];

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-primary" />
          Saúde dos Provedores
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            Últimas {stats.total} chamadas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 p-3 bg-card"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={cn('w-3.5 h-3.5', kpi.color)} />
                <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent calls log */}
        {recentLogs.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Chamadas Recentes
            </p>
            {recentLogs.slice(0, 10).map(log => {
              const providerType = (log.metadata as Record<string, unknown>)?.provider_type as string || 'lovable_ai';
              const isFallback = log.status === 'fallback';
              const statusColor = getStatusColor(log.status);
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {log.status === 'success' ? (
                    <CheckCircle className={cn('w-3 h-3 shrink-0', statusColor)} />
                  ) : log.status === 'fallback' ? (
                    <AlertTriangle className={cn('w-3 h-3 shrink-0', statusColor)} />
                  ) : (
                    <XCircle className="w-3 h-3 text-destructive shrink-0" />
                  )}
                  <span className="text-muted-foreground truncate flex-1">
                    {providerType}{isFallback && ' → fallback'}
                  </span>
                  {log.model && (
                    <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                      {log.model}
                    </span>
                  )}
                  <span className="text-muted-foreground/60 shrink-0">
                    {log.duration_ms}ms
                  </span>
                  <span className="text-muted-foreground/40 shrink-0">
                    {format(new Date(log.created_at), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Radio className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              As métricas aparecerão aqui quando o proxy de IA for utilizado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
