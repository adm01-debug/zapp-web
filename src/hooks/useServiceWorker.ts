import { useEffect, useRef } from 'react';
import { log } from '@/lib/logger';

export function useServiceWorker() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    if (!('serviceWorker' in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        log.debug('[ServiceWorker] Registration successful:', registration.scope);

        // Check for updates every 5 minutes (was 1 min — too frequent)
        const intervalId = setInterval(() => {
          registration.update();
        }, 300_000);

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
        const onMessage = (event: MessageEvent) => {
          log.debug('[ServiceWorker] Message received:', event.data);
          if (event.data.type === 'NOTIFICATION_CLICK') {
            document.dispatchEvent(new CustomEvent('notification-click', {
              detail: event.data.data,
            }));
          }
        };
        navigator.serviceWorker.addEventListener('message', onMessage);

        // Cleanup on unmount (interval was leaking before)
        return () => {
          clearInterval(intervalId);
          navigator.serviceWorker.removeEventListener('message', onMessage);
        };
      } catch (error) {
        log.error('[ServiceWorker] Registration failed:', error);
      }
    };

    registerServiceWorker();
  }, []);
}
