import { cn } from '@/lib/utils';

interface MobileSkeletonProps {
  variant?: 'list' | 'chat' | 'dashboard' | 'detail';
  className?: string;
}

function Pulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted/60 rounded-lg', className)} />;
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Pulse className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Pulse className="h-4 w-28" />
          <Pulse className="h-3 w-10" />
        </div>
        <Pulse className="h-3.5 w-full" />
      </div>
    </div>
  );
}

function ChatMessageSkeleton({ isAgent }: { isAgent: boolean }) {
  return (
    <div className={cn('flex px-4 py-1', isAgent ? 'justify-end' : 'justify-start')}>
      <div className={cn('space-y-1', isAgent ? 'items-end' : 'items-start')}>
        <Pulse className={cn('h-10 rounded-2xl', isAgent ? 'w-48' : 'w-56')} />
      </div>
    </div>
  );
}

function DashboardCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-4 w-24" />
        <Pulse className="h-8 w-8 rounded-lg" />
      </div>
      <Pulse className="h-8 w-20" />
      <Pulse className="h-3 w-32" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Pulse className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-3.5 w-24" />
        </div>
      </div>
      <Pulse className="h-px w-full" />
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <Pulse className="h-4 w-20" />
          <Pulse className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function MobileSkeleton({ variant = 'list', className }: MobileSkeletonProps) {
  switch (variant) {
    case 'list':
      return (
        <div className={cn('space-y-0 divide-y divide-border/30', className)}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      );
    case 'chat':
      return (
        <div className={cn('space-y-2 py-4', className)}>
          {[false, false, true, false, true, true, false].map((isAgent, i) => (
            <ChatMessageSkeleton key={i} isAgent={isAgent} />
          ))}
        </div>
      );
    case 'dashboard':
      return (
        <div className={cn('grid grid-cols-2 gap-3 p-4', className)}>
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      );
    case 'detail':
      return <DetailSkeleton />;
    default:
      return null;
  }
}
