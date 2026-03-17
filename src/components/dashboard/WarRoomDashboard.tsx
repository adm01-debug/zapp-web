import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useWarRoomAlerts } from '@/hooks/useWarRoomAlerts';
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

// Hook to fetch real War Room data
function useWarRoomData() {
  const { data: agents = [] } = useQuery({
    queryKey: ['warroom-agents'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, is_active, max_chats')
        .eq('is_active', true);
      if (error) throw error;

      // Get agent stats
      const { data: stats } = await supabase
        .from('agent_stats')
        .select('profile_id, messages_sent, conversations_resolved, avg_response_time_seconds, customer_satisfaction_score');

      // Get active chat counts from contacts table
      const { data: contacts } = await supabase
        .from('contacts')
        .select('assigned_to');

      const contactCounts = (contacts || []).reduce((acc, c) => {
        if (c.assigned_to) acc[c.assigned_to] = (acc[c.assigned_to] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statsMap = new Map((stats || []).map(s => [s.profile_id, s]));

      return (profiles || []).map((p): Agent => {
        const agentStats = statsMap.get(p.id);
        const activeChats = contactCounts[p.id] || 0;
        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar_url || undefined,
          status: activeChats >= (p.max_chats || 5) ? 'busy' : 'online',
          activeChats,
          maxChats: p.max_chats || 5,
          avgResponseTime: agentStats?.avg_response_time_seconds || 0,
          resolvedToday: agentStats?.conversations_resolved || 0,
          satisfaction: Number(agentStats?.customer_satisfaction_score) || 0,
        };
      });
    },
    refetchInterval: 30000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['warroom-queues'],
    queryFn: async () => {
      const { data: dbQueues, error } = await supabase
        .from('queues')
        .select('id, name, color, is_active')
        .eq('is_active', true);
      if (error) throw error;

      // Get contacts per queue
      const { data: contacts } = await supabase
        .from('contacts')
        .select('queue_id, assigned_to');

      const { data: slaData } = await supabase
        .from('conversation_sla')
        .select('contact_id, first_response_breached, resolution_breached');

      const breachedContacts = new Set(
        (slaData || []).filter(s => s.first_response_breached || s.resolution_breached).map(s => s.contact_id)
      );

      return (dbQueues || []).map((q): QueueMetric => {
        const queueContacts = (contacts || []).filter(c => c.queue_id === q.id);
        const waiting = queueContacts.filter(c => !c.assigned_to).length;
        const inProgress = queueContacts.filter(c => c.assigned_to).length;
        const slaBreaches = queueContacts.filter(c => breachedContacts.has(c.queue_id)).length;

        return {
          id: q.id,
          name: q.name,
          color: q.color,
          waiting,
          avgWaitTime: 0,
          slaBreaches,
          slaWarnings: 0,
          inProgress,
        };
      });
    },
    refetchInterval: 30000,
  });

  return { agents, queues, alerts: [] as Alert[] };
}

export function WarRoomDashboard({
  agents: propsAgents,
  queues: propsQueues,
  alerts: propsAlerts,
  onAgentClick,
  onQueueClick,
  onAlertDismiss,
  className,
}: WarRoomDashboardProps) {
  const realData = useWarRoomData();
  const agents = propsAgents || realData.agents;
  const queues = propsQueues || realData.queues;
  const { alerts: realtimeAlerts, dismissAlert } = useWarRoomAlerts(true);
  const alerts = propsAlerts || realtimeAlerts.map(a => ({
    id: a.id,
    type: a.alert_type as 'critical' | 'warning' | 'info',
    title: a.title,
    message: a.message,
    timestamp: new Date(a.created_at),
    isNew: !a.is_read,
  }));
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
