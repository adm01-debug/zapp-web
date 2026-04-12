export { AnimatedMetricCard } from './AnimatedMetricCard';
export { TrendIndicator } from './TrendIndicator';
export { MiniSparkline } from './MiniSparkline';
export { MetricComparison } from './MetricComparison';
export { GoalProgressRing } from './GoalProgressRing';
export type { TrendDirection, MetricSize, MetricVariant } from './types';

export const DashboardMetrics = {
  Card: AnimatedMetricCard,
  Trend: TrendIndicator,
  Sparkline: MiniSparkline,
  Comparison: MetricComparison,
  GoalRing: GoalProgressRing,
};
