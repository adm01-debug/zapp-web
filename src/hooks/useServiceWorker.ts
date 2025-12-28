import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          console.log('[ServiceWorker] Registration successful:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user
                  console.log('[ServiceWorker] New content available');
                  document.dispatchEvent(new CustomEvent('sw-update-available'));
                }
              });
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[ServiceWorker] Message received:', event.data);
            
            if (event.data.type === 'NOTIFICATION_CLICK') {
              document.dispatchEvent(new CustomEvent('notification-click', { 
                detail: event.data.data 
              }));
            }
          });

        } catch (error) {
          console.error('[ServiceWorker] Registration failed:', error);
        }
      }
    };

    registerServiceWorker();
  }, []);
}
