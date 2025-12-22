import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Activity,
  RefreshCw,
  Eye,
  Mail,
  Bell,
  Filter,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SentimentAlert {
  id: string;
  contactId: string | null;
  createdAt: string;
  contact_name?: string;
  contact_phone?: string;
  sentiment_score?: number;
  consecutive_low?: number;
  agent_name?: string;
  message?: string;
  email_sent?: boolean;
}

interface ConversationAnalysis {
  id: string;
  contact_id: string;
  sentiment: string;
  sentiment_score: number;
  created_at: string;
  contacts?: {
    name: string;
    phone: string;
  };
}

export function SentimentAlertsDashboard() {
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [analyses, setAnalyses] = useState<ConversationAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const daysAgo = parseInt(period);
    const startDate = startOfDay(subDays(new Date(), daysAgo)).toISOString();

    try {
      // Fetch sentiment alerts from audit logs
      const { data: alertData, error: alertError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'sentiment_alert')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (alertError) throw alertError;

      const formattedAlerts = (alertData || []).map(log => ({
        id: log.id,
        contactId: log.entity_id,
        createdAt: log.created_at,
        ...((log.details || {}) as Record<string, unknown>),
      })) as SentimentAlert[];

      setAlerts(formattedAlerts);

      // Fetch all analyses for statistics
      const { data: analysisData, error: analysisError } = await supabase
        .from('conversation_analyses')
        .select('id, contact_id, sentiment, sentiment_score, created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (analysisError) throw analysisError;
      setAnalyses((analysisData || []) as ConversationAnalysis[]);

    } catch (error) {
      console.error('Error fetching sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalAnalyses = analyses.length;
    const negativeAnalyses = analyses.filter(a => a.sentiment === 'negativo').length;
    const positiveAnalyses = analyses.filter(a => a.sentiment === 'positivo').length;
    const neutralAnalyses = analyses.filter(a => a.sentiment === 'neutro').length;
    const avgSentiment = totalAnalyses > 0 
      ? Math.round(analyses.reduce((sum, a) => sum + (a.sentiment_score || 50), 0) / totalAnalyses)
      : 50;
    const criticalAlerts = alerts.filter(a => (a.sentiment_score || 50) < 20).length;
    const emailsSent = alerts.filter(a => a.email_sent).length;
    const uniqueContacts = new Set(alerts.map(a => a.contactId)).size;

    return {
      totalAnalyses,
      negativeAnalyses,
      positiveAnalyses,
      neutralAnalyses,
      avgSentiment,
      totalAlerts: alerts.length,
      criticalAlerts,
      emailsSent,
      uniqueContacts,
      negativeRate: totalAnalyses > 0 ? Math.round((negativeAnalyses / totalAnalyses) * 100) : 0,
    };
  }, [analyses, alerts]);

  // Group analyses by day for chart
  const dailyData = React.useMemo(() => {
    const days = parseInt(period);
    const data: { date: string; positive: number; neutral: number; negative: number; avgScore: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayAnalyses = analyses.filter(a => 
        isWithinInterval(new Date(a.created_at), {
          start: startOfDay(date),
          end: endOfDay(date),
        })
      );

      data.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        positive: dayAnalyses.filter(a => a.sentiment === 'positivo').length,
        neutral: dayAnalyses.filter(a => a.sentiment === 'neutro').length,
        negative: dayAnalyses.filter(a => a.sentiment === 'negativo').length,
        avgScore: dayAnalyses.length > 0
          ? Math.round(dayAnalyses.reduce((sum, a) => sum + (a.sentiment_score || 50), 0) / dayAnalyses.length)
          : 0,
      });
    }

    return data;
  }, [analyses, period]);

  const getSentimentColor = (score: number) => {
    if (score < 30) return 'text-red-400';
    if (score < 50) return 'text-orange-400';
    if (score < 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSentimentBg = (score: number) => {
    if (score < 30) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas de Sentimento</h1>
          <p className="text-muted-foreground">Monitore o sentimento dos clientes e alertas automáticos</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Alertas</p>
                  <p className="text-3xl font-bold">{stats.totalAlerts}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-red-400">{stats.criticalAlerts} críticos</span>
                <span>•</span>
                <span>{stats.emailsSent} emails enviados</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sentimento Médio</p>
                  <p className={`text-3xl font-bold ${getSentimentColor(stats.avgSentiment)}`}>
                    {stats.avgSentiment}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getSentimentBg(stats.avgSentiment)}`}
                  style={{ width: `${stats.avgSentiment}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Negativos</p>
                  <p className={`text-3xl font-bold ${stats.negativeRate > 30 ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.negativeRate}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-orange-400" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.negativeAnalyses} de {stats.totalAnalyses} análises
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Afetados</p>
                  <p className="text-3xl font-bold">{stats.uniqueContacts}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Com alertas de sentimento
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <Activity className="h-4 w-4" />
            Distribuição
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sentiment Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Evolução Diária</CardTitle>
                <CardDescription>Sentimento por dia no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end justify-between gap-1">
                  {dailyData.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col gap-[2px]" style={{ height: '160px' }}>
                        <div 
                          className="w-full bg-green-500/60 rounded-t transition-all"
                          style={{ height: `${(day.positive / Math.max(day.positive + day.neutral + day.negative, 1)) * 100}%` }}
                        />
                        <div 
                          className="w-full bg-muted-foreground/40 transition-all"
                          style={{ height: `${(day.neutral / Math.max(day.positive + day.neutral + day.negative, 1)) * 100}%` }}
                        />
                        <div 
                          className="w-full bg-red-500/60 rounded-b transition-all"
                          style={{ height: `${(day.negative / Math.max(day.positive + day.neutral + day.negative, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.date}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-green-500/60" />
                    <span className="text-muted-foreground">Positivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-muted-foreground/40" />
                    <span className="text-muted-foreground">Neutro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-red-500/60" />
                    <span className="text-muted-foreground">Negativo</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Alertas Recentes</CardTitle>
                  <CardDescription>Últimos alertas disparados</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('alerts')}>
                  Ver todos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum alerta no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{alert.contact_name || 'Cliente'}</p>
                            <p className="text-xs text-muted-foreground">
                              Sentimento: <span className="text-red-400">{alert.sentiment_score}%</span>
                              {alert.consecutive_low && ` (${alert.consecutive_low}x consecutivas)`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(alert.createdAt), 'dd/MM HH:mm')}
                            </span>
                            {alert.email_sent && (
                              <Badge variant="outline" className="text-[10px] gap-1 py-0">
                                <Mail className="h-3 w-3" />
                                Enviado
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Alertas</CardTitle>
              <CardDescription>Todos os alertas de sentimento negativo</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-4 opacity-30" />
                    <p>Nenhum alerta registrado no período</p>
                    <p className="text-sm">Os alertas aparecem quando o sentimento cai abaixo de 30%</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <motion.div 
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          (alert.sentiment_score || 50) < 20 ? 'bg-red-500/30' : 'bg-orange-500/20'
                        }`}>
                          <AlertTriangle className={`h-5 w-5 ${
                            (alert.sentiment_score || 50) < 20 ? 'text-red-400' : 'text-orange-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{alert.contact_name || 'Cliente'}</h4>
                            {(alert.sentiment_score || 50) < 20 && (
                              <Badge variant="destructive" className="text-[10px]">Crítico</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(alert.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {alert.agent_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {alert.agent_name}
                              </span>
                            )}
                            {alert.email_sent && (
                              <span className="flex items-center gap-1 text-green-400">
                                <Mail className="h-3 w-3" />
                                Email enviado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getSentimentColor(alert.sentiment_score || 50)}`}>
                            {alert.sentiment_score || 50}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {alert.consecutive_low}x consecutivas
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sentiment Distribution */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Sentimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        Positivo
                      </span>
                      <span className="font-medium">{stats.positiveAnalyses}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(stats.positiveAnalyses / Math.max(stats.totalAnalyses, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Neutro
                      </span>
                      <span className="font-medium">{stats.neutralAnalyses}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground transition-all"
                        style={{ width: `${(stats.neutralAnalyses / Math.max(stats.totalAnalyses, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        Negativo
                      </span>
                      <span className="font-medium">{stats.negativeAnalyses}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${(stats.negativeAnalyses / Math.max(stats.totalAnalyses, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Total: <span className="font-medium text-foreground">{stats.totalAnalyses}</span> análises
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Score</CardTitle>
                <CardDescription>Faixas de pontuação de sentimento</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ranges = [
                    { label: '0-20%', min: 0, max: 20, color: 'bg-red-500' },
                    { label: '21-40%', min: 21, max: 40, color: 'bg-orange-500' },
                    { label: '41-60%', min: 41, max: 60, color: 'bg-yellow-500' },
                    { label: '61-80%', min: 61, max: 80, color: 'bg-lime-500' },
                    { label: '81-100%', min: 81, max: 100, color: 'bg-green-500' },
                  ];

                  const maxCount = Math.max(...ranges.map(r => 
                    analyses.filter(a => (a.sentiment_score || 50) >= r.min && (a.sentiment_score || 50) <= r.max).length
                  ), 1);

                  return (
                    <div className="space-y-3">
                      {ranges.map((range) => {
                        const count = analyses.filter(a => 
                          (a.sentiment_score || 50) >= range.min && (a.sentiment_score || 50) <= range.max
                        ).length;
                        const percentage = (count / maxCount) * 100;

                        return (
                          <div key={range.label} className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-16">{range.label}</span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div 
                                className={`h-full ${range.color} transition-all flex items-center justify-end pr-2`}
                                style={{ width: `${percentage}%` }}
                              >
                                {count > 0 && (
                                  <span className="text-xs font-medium text-white">{count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
