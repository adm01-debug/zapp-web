import { Skeleton } from '@/components/ui/skeleton';

export function ContactDetailsSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>

      {/* Info sections */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-10" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function QueueListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
