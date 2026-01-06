import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Base animated skeleton with shimmer
interface AnimatedSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function AnimatedSkeleton({ className, style, delay = 0 }: AnimatedSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay * 0.05 }}
      className={cn(
        'relative overflow-hidden bg-muted rounded-md',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'before:animate-shimmer',
        className
      )}
      style={style}
    />
  );
}

// Conversation list item skeleton
export function ConversationItemSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 rounded-xl"
    >
      {/* Avatar */}
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-3/4" />
      </div>
    </motion.div>
  );
}

// Conversation list skeleton
export function ConversationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationItemSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// Message bubble skeleton
export function MessageBubbleSkeleton({ 
  isOwn = false, 
  index = 0 
}: { 
  isOwn?: boolean; 
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex gap-2',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwn && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div
        className={cn(
          'max-w-[70%] space-y-2',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        <Skeleton 
          className={cn(
            'h-12 rounded-2xl',
            isOwn ? 'w-48 rounded-br-md' : 'w-56 rounded-bl-md'
          )}
        />
        <Skeleton className="h-2 w-16" />
      </div>
    </motion.div>
  );
}

// Chat panel skeleton
export function ChatPanelSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        <MessageBubbleSkeleton isOwn={false} index={0} />
        <MessageBubbleSkeleton isOwn={true} index={1} />
        <MessageBubbleSkeleton isOwn={false} index={2} />
        <MessageBubbleSkeleton isOwn={true} index={3} />
        <MessageBubbleSkeleton isOwn={false} index={4} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

// Dashboard stat card skeleton
export function StatCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="p-6 rounded-2xl border border-border bg-card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </motion.div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} index={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

// Contact card skeleton
export function ContactCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl border border-border bg-card flex items-center gap-4"
    >
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </motion.div>
  );
}

// Contacts list skeleton
export function ContactsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ContactCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 5 
}: { 
  rows?: number; 
  columns?: number;
}) {
  return (
    <div className="w-full border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 p-4 flex gap-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <motion.div
            key={rowIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rowIndex * 0.05 }}
            className="p-4 flex gap-4"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={cn(
                  'h-4 flex-1',
                  colIndex === 0 && 'w-8 flex-none'
                )} 
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="space-y-2"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </motion.div>
      ))}
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar and name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Notification item skeleton
export function NotificationItemSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 flex gap-3"
    >
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </motion.div>
  );
}

// Queue card skeleton
export function QueueCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </motion.div>
  );
}

// Generic card skeleton with variants
type SkeletonVariant = 'simple' | 'detailed' | 'compact';

export function CardSkeleton({ 
  variant = 'simple',
  index = 0
}: { 
  variant?: SkeletonVariant;
  index?: number;
}) {
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        className="p-3 rounded-lg border border-border flex items-center gap-3"
      >
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </motion.div>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="p-5 rounded-xl border border-border bg-card space-y-4"
      >
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl border border-border bg-card"
    >
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </motion.div>
  );
}
