import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from '@/components/ui/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  TrendingUp,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockAgents, mockQueues } from '@/data/mockData';

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

interface QueueSLAMetric {
  id: string;
  name: string;
  color: string;
  firstResponse: SLAMetric;
  resolution: SLAMetric;
  overallRate: number;
}

// Mock SLA data - in production, this would come from Supabase
const generateMockAgentSLAData = (): AgentSLAMetric[] => {
  return mockAgents.map((agent) => {
    const frTotal = Math.floor(Math.random() * 50) + 20;
    const frOnTime = Math.floor(frTotal * (0.7 + Math.random() * 0.25));
    const resTotal = Math.floor(Math.random() * 40) + 15;
    const resOnTime = Math.floor(resTotal * (0.6 + Math.random() * 0.35));
    
    return {
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      firstResponse: {
        total: frTotal,
        onTime: frOnTime,
        breached: frTotal - frOnTime,
        rate: Math.round((frOnTime / frTotal) * 100),
      },
      resolution: {
        total: resTotal,
        onTime: resOnTime,
        breached: resTotal - resOnTime,
        rate: Math.round((resOnTime / resTotal) * 100),
      },
      overallRate: Math.round(((frOnTime + resOnTime) / (frTotal + resTotal)) * 100),
    };
  });
};

const generateMockQueueSLAData = (): QueueSLAMetric[] => {
  return mockQueues.map((queue) => {
    const frTotal = Math.floor(Math.random() * 100) + 50;
    const frOnTime = Math.floor(frTotal * (0.75 + Math.random() * 0.2));
    const resTotal = Math.floor(Math.random() * 80) + 40;
    const resOnTime = Math.floor(resTotal * (0.65 + Math.random() * 0.3));
    
    return {
      id: queue.id,
      name: queue.name,
      color: queue.color,
      firstResponse: {
        total: frTotal,
        onTime: frOnTime,
        breached: frTotal - frOnTime,
        rate: Math.round((frOnTime / frTotal) * 100),
      },
      resolution: {
        total: resTotal,
        onTime: resOnTime,
        breached: resTotal - resOnTime,
        rate: Math.round((resOnTime / resTotal) * 100),
      },
      overallRate: Math.round(((frOnTime + resOnTime) / (frTotal + resTotal)) * 100),
    };
  });
};

const agentSLAData = generateMockAgentSLAData();
const queueSLAData = generateMockQueueSLAData();

// Calculate overall metrics
const totalConversations = agentSLAData.reduce((sum, a) => sum + a.firstResponse.total, 0);
const totalOnTime = agentSLAData.reduce((sum, a) => sum + a.firstResponse.onTime, 0);
const totalBreached = agentSLAData.reduce((sum, a) => sum + a.firstResponse.breached, 0);
const overallRate = Math.round((totalOnTime / totalConversations) * 100);

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
  return (
    <div className="space-y-6">
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
              {agentSLAData
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
                ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* SLA by Queue */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-secondary/20 bg-card">
            <CardHeader className="border-b border-secondary/20 bg-secondary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <CardTitle className="font-display text-lg">SLA por Fila</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {queueSLAData
                .sort((a, b) => b.overallRate - a.overallRate)
                .map((queue, index) => (
                  <motion.div
                    key={queue.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full ring-4 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: queue.color, boxShadow: `0 0 10px ${queue.color}40` }}
                        />
                        <span className="font-medium text-foreground">{queue.name}</span>
                      </div>
                      <Badge className={cn("font-semibold border-0", getRateBadge(queue.overallRate))}>
                        {queue.overallRate}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 1ª Resposta
                          </span>
                          <span className={getRateColor(queue.firstResponse.rate)}>
                            {queue.firstResponse.rate}%
                          </span>
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={cn("absolute inset-y-0 left-0 rounded-full", getRateBg(queue.firstResponse.rate))}
                            initial={{ width: 0 }}
                            animate={{ width: `${queue.firstResponse.rate}%` }}
                            transition={{ duration: 0.8, delay: 0.7 + index * 0.05 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{queue.firstResponse.onTime}/{queue.firstResponse.total}</span>
                          <span>{queue.firstResponse.breached} violações</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Resolução
                          </span>
                          <span className={getRateColor(queue.resolution.rate)}>
                            {queue.resolution.rate}%
                          </span>
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={cn("absolute inset-y-0 left-0 rounded-full", getRateBg(queue.resolution.rate))}
                            initial={{ width: 0 }}
                            animate={{ width: `${queue.resolution.rate}%` }}
                            transition={{ duration: 0.8, delay: 0.7 + index * 0.05 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{queue.resolution.onTime}/{queue.resolution.total}</span>
                          <span>{queue.resolution.breached} violações</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
