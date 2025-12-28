import { Skeleton } from '@/components/ui/skeleton';

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          {/* Avatar */}
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and time */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            
            {/* Message preview */}
            <Skeleton className="h-3 w-full" />
            
            {/* Tags */}
            <div className="flex gap-1">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </div>

          {/* Unread badge */}
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ConversationListCompactSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-0.5 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <Skeleton className="w-4 h-4 rounded-full" />
        </div>
      ))}
    </div>
  );
}
