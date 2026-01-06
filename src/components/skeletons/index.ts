// Core skeleton components
export { Skeleton, SkeletonCard, SkeletonList } from '@/components/ui/skeleton';

// Conversation skeletons
export { 
  ConversationListSkeleton, 
  ConversationListCompactSkeleton 
} from './ConversationListSkeleton';

// Message skeletons
export { 
  MessageListSkeleton, 
  ChatHeaderSkeleton, 
  ChatInputSkeleton 
} from './MessageListSkeleton';

// Dashboard skeletons
export { 
  DashboardStatCardSkeleton,
  DashboardStatsSkeleton,
  DashboardChartSkeleton,
  DashboardTableSkeleton,
  DashboardWidgetSkeleton,
  DashboardPageSkeleton
} from './DashboardSkeletons';

// Generic skeletons
export { 
  ContactDetailsSkeleton,
  NotificationListSkeleton,
  AgentListSkeleton,
  QueueListSkeleton
} from './GenericSkeletons';

// Loading states
export { 
  LoadingSpinner,
  LoadingDots,
  FullPageLoading,
  InlineLoading,
  CardLoading,
  TableLoading,
  ButtonLoading,
  LoadingStates
} from '@/components/ui/loading-states';

// Hook for standardized loading state
export { useLoadingState, getSkeletonType } from '@/hooks/useLoadingState';

// Types
export type { SkeletonContext } from '@/hooks/useLoadingState';
