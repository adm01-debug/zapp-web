import { useSLANotifications } from '@/hooks/useSLANotifications';

export const SLANotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useSLANotifications();
  
  return <>{children}</>;
};
