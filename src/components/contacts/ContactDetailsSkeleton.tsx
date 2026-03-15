import { Skeleton } from '@/components/ui/skeleton';

export function ContactDetailsSkeleton() {
  return (
    <div className="w-80 h-full bg-sidebar border-l border-border/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 bg-card">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Avatar section */}
      <div className="p-6 flex flex-col items-center gap-3 border-b border-border/30">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 space-y-4">
        {/* Phone */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        {/* Email */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-44" />
        </div>
        {/* Date */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Assignment */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Custom fields */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
