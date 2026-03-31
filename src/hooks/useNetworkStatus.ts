import { useState, useEffect, useCallback } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('NetworkStatus');

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // true if user was offline and came back
  downSince: Date | null;
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
}

/**
 * Hook to monitor network status with connection quality detection.
 * Provides offline/online state and recovery detection for UX improvements.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    downSince: navigator.onLine ? null : new Date(),
    effectiveType: (navigator as any).connection?.effectiveType,
  });

  const handleOnline = useCallback(() => {
    log.info('Network restored');
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: true,
      downSince: null,
      effectiveType: (navigator as any).connection?.effectiveType,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    log.warn('Network lost');
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      downSince: new Date(),
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection quality changes
    const connection = (navigator as any).connection;
    const handleConnectionChange = () => {
      setStatus((prev) => ({
        ...prev,
        effectiveType: connection?.effectiveType,
      }));
    };

    connection?.addEventListener?.('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', handleConnectionChange);
    };
  }, [handleOnline, handleOffline]);

  return status;
}
