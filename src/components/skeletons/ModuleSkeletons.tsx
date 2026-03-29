import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for the Inbox view — mimics the conversation list + chat area */
export function InboxSkeleton() {
  return (
    <div className="flex h-full" role="status" aria-busy="true" aria-label="Carregando inbox">
      {/* Conversation list */}
      <div className="w-80 border-r border-border p-3 space-y-2 hidden md:block">
        <Skeleton className="h-9 w-full rounded-lg mb-3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="h-14 border-b border-border px-4 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {[false, true, false, true, false].map((isAgent, i) => (
            <div key={i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <Skeleton
                className={`h-10 rounded-2xl ${isAgent ? 'w-48' : 'w-56'}`}
                style={{ opacity: 1 - i * 0.12 }}
              />
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="h-16 border-t border-border px-4 flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Carregando conversas...</span>
    </div>
  );
}

/** Skeleton for the Contacts view */
export function ContactsSkeleton() {
  return (
    <div className="p-6 space-y-5" role="status" aria-busy="true" aria-label="Carregando contatos">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-md rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Table header */}
      <div className="flex gap-4 px-4 py-2">
        {['w-8', 'w-40', 'w-32', 'w-28', 'w-24', 'w-20'].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <span className="sr-only">Carregando lista de contatos...</span>
    </div>
  );
}

/** Skeleton for the Dashboard view */
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-busy="true" aria-label="Carregando dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
      <span className="sr-only">Carregando dashboard...</span>
    </div>
  );
}
