import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Shimmer animation wrapper
function ShimmerWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-background/40 to-transparent" />
    </div>
  );
}

export function DashboardStatCardSkeleton() {
  return (
    <ShimmerWrapper className="p-6 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-3 w-24 bg-muted/60" />
          <Skeleton className="h-8 w-20 bg-muted/80" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 rounded-full bg-muted/50" />
            <Skeleton className="h-3 w-16 bg-muted/40" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-xl bg-primary/10" />
      </div>
    </ShimmerWrapper>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i} 
          className="animate-fade-in"
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
        >
          <DashboardStatCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function DashboardChartSkeleton() {
  return (
    <ShimmerWrapper className="p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 bg-muted/70" />
          <Skeleton className="h-3 w-48 bg-muted/50" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg bg-muted/60" />
      </div>
      
      {/* Chart area with animated bars */}
      <div className="h-64 flex items-end justify-between gap-2 pt-4">
        {Array.from({ length: 12 }).map((_, i) => {
          const height = 20 + Math.sin(i * 0.5) * 30 + 30;
          return (
            <div 
              key={i} 
              className="flex-1 flex flex-col justify-end gap-1"
              style={{ 
                animationDelay: `${i * 50}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <Skeleton 
                className="w-full rounded-t-sm bg-primary/20 animate-scale-in" 
                style={{ 
                  height: `${height}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
              <Skeleton className="h-3 w-full bg-muted/30" />
            </div>
          );
        })}
      </div>
    </ShimmerWrapper>
  );
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ShimmerWrapper className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Skeleton className="h-5 w-32 bg-muted/70" />
        <Skeleton className="h-8 w-20 rounded-lg bg-muted/60" />
      </div>
      
      {/* Table header */}
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex gap-4">
        <Skeleton className="h-3 w-32 bg-muted/50" />
        <Skeleton className="h-3 w-24 ml-auto bg-muted/50" />
        <Skeleton className="h-3 w-20 bg-muted/50" />
        <Skeleton className="h-3 w-16 bg-muted/50" />
      </div>
      
      {/* Rows with staggered animation */}
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="px-4 py-3 border-b border-border/50 flex items-center gap-4 animate-fade-in"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-8 h-8 rounded-full bg-muted/60" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28 bg-muted/70" />
              <Skeleton className="h-2.5 w-20 bg-muted/40" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full bg-primary/15" />
          <Skeleton className="h-3 w-12 bg-muted/50" />
          <Skeleton className="h-3 w-14 bg-muted/50" />
        </div>
      ))}
    </ShimmerWrapper>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <ShimmerWrapper className="p-6 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 bg-muted/70" />
        <Skeleton className="w-6 h-6 rounded bg-muted/50" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
          >
            <Skeleton className="w-10 h-10 rounded-lg bg-muted/60" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24 bg-muted/70" />
              <Skeleton className="h-2.5 w-16 bg-muted/40" />
            </div>
            <Skeleton className="h-5 w-8 bg-muted/50" />
          </div>
        ))}
      </div>
    </ShimmerWrapper>
  );
}

// Full page skeleton
export function DashboardPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-muted/70" />
          <Skeleton className="h-4 w-64 bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg bg-muted/60" />
          <Skeleton className="h-10 w-10 rounded-lg bg-muted/50" />
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
