import { Skeleton } from '@/components/ui/skeleton';

export function DashboardStatCardSkeleton() {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardStatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardChartSkeleton() {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      
      {/* Chart area */}
      <div className="h-64 flex items-end justify-between gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Skeleton 
              className="w-full rounded-t-sm" 
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      
      {/* Table header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24 ml-auto" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border/50 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <div className="p-6 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
