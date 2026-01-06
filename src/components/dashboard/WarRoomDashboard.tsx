import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Clock, Users, MessageSquare, TrendingUp, TrendingDown,
  Phone, CheckCircle, XCircle, Timer, Zap, Activity, Bell, Volume2,
  VolumeX, Maximize2, Minimize2, RefreshCw, Settings, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  activeChats: number;
  maxChats: number;
  avgResponseTime: number;
  resolvedToday: number;
  satisfaction: number;
}

interface QueueMetric {
  id: string;
  name: string;
  color: string;
  waiting: number;
  avgWaitTime: number;
  slaBreaches: number;
  slaWarnings: number;
  inProgress: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isNew?: boolean;
}

interface WarRoomDashboardProps {
  agents?: Agent[];
  queues?: QueueMetric[];
  alerts?: Alert[];
  onAgentClick?: (agentId: string) => void;
  onQueueClick?: (queueId: string) => void;
  onAlertDismiss?: (alertId: string) => void;
  className?: string;
}

// Mock data for demo
const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'Ana Silva', status: 'online', activeChats: 4, maxChats: 6, avgResponseTime: 45, resolvedToday: 23, satisfaction: 4.8 },
  { id: '2', name: 'Carlos Santos', status: 'busy', activeChats: 6, maxChats: 6, avgResponseTime: 62, resolvedToday: 18, satisfaction: 4.5 },
  { id: '3', name: 'Maria Oliveira', status: 'online', activeChats: 2, maxChats: 6, avgResponseTime: 38, resolvedToday: 31, satisfaction: 4.9 },
  { id: '4', name: 'João Pedro', status: 'away', activeChats: 0, maxChats: 6, avgResponseTime: 55, resolvedToday: 15, satisfaction: 4.6 },
  { id: '5', name: 'Lucia Costa', status: 'online', activeChats: 5, maxChats: 6, avgResponseTime: 42, resolvedToday: 27, satisfaction: 4.7 },
];

const MOCK_QUEUES: QueueMetric[] = [
  { id: '1', name: 'Vendas', color: '#22c55e', waiting: 12, avgWaitTime: 3.2, slaBreaches: 2, slaWarnings: 4, inProgress: 8 },
  { id: '2', name: 'Suporte', color: '#3b82f6', waiting: 28, avgWaitTime: 8.5, slaBreaches: 7, slaWarnings: 12, inProgress: 15 },
  { id: '3', name: 'Financeiro', color: '#f59e0b', waiting: 5, avgWaitTime: 2.1, slaBreaches: 0, slaWarnings: 1, inProgress: 4 },
  { id: '4', name: 'Técnico', color: '#8b5cf6', waiting: 18, avgWaitTime: 6.3, slaBreaches: 3, slaWarnings: 8, inProgress: 11 },
];

const MOCK_ALERTS: Alert[] = [
  { id: '1', type: 'critical', title: 'SLA Crítico', message: 'Fila Suporte com 7 violações de SLA', timestamp: new Date(), isNew: true },
  { id: '2', type: 'warning', title: 'Alta Demanda', message: 'Volume 40% acima do normal', timestamp: new Date(Date.now() - 300000) },
  { id: '3', type: 'info', title: 'Agente Indisponível', message: 'João Pedro está ausente há 15min', timestamp: new Date(Date.now() - 600000) },
];

