import { useRealtimeSentimentAlerts } from '@/hooks/useRealtimeSentimentAlerts';

export function RealtimeSentimentAlertProvider() {
  // This hook sets up the realtime subscription
  useRealtimeSentimentAlerts();
  
  // This component doesn't render anything visible
  return null;
}
