import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
  Clock,
  XCircle,
} from 'lucide-react';
import { useSLAHistory, HistoryPeriod } from '@/hooks/useSLAHistory';
import { ExportButton } from '@/components/reports/ExportButton';
import { ReportData } from '@/utils/exportReport';
import { cn } from '@/lib/utils';

const periodLabels: Record<HistoryPeriod, string> = {
  '7d': '7 dias',
  '14d': '14 dias',
  '30d': '30 dias',
  '90d': '90 dias',
};

const TrendIndicator = ({ 
  trend, 
  inverse = false,
  label 
}: { 
  trend: { direction: string; percentage: number }; 
  inverse?: boolean;
  label: string;
}) => {
  const isPositive = inverse 
    ? trend.direction === 'down' 
    : trend.direction === 'up';
  const isNegative = inverse 
    ? trend.direction === 'up' 
    : trend.direction === 'down';

  return (
    <div className="flex items-center gap-1">
      {trend.direction === 'up' && (
        <TrendingUp className={cn("h-4 w-4", isPositive ? "text-green-500" : "text-red-500")} />
      )}
      {trend.direction === 'down' && (
        <TrendingDown className={cn("h-4 w-4", isPositive ? "text-green-500" : "text-red-500")} />
      )}
      {trend.direction === 'stable' && (
        <Minus className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={cn(
        "text-sm font-medium",
        isPositive && "text-green-500",
        isNegative && "text-red-500",
        trend.direction === 'stable' && "text-muted-foreground"
      )}>
        {trend.percentage.toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

export const SLAHistoryDashboard = () => {
  const [period, setPeriod] = useState<HistoryPeriod>('30d');
  const { data, loading } = useSLAHistory(period);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum dado de histórico disponível</p>
      </Card>
    );
  }

  const getExportData = (): ReportData => ({
    title: 'Histórico de Violações SLA',
    subtitle: `Período: ${periodLabels[period]}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Data', key: 'dateLabel', width: 15 },
      { header: 'Conversas', key: 'totalConversations', width: 12 },
      { header: 'Violações 1ª Resp.', key: 'firstResponseBreaches', width: 18 },
      { header: 'Violações Resolução', key: 'resolutionBreaches', width: 18 },
      { header: 'Total Violações', key: 'totalBreaches', width: 15 },
      { header: 'Taxa SLA (%)', key: 'slaRate', width: 12 },
    ],
    rows: data.dailyData.map(d => ({
      ...d,
      slaRate: d.slaRate.toFixed(1),
    })),
    summary: [
      { label: 'Taxa SLA Geral', value: `${data.totals.overallSLARate.toFixed(1)}%` },
      { label: 'Total de Conversas', value: data.totals.totalConversations },
      { label: 'Violações 1ª Resposta', value: data.totals.firstResponseBreaches },
      { label: 'Violações Resolução', value: data.totals.resolutionBreaches },
      { label: 'Total de Violações', value: data.totals.totalBreaches },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Violações SLA</h2>
          <p className="text-muted-foreground">
            Análise de tendências e padrões de violações
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton getData={getExportData} />
          <ToggleGroup 
            type="single" 
            value={period} 
            onValueChange={(v) => v && setPeriod(v as HistoryPeriod)}
            className="bg-muted/50 rounded-lg p-1"
          >
            {Object.entries(periodLabels).map(([key, label]) => (
              <ToggleGroupItem 
                key={key} 
                value={key}
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-4"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa SLA Geral</p>
                  <p className="text-3xl font-bold">{data.totals.overallSLARate.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-50" />
              </div>
              <TrendIndicator trend={data.trends.overall} label="vs período anterior" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violações 1ª Resposta</p>
                  <p className="text-3xl font-bold text-orange-500">{data.totals.firstResponseBreaches}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
              <TrendIndicator trend={data.trends.firstResponse} inverse label="vs período anterior" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violações Resolução</p>
                  <p className="text-3xl font-bold text-red-500">{data.totals.resolutionBreaches}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
              <TrendIndicator trend={data.trends.resolution} inverse label="vs período anterior" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversas</p>
                  <p className="text-3xl font-bold">{data.totals.totalConversations}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {data.totals.totalBreaches} violações totais
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SLA Rate Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Taxa de SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyData}>
                <defs>
                  <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateLabel" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa SLA']}
                />
                <Area
                  type="monotone"
                  dataKey="slaRate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#slaGradient)"
                />
                {/* Reference line at 90% */}
                <Line
                  type="monotone"
                  dataKey={() => 90}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Violations by Type Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Violações por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateLabel"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="firstResponseBreaches" 
                  name="1ª Resposta" 
                  fill="hsl(30, 100%, 50%)" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="resolutionBreaches" 
                  name="Resolução" 
                  fill="hsl(0, 70%, 50%)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Piores Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.worstDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma violação registrada</p>
            ) : (
              <div className="space-y-3">
                {data.worstDays.map((day, i) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                  >
                    <div>
                      <p className="font-medium">{day.dateLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {day.totalBreaches} violações em {day.totalConversations} conversas
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {day.slaRate.toFixed(0)}% SLA
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Melhores Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.bestDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {data.bestDays.map((day, i) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                  >
                    <div>
                      <p className="font-medium">{day.dateLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {day.totalConversations} conversas atendidas
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">
                      {day.slaRate.toFixed(0)}% SLA
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
