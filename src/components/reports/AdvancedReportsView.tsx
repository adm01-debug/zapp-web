import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportButton } from './ExportButton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Tag,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  GitCompare,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/useAgents';
import { useTags } from '@/hooks/useTags';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AdvancedReportsView() {
  const [period, setPeriod] = useState('30');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const { agents } = useAgents();
  const { tags } = useTags();

  const dateRange = useMemo(() => {
    const days = parseInt(period);
    return {
      from: startOfDay(subDays(new Date(), days)),
      to: endOfDay(new Date()),
    };
  }, [period]);

  // Previous period date range for comparison
  const previousDateRange = useMemo(() => {
    const days = parseInt(period);
    return {
      from: startOfDay(subDays(new Date(), days * 2)),
      to: endOfDay(subDays(new Date(), days + 1)),
    };
  }, [period]);

  // Fetch messages data
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['reports-messages', period, selectedAgent],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('id, created_at, sender, agent_id, contact_id, is_read')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch previous period messages for comparison
  const { data: previousMessagesData, isLoading: loadingPreviousMessages } = useQuery({
    queryKey: ['reports-messages-previous', period, selectedAgent],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('id, created_at, sender, agent_id, contact_id, is_read')
        .gte('created_at', previousDateRange.from.toISOString())
        .lte('created_at', previousDateRange.to.toISOString());

      if (selectedAgent !== 'all') {
        query = query.eq('agent_id', selectedAgent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: compareEnabled,
  });

  // Fetch contacts data
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['reports-contacts', period, selectedAgent, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, created_at, assigned_to, tags, contact_type')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedAgent !== 'all') {
        query = query.eq('assigned_to', selectedAgent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch previous period contacts for comparison
  const { data: previousContactsData, isLoading: loadingPreviousContacts } = useQuery({
    queryKey: ['reports-contacts-previous', period, selectedAgent, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, created_at, assigned_to, tags, contact_type')
        .gte('created_at', previousDateRange.from.toISOString())
        .lte('created_at', previousDateRange.to.toISOString());

      if (selectedAgent !== 'all') {
        query = query.eq('assigned_to', selectedAgent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: compareEnabled,
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!messagesData) return { daily: [], byAgent: [], bySender: [] };

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    // Daily messages
    const daily = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayMessages = messagesData.filter(m => 
        format(parseISO(m.created_at), 'yyyy-MM-dd') === dayStr
      );
      const sent = dayMessages.filter(m => m.sender === 'agent').length;
      const received = dayMessages.filter(m => m.sender === 'contact').length;
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        enviadas: sent,
        recebidas: received,
        total: sent + received,
      };
    });

    // Messages by agent
    const agentCounts: Record<string, number> = {};
    messagesData.forEach(m => {
      if (m.agent_id) {
        agentCounts[m.agent_id] = (agentCounts[m.agent_id] || 0) + 1;
      }
    });

    const byAgent = Object.entries(agentCounts)
      .map(([agentId, count]) => {
        const agent = agents.find(a => a.id === agentId);
        return {
          name: agent?.name || 'Desconhecido',
          mensagens: count,
        };
      })
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10);

    // Messages by sender type
    const sent = messagesData.filter(m => m.sender === 'agent').length;
    const received = messagesData.filter(m => m.sender === 'contact').length;
    const bySender = [
      { name: 'Enviadas', value: sent },
      { name: 'Recebidas', value: received },
    ];

    return { daily, byAgent, bySender };
  }, [messagesData, dateRange, agents]);

  // Process previous period data for comparison charts
  const previousChartData = useMemo(() => {
    if (!previousMessagesData || !compareEnabled) return { daily: [], byAgent: [], bySender: [], totals: { sent: 0, received: 0, total: 0 } };

    const days = eachDayOfInterval({ start: previousDateRange.from, end: previousDateRange.to });
    
    // Daily messages
    const daily = days.map((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayMessages = previousMessagesData.filter(m => 
        format(parseISO(m.created_at), 'yyyy-MM-dd') === dayStr
      );
      const sent = dayMessages.filter(m => m.sender === 'agent').length;
      const received = dayMessages.filter(m => m.sender === 'contact').length;
      
      return {
        date: `Dia ${index + 1}`,
        enviadas: sent,
        recebidas: received,
        total: sent + received,
      };
    });

    // Messages by agent
    const agentCounts: Record<string, number> = {};
    previousMessagesData.forEach(m => {
      if (m.agent_id) {
        agentCounts[m.agent_id] = (agentCounts[m.agent_id] || 0) + 1;
      }
    });

    const byAgent = Object.entries(agentCounts)
      .map(([agentId, count]) => {
        const agent = agents.find(a => a.id === agentId);
        return {
          name: agent?.name || 'Desconhecido',
          mensagens: count,
        };
      })
      .sort((a, b) => b.mensagens - a.mensagens)
      .slice(0, 10);

    // Messages by sender type
    const sent = previousMessagesData.filter(m => m.sender === 'agent').length;
    const received = previousMessagesData.filter(m => m.sender === 'contact').length;
    const bySender = [
      { name: 'Enviadas', value: sent },
      { name: 'Recebidas', value: received },
    ];

    return { daily, byAgent, bySender, totals: { sent, received, total: sent + received } };
  }, [previousMessagesData, previousDateRange, agents, compareEnabled]);

  // Comparison summary data for bar charts
  const comparisonSummary = useMemo(() => {
    if (!compareEnabled) return [];
    
    const currentTotal = messagesData?.length || 0;
    const currentSent = messagesData?.filter(m => m.sender === 'agent').length || 0;
    const currentReceived = messagesData?.filter(m => m.sender === 'contact').length || 0;
    const currentContacts = contactsData?.length || 0;

    const prevTotal = previousMessagesData?.length || 0;
    const prevSent = previousMessagesData?.filter(m => m.sender === 'agent').length || 0;
    const prevReceived = previousMessagesData?.filter(m => m.sender === 'contact').length || 0;
    const prevContacts = previousContactsData?.length || 0;

    return [
      { name: 'Total Mensagens', atual: currentTotal, anterior: prevTotal },
      { name: 'Enviadas', atual: currentSent, anterior: prevSent },
      { name: 'Recebidas', atual: currentReceived, anterior: prevReceived },
      { name: 'Novos Contatos', atual: currentContacts, anterior: prevContacts },
    ];
  }, [messagesData, contactsData, previousMessagesData, previousContactsData, compareEnabled]);

  // Process contacts data
  const contactsChartData = useMemo(() => {
    if (!contactsData) return { byType: [], byTag: [], daily: [] };

    // By type
    const typeCounts: Record<string, number> = {};
    contactsData.forEach(c => {
      const type = c.contact_type || 'outros';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));

    // By tag
    const tagCounts: Record<string, number> = {};
    contactsData.forEach(c => {
      (c.tags || []).forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const byTag = Object.entries(tagCounts)
      .map(([tag, count]) => ({ name: tag, contatos: count }))
      .sort((a, b) => b.contatos - a.contatos)
      .slice(0, 10);

    // Daily new contacts
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const daily = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = contactsData.filter(c => 
        format(parseISO(c.created_at), 'yyyy-MM-dd') === dayStr
      ).length;
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        novos: count,
      };
    });

    return { byType, byTag, daily };
  }, [contactsData, dateRange]);

  // Calculate summary stats with real comparison data
  const stats = useMemo(() => {
    const totalMessages = messagesData?.length || 0;
    const sentMessages = messagesData?.filter(m => m.sender === 'agent').length || 0;
    const receivedMessages = messagesData?.filter(m => m.sender === 'contact').length || 0;
    const totalContacts = contactsData?.length || 0;
    const activeAgents = new Set(messagesData?.map(m => m.agent_id).filter(Boolean)).size;

    // Previous period stats
    const prevTotalMessages = previousMessagesData?.length || 0;
    const prevSentMessages = previousMessagesData?.filter(m => m.sender === 'agent').length || 0;
    const prevReceivedMessages = previousMessagesData?.filter(m => m.sender === 'contact').length || 0;
    const prevTotalContacts = previousContactsData?.length || 0;
    const prevActiveAgents = new Set(previousMessagesData?.map(m => m.agent_id).filter(Boolean)).size;

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (!compareEnabled || previous === 0) return undefined;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalMessages,
      sentMessages,
      receivedMessages,
      totalContacts,
      activeAgents,
      avgMessagesPerDay: Math.round(totalMessages / parseInt(period)),
      // Comparison data
      prevTotalMessages,
      prevSentMessages,
      prevReceivedMessages,
      prevTotalContacts,
      prevActiveAgents,
      prevAvgMessagesPerDay: Math.round(prevTotalMessages / parseInt(period)),
      // Trends
      messagesTrend: calculateTrend(totalMessages, prevTotalMessages),
      sentTrend: calculateTrend(sentMessages, prevSentMessages),
      contactsTrend: calculateTrend(totalContacts, prevTotalContacts),
      agentsTrend: calculateTrend(activeAgents, prevActiveAgents),
    };
  }, [messagesData, contactsData, previousMessagesData, previousContactsData, period, compareEnabled]);

  const isLoading = loadingMessages || loadingContacts || (compareEnabled && (loadingPreviousMessages || loadingPreviousContacts));

  const getExportData = () => ({
    title: 'Relatório de Atendimento',
    subtitle: `Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Data', key: 'date' },
      { header: 'Enviadas', key: 'enviadas' },
      { header: 'Recebidas', key: 'recebidas' },
      { header: 'Total', key: 'total' },
    ],
    rows: chartData.daily,
    summary: [
      { label: 'Total de Mensagens', value: stats.totalMessages },
      { label: 'Mensagens Enviadas', value: stats.sentMessages },
      { label: 'Novos Contatos', value: stats.totalContacts },
      { label: 'Agentes Ativos', value: stats.activeAgents },
      { label: 'Média por Dia', value: stats.avgMessagesPerDay },
    ],
  });

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Relatórios Avançados
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de atendimentos por período, agente e tags
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Compare Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border">
            <GitCompare className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="compare-mode" className="text-sm cursor-pointer">
              Comparar períodos
            </Label>
            <Switch
              id="compare-mode"
              checked={compareEnabled}
              onCheckedChange={setCompareEnabled}
            />
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-40">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os agentes</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ExportButton getData={getExportData} disabled={isLoading} />
        </div>
      </div>

      {/* Comparison Period Indicator */}
      {compareEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-muted/30 border rounded-lg p-4"
        >
          <div className="flex items-center gap-3 text-sm">
            <GitCompare className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Comparando:</span>
            <Badge variant="outline" className="gap-1">
              <span className="font-medium">Atual:</span>
              {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
            </Badge>
            <span className="text-muted-foreground">vs</span>
            <Badge variant="secondary" className="gap-1">
              <span className="font-medium">Anterior:</span>
              {format(previousDateRange.from, 'dd/MM/yyyy')} - {format(previousDateRange.to, 'dd/MM/yyyy')}
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total de Mensagens', 
            value: stats.totalMessages, 
            prevValue: stats.prevTotalMessages,
            icon: MessageSquare,
            trend: stats.messagesTrend,
          },
          { 
            label: 'Mensagens Enviadas', 
            value: stats.sentMessages, 
            prevValue: stats.prevSentMessages,
            icon: TrendingUp,
            trend: stats.sentTrend,
          },
          { 
            label: 'Novos Contatos', 
            value: stats.totalContacts, 
            prevValue: stats.prevTotalContacts,
            icon: Users,
            trend: stats.contactsTrend,
          },
          { 
            label: 'Média por Dia', 
            value: stats.avgMessagesPerDay, 
            prevValue: stats.prevAvgMessagesPerDay,
            icon: Clock,
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-end gap-2 mt-2">
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value.toLocaleString()}
                      </p>
                      {stat.trend !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            stat.trend >= 0 ? 'text-success border-success' : 'text-destructive border-destructive'
                          )}
                        >
                          {stat.trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {Math.abs(stat.trend).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    {/* Comparison value */}
                    {compareEnabled && stat.prevValue !== undefined && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Período anterior: <span className="font-medium">{stat.prevValue.toLocaleString()}</span>
                      </p>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="w-4 h-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Tag className="w-4 h-4" />
            Contatos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {/* Comparison Summary Bar Chart */}
          {compareEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-primary" />
                    Comparação de Métricas: Atual vs Anterior
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={comparisonSummary} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="atual" name="Período Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="anterior" name="Período Anterior" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Side by Side Charts when comparison is enabled */}
          {compareEnabled ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Current Period Chart */}
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Período Atual</CardTitle>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData.daily}>
                        <defs>
                          <linearGradient id="colorEnviadasCurrent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorEnviadasCurrent)"
                          strokeWidth={2}
                          name="Total"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">{stats.totalMessages}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Previous Period Chart */}
              <Card className="border-muted-foreground/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Período Anterior</CardTitle>
                    <Badge variant="secondary">
                      {format(previousDateRange.from, 'dd/MM')} - {format(previousDateRange.to, 'dd/MM')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={previousChartData.daily}>
                        <defs>
                          <linearGradient id="colorEnviadasPrev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="hsl(var(--muted-foreground))"
                          fill="url(#colorEnviadasPrev)"
                          strokeWidth={2}
                          name="Total"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">{stats.prevTotalMessages}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Distribution Pie */}
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData.bySender}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.bySender.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Previous Distribution Pie */}
              <Card className="border-muted-foreground/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição Anterior</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={previousChartData.bySender}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {previousChartData.bySender.map((_, index) => (
                            <Cell key={`cell-prev-${index}`} fill={index === 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-5))'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Daily Messages Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Mensagens por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData.daily}>
                        <defs>
                          <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorRecebidas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="enviadas"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorEnviadas)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="recebidas"
                          stroke="hsl(var(--chart-2))"
                          fill="url(#colorRecebidas)"
                          strokeWidth={2}
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Messages Distribution Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.bySender}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.bySender.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : chartData.byAgent.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.byAgent} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="mensagens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* New Contacts Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novos Contatos por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={contactsChartData.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="novos" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Contacts by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contatos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : contactsChartData.byType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={contactsChartData.byType}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {contactsChartData.byType.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts by Tag */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Contatos por Tag</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : contactsChartData.byTag.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contactsChartData.byTag}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="contatos" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado de tags disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
