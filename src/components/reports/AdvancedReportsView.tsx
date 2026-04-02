import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useReportsData,
  PERIOD_OPTIONS,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  type ReportStats,
  type DailyData,
  type SenderData,
  type ComparisonData,
  type AgentData,
  type DailyContactData,
  type ContactTypeData,
  type ContactTagData,
} from '@/hooks/useReportsData';

// --- Sub-components ---

const StatCard = React.memo(function StatCard({
  label, value, prevValue, icon: Icon, trend, compareEnabled, isLoading, index,
}: {
  label: string;
  value: number;
  prevValue?: number;
  icon: React.ElementType;
  trend?: number;
  compareEnabled: boolean;
  isLoading: boolean;
  index: number;
}) {
  return (
    <motion.div
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
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-3xl font-bold text-foreground">
                  {value.toLocaleString()}
                </p>
                {trend !== undefined && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      trend >= 0 ? 'text-success border-success' : 'text-destructive border-destructive'
                    )}
                  >
                    {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(trend).toFixed(1)}%
                  </Badge>
                )}
              </div>
              {compareEnabled && prevValue !== undefined && (
                <p className="text-xs text-muted-foreground mt-2">
                  Período anterior: <span className="font-medium">{prevValue.toLocaleString()}</span>
                </p>
              )}
            </>
          )}
        </CardContent>
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      </Card>
    </motion.div>
  );
});

const ReportStatsCards = React.memo(function ReportStatsCards({
  stats, compareEnabled, isLoading,
}: {
  stats: ReportStats;
  compareEnabled: boolean;
  isLoading: boolean;
}) {
  const cards = [
    { label: 'Total de Mensagens', value: stats.totalMessages, prevValue: stats.prevTotalMessages, icon: MessageSquare, trend: stats.messagesTrend },
    { label: 'Mensagens Enviadas', value: stats.sentMessages, prevValue: stats.prevSentMessages, icon: TrendingUp, trend: stats.sentTrend },
    { label: 'Novos Contatos', value: stats.totalContacts, prevValue: stats.prevTotalContacts, icon: Users, trend: stats.contactsTrend },
    { label: 'Média por Dia', value: stats.avgMessagesPerDay, prevValue: stats.prevAvgMessagesPerDay, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat, index) => (
        <StatCard key={stat.label} {...stat} compareEnabled={compareEnabled} isLoading={isLoading} index={index} />
      ))}
    </div>
  );
});

