import { Skeleton, SkeletonCard, SkeletonList } from '@/components/ui/skeleton';

export function DashboardStatCardSkeleton() {
  return (
    <SkeletonCard className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton variant="shimmer" className="h-3 w-24" />
          <Skeleton variant="shimmer" className="h-8 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton variant="shimmer" className="h-4 w-12 rounded-full" />
            <Skeleton variant="shimmer" className="h-3 w-16" />
          </div>
        </div>
        <Skeleton variant="wave" className="w-12 h-12 rounded-xl bg-primary/10" />
      </div>
    </SkeletonCard>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonList count={4} staggerDelay={100}>
        {() => <DashboardStatCardSkeleton />}
      </SkeletonList>
    </div>
  );
}

export function DashboardChartSkeleton() {
  return (
    <SkeletonCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-5 w-32" />
          <Skeleton variant="shimmer" className="h-3 w-48" />
        </div>
        <Skeleton variant="wave" className="h-8 w-24 rounded-lg" />
      </div>
      
      {/* Chart area with animated bars */}
      <div className="h-64 flex items-end justify-between gap-2 pt-4">
        {Array.from({ length: 12 }).map((_, i) => {
          const height = 20 + Math.sin(i * 0.5) * 30 + 30;
          return (
            <div 
              key={i} 
              className="flex-1 flex flex-col justify-end gap-1"
            >
              <Skeleton 
                variant="shimmer"
                className="w-full rounded-t-sm bg-primary/20 animate-scale-in" 
                delay={i * 50}
                style={{ height: `${height}%` }}
              />
              <Skeleton variant="shimmer" className="h-3 w-full" delay={i * 50} />
            </div>
          );
        })}
      </div>
    </SkeletonCard>
  );
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonCard className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-5 w-32" />
        <Skeleton variant="wave" className="h-8 w-20 rounded-lg" />
      </div>
      
      {/* Table header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex gap-4">
        <Skeleton variant="shimmer" className="h-3 w-32" />
        <Skeleton variant="shimmer" className="h-3 w-24 ml-auto" />
        <Skeleton variant="shimmer" className="h-3 w-20" />
        <Skeleton variant="shimmer" className="h-3 w-16" />
      </div>
      
      {/* Rows with staggered animation */}
      <SkeletonList count={rows} staggerDelay={80}>
        {() => (
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton variant="shimmer" className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton variant="shimmer" className="h-3.5 w-28" />
                <Skeleton variant="shimmer" className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton variant="wave" className="h-6 w-16 rounded-full bg-primary/15" />
            <Skeleton variant="shimmer" className="h-3 w-12" />
            <Skeleton variant="shimmer" className="h-3 w-14" />
          </div>
        )}
      </SkeletonList>
    </SkeletonCard>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <SkeletonCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-5 w-28" />
        <Skeleton variant="wave" className="w-6 h-6 rounded" />
      </div>
      <div className="space-y-3">
        <SkeletonList count={3} staggerDelay={100}>
          {() => (
            <div className="flex items-center gap-3">
              <Skeleton variant="shimmer" className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="shimmer" className="h-3 w-24" />
                <Skeleton variant="shimmer" className="h-2.5 w-16" />
              </div>
              <Skeleton variant="shimmer" className="h-5 w-8" />
            </div>
          )}
        </SkeletonList>
      </div>
    </SkeletonCard>
  );
}

// Full page skeleton
export function DashboardPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-8 w-48" />
          <Skeleton variant="shimmer" className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="wave" className="h-10 w-32 rounded-lg" />
          <Skeleton variant="wave" className="h-10 w-10 rounded-lg" delay={50} />
        </div>
      </div>

      {/* Stats */}
      <DashboardStatsSkeleton />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardChartSkeleton />
        </div>
        <div>
          <DashboardWidgetSkeleton />
        </div>
      </div>

      {/* Table */}
      <DashboardTableSkeleton rows={5} />
    </div>
  );
}
