import { useState, useEffect, useCallback } from 'react';
import { log } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/components/ui/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  TrendingUp,
  Target,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

function getDateRange(period: PeriodFilter): { start: Date | null; label: string } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), label: 'Hoje' };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), label: 'Esta Semana' };
    case 'month':
      return { start: startOfMonth(now), label: 'Este Mês' };
    case 'all':
      return { start: null, label: 'Todo Período' };
  }
}

interface SLAMetric {
  total: number;
  onTime: number;
  breached: number;
  rate: number;
}

interface AgentSLAMetric {
  id: string;
  name: string;
  avatar?: string;
  firstResponse: SLAMetric;
  resolution: SLAMetric;
  overallRate: number;
}

function getRateColor(rate: number): string {
  if (rate >= 90) return 'text-success';
  if (rate >= 75) return 'text-warning';
  return 'text-destructive';
}

function getRateBg(rate: number): string {
  if (rate >= 90) return 'bg-success';
  if (rate >= 75) return 'bg-warning';
  return 'bg-destructive';
}

function getRateBadge(rate: number): string {
  if (rate >= 90) return 'bg-success/10 text-success';
  if (rate >= 75) return 'bg-warning/10 text-warning';
  return 'bg-destructive/10 text-destructive';
}

export function SLAMetricsDashboard() {
  const [agentSLAData, setAgentSLAData] = useState<AgentSLAMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');

  const fetchSLAMetrics = useCallback(async () => {
    try {
      const dateRange = getDateRange(periodFilter);
      
      // Build query with optional date filter
      let query = supabase
        .from('conversation_sla')
        .select(`
          id,
          first_response_breached,
          resolution_breached,
          first_response_at,
          resolved_at,
          contact_id,
          created_at
        `);

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start.toISOString());
      }

      const { data: slaData, error: slaError } = await query;

      if (slaError) throw slaError;

      // Fetch contacts to get assigned_to
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, assigned_to');

      if (contactsError) throw contactsError;

      // Create a map of contact_id to assigned_to
      const contactAgentMap: Record<string, string> = {};
      contacts?.forEach(contact => {
        if (contact.assigned_to) {
          contactAgentMap[contact.id] = contact.assigned_to;
        }
      });

      // Fetch all profiles (agents)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');

      if (profilesError) throw profilesError;

      // Calculate metrics per agent
      const agentMetrics: Record<string, {
        frTotal: number;
        frOnTime: number;
        resTotal: number;
        resOnTime: number;
      }> = {};

      // Initialize all agents
      profiles?.forEach(profile => {
        agentMetrics[profile.id] = { frTotal: 0, frOnTime: 0, resTotal: 0, resOnTime: 0 };
      });

      // Process SLA data
      slaData?.forEach(sla => {
        const agentId = sla.contact_id ? contactAgentMap[sla.contact_id] : null;
        if (agentId && agentMetrics[agentId] !== undefined) {
          // First response metrics
          if (sla.first_response_at) {
            agentMetrics[agentId].frTotal++;
            if (!sla.first_response_breached) {
              agentMetrics[agentId].frOnTime++;
            }
          }
          // Resolution metrics
          if (sla.resolved_at) {
            agentMetrics[agentId].resTotal++;
            if (!sla.resolution_breached) {
              agentMetrics[agentId].resOnTime++;
            }
          }
        }
      });

      // Format data for display
      const formattedData: AgentSLAMetric[] = profiles?.map(profile => {
        const metrics = agentMetrics[profile.id] || { frTotal: 0, frOnTime: 0, resTotal: 0, resOnTime: 0 };
        const frRate = metrics.frTotal > 0 ? Math.round((metrics.frOnTime / metrics.frTotal) * 100) : 100;
        const resRate = metrics.resTotal > 0 ? Math.round((metrics.resOnTime / metrics.resTotal) * 100) : 100;
        const totalItems = metrics.frTotal + metrics.resTotal;
        const totalOnTime = metrics.frOnTime + metrics.resOnTime;
        const overallRate = totalItems > 0 ? Math.round((totalOnTime / totalItems) * 100) : 100;

        return {
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar_url || undefined,
          firstResponse: {
            total: metrics.frTotal,
            onTime: metrics.frOnTime,
            breached: metrics.frTotal - metrics.frOnTime,
            rate: frRate,
          },
          resolution: {
            total: metrics.resTotal,
            onTime: metrics.resOnTime,
            breached: metrics.resTotal - metrics.resOnTime,
            rate: resRate,
          },
          overallRate,
        };
      }) || [];

      setAgentSLAData(formattedData);
    } catch (error) {
      log.error('Error fetching SLA metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    fetchSLAMetrics();
  }, [fetchSLAMetrics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSLAMetrics();
  };

  // Calculate overall metrics
  const totalConversations = agentSLAData.reduce((sum, a) => sum + a.firstResponse.total, 0);
  const totalOnTime = agentSLAData.reduce((sum, a) => sum + a.firstResponse.onTime, 0);
  const totalBreached = agentSLAData.reduce((sum, a) => sum + a.firstResponse.breached, 0);
  const overallRate = totalConversations > 0 ? Math.round((totalOnTime / totalConversations) * 100) : 100;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-secondary/20 bg-card">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-secondary/20 bg-card">
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Métricas de SLA</h2>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            {getDateRange(periodFilter).label}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={periodFilter}
            onValueChange={(value) => value && setPeriodFilter(value as PeriodFilter)}
            className="bg-muted/30 p-1 rounded-lg"
          >
            <ToggleGroupItem value="today" size="sm" className="text-xs px-3">
              Hoje
            </ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm" className="text-xs px-3">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm" className="text-xs px-3">
              Mês
            </ToggleGroupItem>
            <ToggleGroupItem value="all" size="sm" className="text-xs px-3">
              Tudo
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Geral SLA</p>
                  <p className={cn("text-2xl font-bold", getRateColor(overallRate))}>
                    {overallRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Prazo</p>
                  <p className="text-2xl font-bold text-success">{totalOnTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Violações</p>
                  <p className="text-2xl font-bold text-destructive">{totalBreached}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversas</p>
                  <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA by Agent */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardHeader className="border-b border-secondary/20 bg-secondary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <CardTitle className="font-display text-lg">SLA por Agente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {agentSLAData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum agente encontrado</p>
                </div>
              ) : (
                agentSLAData
                  .sort((a, b) => b.overallRate - a.overallRate)
                  .map((agent, index) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 ring-2 ring-border/50">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{agent.name}</span>
                        </div>
                        <Badge className={cn("font-semibold border-0", getRateBadge(agent.overallRate))}>
                          {agent.overallRate}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 1ª Resposta
                            </span>
                            <span className={getRateColor(agent.firstResponse.rate)}>
                              {agent.firstResponse.rate}%
                            </span>
                          </div>
                          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={cn("absolute inset-y-0 left-0 rounded-full", getRateBg(agent.firstResponse.rate))}
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.firstResponse.rate}%` }}
                              transition={{ duration: 0.8, delay: 0.7 + index * 0.05 }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resolução
                            </span>
                            <span className={getRateColor(agent.resolution.rate)}>
                              {agent.resolution.rate}%
                            </span>
                          </div>
                          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={cn("absolute inset-y-0 left-0 rounded-full", getRateBg(agent.resolution.rate))}
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.resolution.rate}%` }}
                              transition={{ duration: 0.8, delay: 0.7 + index * 0.05 }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          {agent.firstResponse.onTime + agent.resolution.onTime} no prazo
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          {agent.firstResponse.breached + agent.resolution.breached} violações
                        </span>
                      </div>
                    </motion.div>
                  ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* SLA Overview Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-secondary/20 bg-card h-full">
            <CardHeader className="border-b border-secondary/20 bg-secondary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <CardTitle className="font-display text-lg">Resumo Geral</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {agentSLAData.length === 0 || totalConversations === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum dado de SLA disponível</p>
                  <p className="text-sm">Os dados aparecerão quando houver conversas com SLA ativo</p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Taxa de 1ª Resposta no Prazo</span>
                      <span className={cn("font-semibold", getRateColor(overallRate))}>
                        {overallRate}%
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("absolute inset-y-0 left-0 rounded-full", getRateBg(overallRate))}
                        initial={{ width: 0 }}
                        animate={{ width: `${overallRate}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-xs text-muted-foreground">No Prazo</span>
                      </div>
                      <p className="text-xl font-bold text-success">{totalOnTime}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-muted-foreground">Violações</span>
                      </div>
                      <p className="text-xl font-bold text-destructive">{totalBreached}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="text-xs text-muted-foreground mb-2">Top 3 Agentes</div>
                    {agentSLAData
                      .filter(a => a.firstResponse.total > 0)
                      .sort((a, b) => b.overallRate - a.overallRate)
                      .slice(0, 3)
                      .map((agent, index) => (
                        <div key={agent.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium">{agent.name}</span>
                          </div>
                          <Badge className={cn("text-xs border-0", getRateBadge(agent.overallRate))}>
                            {agent.overallRate}%
                          </Badge>
                        </div>
                      ))}
                    {agentSLAData.filter(a => a.firstResponse.total > 0).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Nenhum agente com dados de SLA
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
