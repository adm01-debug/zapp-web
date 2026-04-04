import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Timer,
  Target,
  TrendingUp,
  Users,
  History
} from 'lucide-react';
import { useSLAMetrics, PeriodFilter } from '@/hooks/useSLAMetrics';
import { ExportButton } from '@/components/reports/ExportButton';
import { ReportData } from '@/utils/exportReport';
import { cn } from '@/lib/utils';

const getRateColor = (rate: number) => {
  if (rate >= 90) return 'text-success';
  if (rate >= 70) return 'text-warning';
  return 'text-destructive';
};

const getRateBg = (rate: number) => {
  if (rate >= 90) return 'bg-success/10';
  if (rate >= 70) return 'bg-warning/10';
  return 'bg-destructive/10';
};

const getRateBadge = (rate: number) => {
  if (rate >= 90) return 'bg-success/20 text-success dark:text-success';
  if (rate >= 70) return 'bg-warning/20 text-warning dark:text-warning';
  return 'bg-destructive/20 text-destructive dark:text-destructive';
};

export const SLADashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const { data, loading } = useSLAMetrics(period);

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
    all: 'Todos'
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum dado de SLA disponível</p>
      </Card>
    );
  }

  const getExportData = (): ReportData => ({
    title: 'Dashboard de SLA',
    subtitle: `Período: ${periodLabels[period]}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Agente', key: 'agentName', width: 20 },
      { header: 'Taxa SLA (%)', key: 'overallRate', width: 12 },
      { header: '1ª Resp. (%)', key: 'firstResponseRate', width: 12 },
      { header: 'Resolução (%)', key: 'resolutionRate', width: 12 },
    ],
    rows: data.byAgent.map(a => ({
      agentName: a.agentName,
      overallRate: a.overallRate.toFixed(1),
      firstResponseRate: a.firstResponse.rate.toFixed(1),
      resolutionRate: a.resolution.rate.toFixed(1),
    })),
    summary: [
      { label: 'Taxa SLA Geral', value: `${data.overall.overallRate.toFixed(1)}%` },
      { label: 'Total Conversas', value: data.overall.totalConversations },
      { label: '1ª Resposta no Prazo', value: data.overall.firstResponse.onTime },
      { label: 'Resolução no Prazo', value: data.overall.resolution.onTime },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de SLA</h2>
          <p className="text-muted-foreground">
            Métricas de tempo de resposta e resolução
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton getData={getExportData} />
          <Button 
            variant="outline" 
            onClick={() => navigate('/sla/history')}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <ToggleGroup 
            type="single" 
            value={period} 
            onValueChange={(v) => v && setPeriod(v as PeriodFilter)}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn("border-l-4 border-l-primary", getRateBg(data.overall.overallRate))}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de SLA Geral</p>
                  <p className={cn("text-3xl font-bold", getRateColor(data.overall.overallRate))}>
                    {data.overall.overallRate.toFixed(1)}%
                  </p>
                </div>
                <div className={cn("p-3 rounded-full", getRateBg(data.overall.overallRate))}>
                  <Target className={cn("h-6 w-6", getRateColor(data.overall.overallRate))} />
                </div>
              </div>
              <Progress 
                value={data.overall.overallRate} 
                className="mt-3 h-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Primeira Resposta</p>
                  <p className={cn("text-3xl font-bold", getRateColor(data.overall.firstResponse.rate))}>
                    {data.overall.firstResponse.rate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-info/10">
                  <Timer className="h-6 w-6 text-info" />
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {data.overall.firstResponse.onTime} no prazo
                </span>
                <span className="text-destructive flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {data.overall.firstResponse.breached} atrasados
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolução</p>
                  <p className={cn("text-3xl font-bold", getRateColor(data.overall.resolution.rate))}>
                    {data.overall.resolution.rate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {data.overall.resolution.onTime} no prazo
                </span>
                <span className="text-destructive flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  {data.overall.resolution.breached} atrasados
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Conversas</p>
                  <p className="text-3xl font-bold">{data.overall.totalConversations}</p>
                </div>
                <div className="p-3 rounded-full bg-warning/10">
                  <Users className="h-6 w-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {periodLabels[period]}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SLA by Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLA por Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.byAgent.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de agente disponível
            </p>
          ) : (
            <div className="space-y-4">
              {data.byAgent.map((agent, index) => (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={agent.avatarUrl} />
                    <AvatarFallback>
                      {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{agent.agentName}</p>
                      <Badge className={getRateBadge(agent.overallRate)}>
                        {agent.overallRate.toFixed(0)}% SLA
                      </Badge>
                    </div>
                    
                    <div className="flex gap-6 mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-info" />
                        <span className="text-muted-foreground">1ª Resposta:</span>
                        <span className={getRateColor(agent.firstResponse.rate)}>
                          {agent.firstResponse.rate.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground">
                          ({agent.firstResponse.onTime}/{agent.firstResponse.total})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Resolução:</span>
                        <span className={getRateColor(agent.resolution.rate)}>
                          {agent.resolution.rate.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground">
                          ({agent.resolution.onTime}/{agent.resolution.total})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block w-32">
                    <Progress value={agent.overallRate} className="h-2" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Overview Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Visão Geral do SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Primeira Resposta</span>
                <span className={cn("text-sm font-bold", getRateColor(data.overall.firstResponse.rate))}>
                  {data.overall.firstResponse.rate.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.overall.firstResponse.rate} className="h-3" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{data.overall.firstResponse.onTime} no prazo</span>
                <span>{data.overall.firstResponse.breached} atrasados</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Resolução</span>
                <span className={cn("text-sm font-bold", getRateColor(data.overall.resolution.rate))}>
                  {data.overall.resolution.rate.toFixed(1)}%
                </span>
              </div>
              <Progress value={data.overall.resolution.rate} className="h-3" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{data.overall.resolution.onTime} no prazo</span>
                <span>{data.overall.resolution.breached} atrasados</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Resumo de Violações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground">Violações 1ª Resposta</p>
                <p className="text-2xl font-bold text-destructive">
                  {data.overall.firstResponse.breached}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground">Violações Resolução</p>
                <p className="text-2xl font-bold text-destructive">
                  {data.overall.resolution.breached}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm text-muted-foreground">No Prazo 1ª Resposta</p>
                <p className="text-2xl font-bold text-success">
                  {data.overall.firstResponse.onTime}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm text-muted-foreground">No Prazo Resolução</p>
                <p className="text-2xl font-bold text-success">
                  {data.overall.resolution.onTime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
