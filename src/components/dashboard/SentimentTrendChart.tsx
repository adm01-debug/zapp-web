import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SentimentData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  avg_score: number;
  alerts_count: number;
}

interface SentimentTrendChartProps {
  data?: SentimentData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

// Generate mock data for demo
function generateMockData(days: number): SentimentData[] {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  
  return dates.map((date) => {
    const positive = Math.floor(Math.random() * 40) + 30; // 30-70
    const negative = Math.floor(Math.random() * 20) + 5; // 5-25
    const neutral = 100 - positive - negative;
    const avg_score = (positive * 1 + neutral * 0 + negative * -1) / 100;
    
    return {
      date: format(date, 'yyyy-MM-dd'),
      positive,
      neutral,
      negative,
      avg_score: Math.round(avg_score * 100) / 100,
      alerts_count: Math.floor(Math.random() * 5),
    };
  });
}

function SentimentIcon({ score }: { score: number }) {
  if (score >= 0.3) return <Smile className="w-5 h-5 text-success" />;
  if (score >= -0.3) return <Meh className="w-5 h-5 text-warning" />;
  return <Frown className="w-5 h-5 text-destructive" />;
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const percentage = previous !== 0 ? Math.abs((diff / previous) * 100).toFixed(1) : '0';
  
  if (Math.abs(diff) < 0.05) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-xs">Estável</span>
      </div>
    );
  }
  
  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs">+{percentage}%</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-destructive">
      <TrendingDown className="w-4 h-4" />
      <span className="text-xs">-{percentage}%</span>
    </div>
  );
}

interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  alerts_count: number;
}

interface TooltipPayloadItem {
  payload: SentimentDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length || !label) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">
        {format(new Date(label), "dd 'de' MMMM", { locale: ptBR })}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            Positivo
          </span>
          <span className="font-medium">{data.positive}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            Neutro
          </span>
          <span className="font-medium">{data.neutral}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            Negativo
          </span>
          <span className="font-medium">{data.negative}%</span>
        </div>
        {data.alerts_count > 0 && (
          <div className="pt-2 border-t mt-2">
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              {data.alerts_count} alertas
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export function SentimentTrendChart({
  data: externalData,
  isLoading,
  onRefresh,
  onExport,
}: SentimentTrendChartProps) {
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');
  
  const data = useMemo(() => {
    return externalData || generateMockData(parseInt(period));
  }, [externalData, period]);
  
  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const avgScore = data.reduce((acc, d) => acc + d.avg_score, 0) / data.length;
    const totalAlerts = data.reduce((acc, d) => acc + d.alerts_count, 0);
    const avgPositive = data.reduce((acc, d) => acc + d.positive, 0) / data.length;
    const avgNegative = data.reduce((acc, d) => acc + d.negative, 0) / data.length;
    
    // Calculate trend (last 3 days vs previous 3 days)
    const recent = data.slice(-3);
    const previous = data.slice(-6, -3);
    
    const recentAvg = recent.reduce((acc, d) => acc + d.avg_score, 0) / recent.length;
    const previousAvg = previous.length > 0 
      ? previous.reduce((acc, d) => acc + d.avg_score, 0) / previous.length
      : recentAvg;
    
    return {
      avgScore,
      totalAlerts,
      avgPositive,
      avgNegative,
      recentAvg,
      previousAvg,
    };
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-primary" />
            Tendência de Sentimento
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh}>
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </Button>
            )}
            {onExport && (
              <Button variant="ghost" size="icon" onClick={onExport}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Score Médio</span>
                <SentimentIcon score={stats.avgScore} />
              </div>
              <p className={cn(
                'text-xl font-bold',
                stats.avgScore >= 0.3 ? 'text-success' : 
                stats.avgScore >= -0.3 ? 'text-warning' : 'text-destructive'
              )}>
                {(stats.avgScore * 100).toFixed(0)}
              </p>
              <TrendIndicator current={stats.recentAvg} previous={stats.previousAvg} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-lg bg-success/10"
            >
              <span className="text-xs text-muted-foreground">Positivo</span>
              <p className="text-xl font-bold text-success">
                {stats.avgPositive.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground">média</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-lg bg-destructive/10"
            >
              <span className="text-xs text-muted-foreground">Negativo</span>
              <p className="text-xl font-bold text-destructive">
                {stats.avgNegative.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground">média</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 rounded-lg bg-destructive/10"
            >
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-xs text-muted-foreground">Alertas</span>
              </div>
              <p className="text-xl font-bold text-destructive">
                {stats.totalAlerts}
              </p>
              <span className="text-xs text-muted-foreground">no período</span>
            </motion.div>
          </div>
        )}
        
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="positive"
                name="Positivo"
                stroke="hsl(var(--success))"
                fill="url(#positiveGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="negative"
                name="Negativo"
                stroke="hsl(var(--destructive))"
                fill="url(#negativeGradient)"
                strokeWidth={2}
              />
              <ReferenceLine
                y={50}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{ value: 'Meta', position: 'right', fill: 'hsl(var(--muted-foreground))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
