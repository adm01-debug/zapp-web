import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Users, Zap, Clock, Download, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subHours, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type TimeFilter = '1h' | '6h' | '24h' | '7d' | '30d';

interface UsageLog {
  id: string;
  user_id: string | null;
  profile_id: string | null;
  function_name: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  duration_ms: number | null;
  status: string;
  created_at: string;
}

interface ProfileInfo {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const FUNCTION_COLORS: Record<string, string> = {
  'ai-suggest-reply': '#3b82f6',
  'ai-enhance-message': '#8b5cf6',
  'ai-conversation-analysis': '#f59e0b',
  'ai-conversation-summary': '#10b981',
  'ai-auto-tag': '#ef4444',
  'chatbot-l1': '#06b6d4',
};

const FUNCTION_LABELS: Record<string, string> = {
  'ai-suggest-reply': 'Sugestão de Resposta',
  'ai-enhance-message': 'Reescrita de Mensagem',
  'ai-conversation-analysis': 'Análise de Conversa',
  'ai-conversation-summary': 'Resumo de Conversa',
  'ai-auto-tag': 'Auto-Tag',
  'chatbot-l1': 'Chatbot L1',
};

function getTimeRange(filter: TimeFilter): Date {
  switch (filter) {
    case '1h': return subHours(new Date(), 1);
    case '6h': return subHours(new Date(), 6);
    case '24h': return subDays(new Date(), 1);
    case '7d': return subDays(new Date(), 7);
    case '30d': return subDays(new Date(), 30);
  }
}

export function AIUsageDashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['ai-usage-logs', timeFilter],
    queryFn: async () => {
      const since = getTimeRange(timeFilter).toISOString();
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as UsageLog[];
    },
    refetchInterval: 30_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-usage'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, avatar_url');
      return (data || []) as ProfileInfo[];
    },
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileInfo>();
    profiles.forEach(p => {
      if (p.user_id) map.set(p.user_id, p);
      map.set(p.id, p);
    });
    return map;
  }, [profiles]);

  const stats = useMemo(() => {
    const totalCalls = logs.length;
    const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const avgDuration = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.length)
      : 0;
    const errorCount = logs.filter(l => l.status === 'error').length;
    const uniqueUsers = new Set(logs.map(l => l.user_id).filter(Boolean)).size;
    return { totalCalls, totalTokens, avgDuration, errorCount, uniqueUsers };
  }, [logs]);

  // Usage by user
  const userUsage = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; userId: string }>();
    logs.forEach(l => {
      const uid = l.user_id || 'unknown';
      const existing = map.get(uid) || { calls: 0, tokens: 0, userId: uid };
      existing.calls++;
      existing.tokens += l.total_tokens || 0;
      map.set(uid, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 20);
  }, [logs]);

  // Usage by function
  const functionUsage = useMemo(() => {
    const map = new Map<string, { calls: number; tokens: number; name: string }>();
    logs.forEach(l => {
      const existing = map.get(l.function_name) || { calls: 0, tokens: 0, name: l.function_name };
      existing.calls++;
      existing.tokens += l.total_tokens || 0;
      map.set(l.function_name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.tokens - a.tokens);
  }, [logs]);

  // Timeline data
  const timelineData = useMemo(() => {
    const buckets = new Map<string, Record<string, string | number>>();
    const bucketSize = timeFilter === '1h' ? 5 : timeFilter === '6h' ? 30 : timeFilter === '24h' ? 60 : 360;
    
    logs.forEach(l => {
      const date = new Date(l.created_at);
      const bucketTime = new Date(Math.floor(date.getTime() / (bucketSize * 60000)) * bucketSize * 60000);
      const key = bucketTime.toISOString();
      const bucket = buckets.get(key) || { time: key };
      bucket[l.function_name] = ((bucket[l.function_name] as number) || 0) + 1;
      buckets.set(key, bucket);
    });

    return Array.from(buckets.values())
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .map(b => ({
        ...b,
        time: format(new Date(String(b.time)), timeFilter === '1h' || timeFilter === '6h' ? 'HH:mm' : 'dd/MM HH:mm', { locale: ptBR }),
      }));
  }, [logs, timeFilter]);

  const handleExportCSV = () => {
    if (logs.length === 0) { toast.warning('Nenhum dado para exportar'); return; }
    const headers = ['Data', 'Usuário', 'Função', 'Modelo', 'Tokens Entrada', 'Tokens Saída', 'Total Tokens', 'Duração (ms)', 'Status'];
    const rows = logs.map(l => {
      const profile = l.user_id ? profileMap.get(l.user_id) : null;
      return [
        format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss'),
        profile?.name || profile?.email || l.user_id || '-',
        FUNCTION_LABELS[l.function_name] || l.function_name,
        l.model || '-',
        l.input_tokens, l.output_tokens, l.total_tokens,
        l.duration_ms || '-', l.status,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consumo-ia-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  const functionNames = Object.keys(FUNCTION_COLORS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Consumo de IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de uso das funções de inteligência artificial por usuário
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última 1h</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Zap className="w-3.5 h-3.5" /> Chamadas
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCalls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Tokens Total
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Users className="w-3.5 h-3.5" /> Usuários Ativos
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Clock className="w-3.5 h-3.5" /> Tempo Médio
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.avgDuration}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              ❌ Erros
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats.errorCount}
              {stats.totalCalls > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({((stats.errorCount / stats.totalCalls) * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Por Usuário</TabsTrigger>
          <TabsTrigger value="logs">Logs Detalhados</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Timeline Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Chamadas ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" fontSize={11} className="fill-muted-foreground" />
                      <YAxis fontSize={11} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                      {functionNames.map(fn => (
                        <Area key={fn} type="monotone" dataKey={fn} stackId="1" fill={FUNCTION_COLORS[fn]} stroke={FUNCTION_COLORS[fn]} fillOpacity={0.6} name={FUNCTION_LABELS[fn] || fn} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado no período selecionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Function Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição por Função</CardTitle>
              </CardHeader>
              <CardContent>
                {functionUsage.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={functionUsage} dataKey="tokens" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                          {functionUsage.map((entry) => (
                            <Cell key={entry.name} fill={FUNCTION_COLORS[entry.name] || '#666'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => v.toLocaleString() + ' tokens'} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {functionUsage.map(f => (
                        <div key={f.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FUNCTION_COLORS[f.name] || '#666' }} />
                            <span className="text-muted-foreground">{FUNCTION_LABELS[f.name] || f.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{f.calls}x</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ranking de Consumo por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              {userUsage.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userUsage.slice(0, 10).map(u => {
                      const profile = profileMap.get(u.userId);
                      return { ...u, name: profile?.name || profile?.email || u.userId.slice(0, 8) };
                    })} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={11} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} className="fill-muted-foreground" />
                      <Tooltip formatter={(v: number) => v.toLocaleString() + ' tokens'} contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                      <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Tokens" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Usuário</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Chamadas</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tokens</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Média/Chamada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userUsage.map((u, i) => {
                          const profile = profileMap.get(u.userId);
                          return (
                            <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2">
                                <span className="font-medium text-foreground">{profile?.name || profile?.email || u.userId.slice(0, 8)}</span>
                                {profile?.email && profile?.name && (
                                  <span className="text-xs text-muted-foreground ml-1">({profile.email})</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-foreground">{u.calls.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-medium text-foreground">{u.tokens.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{u.calls > 0 ? Math.round(u.tokens / u.calls).toLocaleString() : 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground">Nenhum dado de uso no período</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Últimas Chamadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Função</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Modelo</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tokens</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Duração</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 100).map(l => {
                      const profile = l.user_id ? profileMap.get(l.user_id) : null;
                      return (
                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {format(new Date(l.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                          </td>
                          <td className="px-3 py-2 text-foreground">{profile?.name || profile?.email || l.user_id?.slice(0, 8) || '-'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: (FUNCTION_COLORS[l.function_name] || '#666') + '20', color: FUNCTION_COLORS[l.function_name] || '#666' }}>
                              {FUNCTION_LABELS[l.function_name] || l.function_name}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{l.model?.replace('google/', '').replace('openai/', '') || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono text-foreground">{l.total_tokens.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{l.duration_ms ? `${l.duration_ms}ms` : '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={l.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                              {l.status === 'success' ? '✓' : '✗'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">Nenhum log encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
