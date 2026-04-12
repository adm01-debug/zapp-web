import { motion } from 'framer-motion';
import { AlertTriangle, Smile, Meh, Frown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <Minus className="w-4 h-4" /><span className="text-xs">Estável</span>
      </div>
    );
  }

  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingUp className="w-4 h-4" /><span className="text-xs">+{percentage}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-destructive">
      <TrendingDown className="w-4 h-4" /><span className="text-xs">-{percentage}%</span>
    </div>
  );
}

interface SentimentStats {
  avgScore: number;
  totalAlerts: number;
  avgPositive: number;
  avgNegative: number;
  recentAvg: number;
  previousAvg: number;
}

export function SentimentStatsCards({ stats }: { stats: SentimentStats }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-muted/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Score Médio</span>
          <SentimentIcon score={stats.avgScore} />
        </div>
        <p className={cn('text-xl font-bold', stats.avgScore >= 0.3 ? 'text-success' : stats.avgScore >= -0.3 ? 'text-warning' : 'text-destructive')}>
          {(stats.avgScore * 100).toFixed(0)}
        </p>
        <TrendIndicator current={stats.recentAvg} previous={stats.previousAvg} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-3 rounded-lg bg-success/10">
        <span className="text-xs text-muted-foreground">Positivo</span>
        <p className="text-xl font-bold text-success">{stats.avgPositive.toFixed(1)}%</p>
        <span className="text-xs text-muted-foreground">média</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-3 rounded-lg bg-destructive/10">
        <span className="text-xs text-muted-foreground">Negativo</span>
        <p className="text-xl font-bold text-destructive">{stats.avgNegative.toFixed(1)}%</p>
        <span className="text-xs text-muted-foreground">média</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-3 rounded-lg bg-destructive/10">
        <div className="flex items-center gap-1 mb-1">
          <AlertTriangle className="w-3 h-3 text-destructive" />
          <span className="text-xs text-muted-foreground">Alertas</span>
        </div>
        <p className="text-xl font-bold text-destructive">{stats.totalAlerts}</p>
        <span className="text-xs text-muted-foreground">no período</span>
      </motion.div>
    </div>
  );
}
