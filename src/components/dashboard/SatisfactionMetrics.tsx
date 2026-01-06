import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  Target,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface SatisfactionData {
  csat: number;
  nps: number;
  totalResponses: number;
  responseRate: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  byAgent: { agentId: string; agentName: string; csat: number; responses: number }[];
  byQueue: { queueId: string; queueName: string; csat: number; responses: number }[];
  distribution: { rating: number; count: number }[];
  timeline: { date: string; csat: number; nps: number }[];
}

export const SatisfactionMetrics = () => {
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    // Simulate loading satisfaction data
    const timer = setTimeout(() => {
      setData({
        csat: 87,
        nps: 42,
        totalResponses: 1234,
        responseRate: 34,
        trend: 'up',
        trendValue: 5,
        byAgent: [
          { agentId: '1', agentName: 'Maria Santos', csat: 94, responses: 156 },
          { agentId: '2', agentName: 'João Silva', csat: 89, responses: 203 },
          { agentId: '3', agentName: 'Ana Costa', csat: 85, responses: 178 },
          { agentId: '4', agentName: 'Pedro Lima', csat: 82, responses: 145 },
        ],
        byQueue: [
          { queueId: '1', queueName: 'Suporte', csat: 88, responses: 567 },
          { queueId: '2', queueName: 'Vendas', csat: 91, responses: 412 },
          { queueId: '3', queueName: 'Financeiro', csat: 79, responses: 255 },
        ],
        distribution: [
          { rating: 5, count: 523 },
          { rating: 4, count: 398 },
          { rating: 3, count: 167 },
          { rating: 2, count: 89 },
          { rating: 1, count: 57 },
        ],
        timeline: Array.from({ length: 30 }, (_, i) => ({
          date: format(subDays(new Date(), 29 - i), 'dd/MM'),
          csat: Math.floor(Math.random() * 15) + 80,
          nps: Math.floor(Math.random() * 30) + 30,
        })),
      });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedPeriod]);

  const getCSATColor = (value: number) => {
    if (value >= 85) return 'text-green-500';
    if (value >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getNPSColor = (value: number) => {
    if (value >= 50) return 'text-green-500';
    if (value >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRatingIcon = (rating: number) => {
    if (rating >= 4) return <Smile className="h-4 w-4 text-green-500" />;
    if (rating === 3) return <Meh className="h-4 w-4 text-yellow-500" />;
    return <Frown className="h-4 w-4 text-red-500" />;
  };

  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando métricas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Satisfação do Cliente</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {['7d', '30d', '90d'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedPeriod(period as any)}
                >
                  {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-muted/50 rounded-lg p-4 text-center"
            >
              <div className="text-sm text-muted-foreground mb-1">CSAT</div>
              <div className={`text-3xl font-bold ${getCSATColor(data.csat)}`}>
                {data.csat}%
              </div>
              <div className="flex items-center justify-center gap-1 text-xs mt-1">
                {data.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : data.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-yellow-500" />
                )}
                <span className={data.trend === 'up' ? 'text-green-500' : data.trend === 'down' ? 'text-red-500' : ''}>
                  {data.trendValue}%
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-muted/50 rounded-lg p-4 text-center"
            >
              <div className="text-sm text-muted-foreground mb-1">NPS</div>
              <div className={`text-3xl font-bold ${getNPSColor(data.nps)}`}>
                {data.nps > 0 ? '+' : ''}{data.nps}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.nps >= 50 ? 'Excelente' : data.nps >= 0 ? 'Bom' : 'Precisa melhorar'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-muted/50 rounded-lg p-4 text-center"
            >
              <div className="text-sm text-muted-foreground mb-1">Respostas</div>
              <div className="text-3xl font-bold">{data.totalResponses.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.responseRate}% taxa de resposta
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-muted/50 rounded-lg p-4 text-center cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setDetailsOpen(true)}
            >
              <div className="text-sm text-muted-foreground mb-1">Top Agente</div>
              <div className="text-lg font-bold truncate">{data.byAgent[0]?.agentName}</div>
              <div className="text-xs text-green-500 mt-1">
                {data.byAgent[0]?.csat}% CSAT
              </div>
            </motion.div>
          </div>

          {/* Distribution Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Distribuição de Notas</h4>
              <div className="space-y-2">
                {data.distribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      {getRatingIcon(item.rating)}
                      <span className="text-sm">{item.rating} ★</span>
                    </div>
                    <div className="flex-1">
                      <Progress
                        value={(item.count / data.totalResponses) * 100}
                        className="h-2"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Por Fila</h4>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byQueue}>
                    <XAxis dataKey="queueName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="csat" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-medium mb-3">Evolução</h4>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="csat"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Ranking de Agentes por CSAT
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {data.byAgent.map((agent, index) => (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <div className="text-2xl font-bold text-muted-foreground w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{agent.agentName}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.responses} avaliações
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getCSATColor(agent.csat)}`}>
                      {agent.csat}%
                    </div>
                    <Progress value={agent.csat} className="w-24 h-2" />
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
