import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, Users, Zap, Clock, Download, RefreshCw } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { useAIUsageDashboard, FUNCTION_COLORS, FUNCTION_LABELS } from '@/hooks/useAIUsageDashboard';
import type { TimeFilter } from '@/hooks/useAIUsageDashboard';

const LOGS_PER_PAGE = 50;
export function AIUsageDashboard() {
  const {
    logs, isLoading, refetch, timeFilter, setTimeFilter,
    logsPage, setLogsPage, profileMap, stats,
    userUsage, functionUsage, timelineData, handleExportCSV,
  } = useAIUsageDashboard();

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
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Últimas Chamadas</CardTitle>
              <span className="text-xs text-muted-foreground">
                {logs.length} registros • Página {logsPage + 1} de {Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE))}
              </span>
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
                    {logs.slice(logsPage * LOGS_PER_PAGE, (logsPage + 1) * LOGS_PER_PAGE).map(l => {
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
              {logs.length > LOGS_PER_PAGE && (
                <div className="flex items-center justify-between mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPage === 0}
                    onClick={() => setLogsPage(p => p - 1)}
                  >
                    ← Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {logsPage * LOGS_PER_PAGE + 1}–{Math.min((logsPage + 1) * LOGS_PER_PAGE, logs.length)} de {logs.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(logsPage + 1) * LOGS_PER_PAGE >= logs.length}
                    onClick={() => setLogsPage(p => p + 1)}
                  >
                    Próximo →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
