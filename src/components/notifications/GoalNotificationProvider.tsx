import { useGoalNotifications } from '@/hooks/useGoalNotifications';

export function GoalNotificationProvider({ children }: { children: React.ReactNode }) {
  // Initialize goal notifications monitoring
  useGoalNotifications();

  return <>{children}</>;
}