const ComparisonBarChart = React.memo(function ComparisonBarChart({
  data, isLoading,
}: {
  data: ComparisonData[];
  isLoading: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
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
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="atual" name="Período Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="anterior" name="Período Anterior" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

const PeriodAreaChart = React.memo(function PeriodAreaChart({
  data, gradientId, strokeColor, fillColor, title, badge, borderClass, totalLabel, totalValue, isLoading,
}: {
  data: DailyData[];
  gradientId: string;
  strokeColor: string;
  fillColor: string;
  title: string;
  badge: React.ReactNode;
  borderClass: string;
  totalLabel: string;
  totalValue: number;
  isLoading: boolean;
}) {
  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="total" stroke={strokeColor} fill={`url(#${gradientId})`} strokeWidth={2} name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div className="mt-3 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: strokeColor }} />
            <span className="text-muted-foreground">{totalLabel}:</span>
            <span className="font-bold">{totalValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const DistributionPieChart = React.memo(function DistributionPieChart({
  data, colors, title, borderClass, innerRadius, outerRadius, isLoading,
}: {
  data: SenderData[];
  colors: string[];
  title: string;
  borderClass: string;
  innerRadius: number;
  outerRadius: number;
  isLoading: boolean;
}) {
  return (
    <Card className={borderClass}>
      <CardHeader className={outerRadius < 100 ? 'pb-2' : undefined}>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className={`h-[${outerRadius < 100 ? 200 : 300}px] w-full`} />
        ) : (
          <ResponsiveContainer width="100%" height={outerRadius < 100 ? 200 : 300}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={5} dataKey="value">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

const MessagesTabCompare = React.memo(function MessagesTabCompare({
  chartData, previousChartData, comparisonSummary, dateRange, previousDateRange, stats, isLoading,
}: {
  chartData: { daily: DailyData[]; bySender: SenderData[] };
  previousChartData: { daily: DailyData[]; bySender: SenderData[] };
  comparisonSummary: ComparisonData[];
  dateRange: { from: Date; to: Date };
  previousDateRange: { from: Date; to: Date };
  stats: ReportStats;
  isLoading: boolean;
}) {
  return (
    <>
      <ComparisonBarChart data={comparisonSummary} isLoading={isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PeriodAreaChart
          data={chartData.daily}
          gradientId="colorEnviadasCurrent"
          strokeColor="hsl(var(--primary))"
          fillColor="hsl(var(--primary))"
          title="Período Atual"
          badge={<Badge className="bg-primary/20 text-primary border-primary/30">{format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}</Badge>}
          borderClass="border-primary/30"
          totalLabel="Total"
          totalValue={stats.totalMessages}
          isLoading={isLoading}
        />
        <PeriodAreaChart
          data={previousChartData.daily}
          gradientId="colorEnviadasPrev"
          strokeColor="hsl(var(--muted-foreground))"
          fillColor="hsl(var(--muted-foreground))"
          title="Período Anterior"
          badge={<Badge variant="secondary">{format(previousDateRange.from, 'dd/MM')} - {format(previousDateRange.to, 'dd/MM')}</Badge>}
          borderClass="border-muted-foreground/30"
          totalLabel="Total"
          totalValue={stats.prevTotalMessages}
          isLoading={isLoading}
        />
        <DistributionPieChart
          data={chartData.bySender}
          colors={CHART_COLORS}
          title="Distribuição Atual"
          borderClass="border-primary/30"
          innerRadius={40}
          outerRadius={70}
          isLoading={isLoading}
        />
        <DistributionPieChart
          data={previousChartData.bySender}
          colors={[CHART_COLORS[3], CHART_COLORS[4]]}
          title="Distribuição Anterior"
          borderClass="border-muted-foreground/30"
          innerRadius={40}
          outerRadius={70}
          isLoading={isLoading}
        />
      </div>
    </>
  );
});

const MessagesTabDefault = React.memo(function MessagesTabDefault({
  chartData, isLoading,
}: {
  chartData: { daily: DailyData[]; bySender: SenderData[] };
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="enviadas" stroke="hsl(var(--primary))" fill="url(#colorEnviadas)" strokeWidth={2} />
                <Area type="monotone" dataKey="recebidas" stroke="hsl(var(--chart-2))" fill="url(#colorRecebidas)" strokeWidth={2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <DistributionPieChart
        data={chartData.bySender}
        colors={CHART_COLORS}
        title="Distribuição"
        borderClass=""
        innerRadius={60}
        outerRadius={100}
        isLoading={isLoading}
      />
    </div>
  );
});

const AgentsTab = React.memo(function AgentsTab({
  byAgent, isLoading,
}: {
  byAgent: AgentData[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mensagens por Agente</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : byAgent.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={byAgent} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
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
  );
});

const ContactsTab = React.memo(function ContactsTab({
  contactsChartData, isLoading,
}: {
  contactsChartData: { daily: DailyContactData[]; byType: ContactTypeData[]; byTag: ContactTagData[] };
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="novos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

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
                  cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {contactsChartData.byType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

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
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
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
  );
});

// --- Main Component ---

export function AdvancedReportsView() {
  const {
    period, setPeriod,
    selectedAgent, setSelectedAgent,
    compareEnabled, setCompareEnabled,
    agents,
    dateRange, previousDateRange,
    chartData, previousChartData, comparisonSummary,
    contactsChartData, stats, isLoading,
  } = useReportsData();

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
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border">
            <GitCompare className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="compare-mode" className="text-sm cursor-pointer">
              Comparar períodos
            </Label>
            <Switch id="compare-mode" checked={compareEnabled} onCheckedChange={setCompareEnabled} />
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
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
      <ReportStatsCards stats={stats} compareEnabled={compareEnabled} isLoading={isLoading} />

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
          {compareEnabled ? (
            <MessagesTabCompare
              chartData={chartData}
              previousChartData={previousChartData}
              comparisonSummary={comparisonSummary}
              dateRange={dateRange}
              previousDateRange={previousDateRange}
              stats={stats}
              isLoading={isLoading}
            />
          ) : (
            <MessagesTabDefault chartData={chartData} isLoading={isLoading} />
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <AgentsTab byAgent={chartData.byAgent} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactsTab contactsChartData={contactsChartData} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
