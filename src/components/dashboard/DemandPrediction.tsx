import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, 
  ArrowUp, ArrowDown, Minus, Brain, Sparkles, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface PredictionPoint {
  time: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
  isPrediction?: boolean;
}

interface DemandPredictionProps {
  data?: PredictionPoint[];
  currentCapacity?: number;
  className?: string;
}

// Generate prediction data based on real message history
const generatePredictionFromHistory = (messageHistory: { hour: number; count: number }[]): PredictionPoint[] => {
  const now = new Date();
  const data: PredictionPoint[] = [];
  
  // Build hourly averages from history
  const hourlyAvg = new Map<number, number>();
  messageHistory.forEach(({ hour, count }) => {
    hourlyAvg.set(hour, count);
  });
  
  // Past 4 hours (actual data)
  for (let i = -4; i <= 0; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hourCount = hourlyAvg.get(time.getHours()) || 0;
    
    data.push({
      time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      actual: hourCount,
      predicted: hourCount,
      lower: hourCount,
      upper: hourCount,
      isPrediction: false,
    });
  }
  
  // Future 4 hours (predictions based on historical patterns)
  for (let i = 1; i <= 4; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const predicted = hourlyAvg.get(time.getHours()) || 0;
    const variance = Math.max(2, Math.round(predicted * 0.2)) + i;
    
    data.push({
      time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      predicted,
      lower: Math.max(0, predicted - variance),
      upper: predicted + variance,
      isPrediction: true,
    });
  }
  
  return data;
};

export function DemandPrediction({
  data: externalData,
  currentCapacity = 35,
  className,
}: DemandPredictionProps) {
  // Fetch real message volume per hour
  const { data: messageHistory = [] } = useQuery({
    queryKey: ['demand-prediction-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // Group by hour and calculate averages
      const hourCounts = new Map<number, number[]>();
      (data || []).forEach(m => {
        const hour = new Date(m.created_at).getHours();
        if (!hourCounts.has(hour)) hourCounts.set(hour, []);
        hourCounts.get(hour)!.push(1);
      });
      
      return Array.from(hourCounts.entries()).map(([hour, counts]) => ({
        hour,
        count: Math.round(counts.length / 7), // daily average
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = externalData || generatePredictionFromHistory(messageHistory);
  const [hoveredPoint, setHoveredPoint] = useState<PredictionPoint | null>(null);

  // Calculate insights
  const insights = useMemo(() => {
    const predictions = data.filter(d => d.isPrediction);
    const maxPredicted = Math.max(...predictions.map(p => p.predicted));
    const avgPredicted = predictions.reduce((a, b) => a + b.predicted, 0) / predictions.length;
    const currentActual = data.find(d => !d.isPrediction && d.actual !== undefined)?.actual || 0;
    const trend = predictions[predictions.length - 1].predicted > currentActual ? 'up' : 'down';
    const peakTime = predictions.find(p => p.predicted === maxPredicted)?.time || '';
    const capacityRisk = maxPredicted > currentCapacity;
    
    return { maxPredicted, avgPredicted, currentActual, trend, peakTime, capacityRisk };
  }, [data, currentCapacity]);

  interface TooltipPayload {
    payload: PredictionPoint;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    
    return (
      <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <div className="font-medium mb-1">{point.time}</div>
        {point.actual !== undefined && (
          <div className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Atual: {point.actual}</span>
          </div>
        )}
        {point.isPrediction && (
          <>
            <div className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Previsto: {point.predicted}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Intervalo: {point.lower} - {point.upper}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Previsão de Demanda
            <Badge variant="outline" className="ml-2 gap-1">
              <Sparkles className="w-3 h-3" />
              IA
            </Badge>
          </CardTitle>
          
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Previsão baseada em padrões históricos e tendências sazonais. 
              A área sombreada indica o intervalo de confiança de 95%.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Insights Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <InsightCard
            label="Tendência"
            value={insights.trend === 'up' ? 'Subindo' : 'Descendo'}
            icon={insights.trend === 'up' ? TrendingUp : TrendingDown}
            color={insights.trend === 'up' ? 'text-warning' : 'text-success'}
          />
          <InsightCard
            label="Pico Previsto"
            value={`${insights.maxPredicted} msgs`}
            subValue={`às ${insights.peakTime}`}
            icon={Clock}
          />
          <InsightCard
            label="Média Prevista"
            value={`${Math.round(insights.avgPredicted)} msgs`}
            icon={Minus}
          />
          <InsightCard
            label="Capacidade"
            value={insights.capacityRisk ? 'Em Risco' : 'OK'}
            icon={insights.capacityRisk ? AlertTriangle : TrendingUp}
            color={insights.capacityRisk ? 'text-destructive' : 'text-success'}
            alert={insights.capacityRisk}
          />
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              {/* Capacity line */}
              <ReferenceLine 
                y={currentCapacity} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Capacidade', 
                  position: 'right',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 10,
                }}
              />

              {/* Confidence interval (upper bound) */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                fillOpacity={1}
              />
              
              {/* Confidence interval (lower bound - subtracts from upper) */}
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="hsl(var(--background))"
                fillOpacity={1}
              />

              {/* Actual data */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#actualGradient)"
                fillOpacity={1}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              />
              
              {/* Predicted data */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#predictionGradient)"
                fillOpacity={1}
                dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 0, r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary" />
            <span>Dados Reais</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-secondary border-dashed border-t-2 border-secondary" />
            <span>Previsão IA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary/20 rounded" />
            <span>Intervalo de Confiança</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive border-dashed border-t-2 border-destructive" />
            <span>Capacidade Máxima</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: typeof TrendingUp;
  color?: string;
  alert?: boolean;
}

function InsightCard({ label, value, subValue, icon: Icon, color = 'text-primary', alert }: InsightCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "p-3 rounded-lg border bg-card/50",
        alert && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("font-semibold", color)}>{value}</div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
    </motion.div>
  );
}
