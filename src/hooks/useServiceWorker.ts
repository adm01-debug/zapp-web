import { useEffect } from 'react';
import { log } from '@/lib/logger';

export function useServiceWorker() {
  useEffect(() => {
    let updateInterval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const messageHandler = (event: MessageEvent) => {
      log.debug('[ServiceWorker] Message received:', event.data);

      if (event.data.type === 'NOTIFICATION_CLICK') {
        document.dispatchEvent(new CustomEvent('notification-click', {
          detail: event.data.data
        }));
      }
    };

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          if (cancelled) return;

          log.debug('[ServiceWorker] Registration successful:', registration.scope);

          // Check for updates periodically
          updateInterval = setInterval(() => {
            registration.update();
          }, 60000);

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  log.debug('[ServiceWorker] New content available');
                  document.dispatchEvent(new CustomEvent('sw-update-available'));
                }
              });
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', messageHandler);

        } catch (error) {
          log.error('[ServiceWorker] Registration failed:', error);
        }
      }
    };

    registerServiceWorker();

    return () => {
      cancelled = true;
      if (updateInterval) clearInterval(updateInterval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, []);
}