export function WarRoomDashboard({
  agents = MOCK_AGENTS,
  queues = MOCK_QUEUES,
  alerts = MOCK_ALERTS,
  onAgentClick,
  onQueueClick,
  onAlertDismiss,
  className,
}: WarRoomDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Calculate global metrics
  const globalMetrics = useMemo(() => {
    const totalWaiting = queues.reduce((acc, q) => acc + q.waiting, 0);
    const totalBreaches = queues.reduce((acc, q) => acc + q.slaBreaches, 0);
    const totalWarnings = queues.reduce((acc, q) => acc + q.slaWarnings, 0);
    const onlineAgents = agents.filter(a => a.status === 'online' || a.status === 'busy').length;
    const avgSatisfaction = agents.reduce((acc, a) => acc + a.satisfaction, 0) / agents.length;
    const totalResolved = agents.reduce((acc, a) => acc + a.resolvedToday, 0);
    
    return { totalWaiting, totalBreaches, totalWarnings, onlineAgents, avgSatisfaction, totalResolved };
  }, [agents, queues]);

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Critical alert check
  const hasCriticalAlerts = alerts.some(a => a.type === 'critical' && a.isNew);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-background p-4 space-y-4",
      hasCriticalAlerts && "animate-pulse-subtle",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">War Room</h1>
          </div>
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Ao vivo
          </Badge>
          <span className="text-sm text-muted-foreground">
            Atualizado: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Som de alertas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setAutoRefresh(!autoRefresh)}>
                <RefreshCw className={cn("w-4 h-4", autoRefresh && "animate-spin-slow")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto-atualização</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tela cheia</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={Users}
          label="Na Fila"
          value={globalMetrics.totalWaiting}
          trend={globalMetrics.totalWaiting > 30 ? 'up' : 'stable'}
          alert={globalMetrics.totalWaiting > 50}
        />
        <MetricCard
          icon={XCircle}
          label="SLA Violados"
          value={globalMetrics.totalBreaches}
          trend="up"
          alert={globalMetrics.totalBreaches > 5}
          critical={globalMetrics.totalBreaches > 10}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Em Risco"
          value={globalMetrics.totalWarnings}
          trend="up"
          alert={globalMetrics.totalWarnings > 10}
        />
        <MetricCard
          icon={Users}
          label="Agentes Online"
          value={globalMetrics.onlineAgents}
          suffix={`/${agents.length}`}
          trend="stable"
        />
        <MetricCard
          icon={CheckCircle}
          label="Resolvidos Hoje"
          value={globalMetrics.totalResolved}
          trend="up"
          positive
        />
        <MetricCard
          icon={TrendingUp}
          label="Satisfação"
          value={globalMetrics.avgSatisfaction.toFixed(1)}
          suffix="/5"
          trend="stable"
          positive
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queues Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Filas em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queues.map((queue) => (
              <QueueRow
                key={queue.id}
                queue={queue}
                onClick={() => onQueueClick?.(queue.id)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card className={cn(hasCriticalAlerts && "border-destructive")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className={cn("w-5 h-5", hasCriticalAlerts && "text-destructive animate-bounce")} />
              Alertas
              {alerts.filter(a => a.isNew).length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {alerts.filter(a => a.isNew).length} novos
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            <AnimatePresence>
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => onAlertDismiss?.(alert.id)}
                />
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Status dos Agentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => onAgentClick?.(agent.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components
interface MetricCardProps {
  icon: typeof Users;
  label: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
  critical?: boolean;
  positive?: boolean;
}

function MetricCard({ icon: Icon, label, value, suffix, trend, alert, critical, positive }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "p-4 rounded-xl border bg-card transition-all",
        critical && "border-destructive bg-destructive/10 animate-pulse",
        alert && !critical && "border-warning bg-warning/10",
        positive && "border-success/50"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn(
          "w-5 h-5",
          critical ? "text-destructive" : alert ? "text-warning" : positive ? "text-success" : "text-muted-foreground"
        )} />
        {trend === 'up' && <TrendingUp className={cn("w-4 h-4", positive ? "text-success" : "text-destructive")} />}
        {trend === 'down' && <TrendingDown className={cn("w-4 h-4", positive ? "text-destructive" : "text-success")} />}
      </div>
      <div className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function QueueRow({ queue, onClick }: { queue: QueueMetric; onClick: () => void }) {
  const utilizationPercent = (queue.inProgress / (queue.waiting + queue.inProgress)) * 100 || 0;
  const hasCritical = queue.slaBreaches > 0;

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        hasCritical && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: queue.color }} />
          <span className="font-medium">{queue.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {queue.slaBreaches > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {queue.slaBreaches} violações
            </Badge>
          )}
          {queue.slaWarnings > 0 && (
            <Badge variant="secondary" className="bg-warning/20 text-warning">
              {queue.slaWarnings} em risco
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Aguardando</div>
          <div className="font-semibold">{queue.waiting}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Em Atendimento</div>
          <div className="font-semibold">{queue.inProgress}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Tempo Médio</div>
          <div className="font-semibold">{queue.avgWaitTime.toFixed(1)}min</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Utilização</div>
          <Progress value={utilizationPercent} className="h-2" />
        </div>
      </div>
    </motion.div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const alertStyles = {
    critical: 'bg-destructive/10 border-destructive text-destructive',
    warning: 'bg-warning/10 border-warning text-warning',
    info: 'bg-muted border-muted-foreground/20 text-muted-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "p-3 rounded-lg border flex items-start gap-3",
        alertStyles[alert.type],
        alert.isNew && alert.type === 'critical' && "animate-pulse"
      )}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{alert.title}</div>
        <div className="text-xs opacity-80">{alert.message}</div>
        <div className="text-xs opacity-60 mt-1">
          {alert.timestamp.toLocaleTimeString()}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6" onClick={onDismiss}>
        <XCircle className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const statusColors = {
    online: 'bg-success',
    busy: 'bg-warning',
    away: 'bg-muted-foreground',
    offline: 'bg-destructive',
  };

  const isOverloaded = agent.activeChats >= agent.maxChats;
  const utilizationPercent = (agent.activeChats / agent.maxChats) * 100;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        isOverloaded && "border-warning bg-warning/5"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {agent.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
            statusColors[agent.status]
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{agent.status}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Chats</span>
          <span className={cn(isOverloaded && "text-warning font-medium")}>
            {agent.activeChats}/{agent.maxChats}
          </span>
        </div>
        <Progress value={utilizationPercent} className="h-1.5" />
        
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div>
            <div className="text-muted-foreground">Resp.</div>
            <div className="font-medium">{agent.avgResponseTime}s</div>
          </div>
          <div>
            <div className="text-muted-foreground">Hoje</div>
            <div className="font-medium">{agent.resolvedToday}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
