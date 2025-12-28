import { Skeleton } from '@/components/ui/skeleton';

export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => {
        const isReceived = i % 3 !== 0;
        return (
          <div
            key={i}
            className={`flex ${isReceived ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[70%] ${isReceived ? 'items-start' : 'items-end'}`}>
              <Skeleton 
                className={`rounded-2xl ${
                  isReceived 
                    ? 'rounded-bl-sm' 
                    : 'rounded-br-sm'
                } ${
                  i % 4 === 0 
                    ? 'h-32 w-48' // Image message
                    : i % 5 === 0 
                    ? 'h-12 w-64' // Audio message
                    : `h-${6 + (i % 3) * 2} w-${40 + (i % 4) * 10}`
                }`}
                style={{
                  height: i % 4 === 0 ? 128 : i % 5 === 0 ? 48 : 24 + (i % 3) * 8,
                  width: i % 4 === 0 ? 192 : i % 5 === 0 ? 256 : 160 + (i % 4) * 40
                }}
              />
              <div className={`flex items-center gap-1 mt-1 ${isReceived ? '' : 'justify-end'}`}>
                <Skeleton className="h-2.5 w-10" />
                {!isReceived && <Skeleton className="h-2.5 w-4" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ChatInputSkeleton() {
  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-center gap-2">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      </div>
    </div>
  );
}
