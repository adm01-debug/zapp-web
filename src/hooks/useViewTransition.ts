import { useCallback } from 'react';

/**
 * Hook that wraps navigation actions in the View Transitions API
 * when supported, with graceful fallback for unsupported browsers.
 */
export function useViewTransition() {
  const startTransition = useCallback((callback: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (doc.startViewTransition) {
      doc.startViewTransition(callback);
    } else {
      callback();
    }
  }, []);

  return { startTransition };
}
