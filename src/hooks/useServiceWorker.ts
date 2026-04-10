import { useEffect, useRef } from 'react';
import { log } from '@/lib/logger';

const LEGACY_CACHE_PREFIXES = ['whatsapp-crm-v'];
const LEGACY_SW_RESET_FLAG = 'legacy-sw-reset-done';

async function cleanupLegacyServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || typeof caches === 'undefined') return false;

  const cacheKeys = await caches.keys();
  const legacyCacheKeys = cacheKeys.filter((key) =>
    LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );

  if (legacyCacheKeys.length === 0) {
    sessionStorage.removeItem(LEGACY_SW_RESET_FLAG);
    return false;
  }

  log.info('[ServiceWorker] Cleaning legacy caches that can restore stale UI', legacyCacheKeys);

  const registrations = navigator.serviceWorker.getRegistrations
    ? await navigator.serviceWorker.getRegistrations()
    : [];

  await Promise.all(registrations.map((registration) => registration.unregister()));
  await Promise.all(legacyCacheKeys.map((key) => caches.delete(key)));

  if (sessionStorage.getItem(LEGACY_SW_RESET_FLAG) !== '1') {
    sessionStorage.setItem(LEGACY_SW_RESET_FLAG, '1');
    window.location.reload();
    return true;
  }

  return false;
}

export function useServiceWorker() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    if (!('serviceWorker' in navigator)) return;

    let cleanup: (() => void) | undefined;
    let disposed = false;

    const registerServiceWorker = async () => {
      try {
        const reloadedForLegacyCleanup = await cleanupLegacyServiceWorker();
        if (reloadedForLegacyCleanup || disposed) return;

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (disposed) return;

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
        cleanup = () => {
          clearInterval(intervalId);
          navigator.serviceWorker.removeEventListener('message', onMessage);
        };
      } catch (error) {
        log.error('[ServiceWorker] Registration failed:', error);
      }
    };

    void registerServiceWorker();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
}
