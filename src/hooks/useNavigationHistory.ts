import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface NavigationEntry {
  viewId: string;
  timestamp: number;
}

interface NavigationHistoryReturn {
  currentView: string;
  navigateTo: (viewId: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Breadcrumb trail (last N entries, deduplicated consecutive) */
  breadcrumbTrail: string[];
  /** Previous view id (for transition direction) */
  previousView: string | null;
  /** Full history stack */
  history: NavigationEntry[];
}

const MAX_HISTORY = 50;
const BREADCRUMB_DEPTH = 4;

/**
 * Navigation history with back/forward stacks, breadcrumb trail,
 * and URL hash sync for deep linking.
 */
export function useNavigationHistory(defaultView = 'inbox'): NavigationHistoryReturn {
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || defaultView;
  };

  const [history, setHistory] = useState<NavigationEntry[]>([
    { viewId: getInitialView(), timestamp: Date.now() },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const previousViewRef = useRef<string | null>(null);
  const isInternalNav = useRef(false);

  const currentView = history[currentIndex]?.viewId ?? defaultView;

  // Sync hash → state on browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      if (isInternalNav.current) {
        isInternalNav.current = false;
        return;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentView) {
        navigateTo(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const syncHash = useCallback((viewId: string) => {
    isInternalNav.current = true;
    window.history.pushState(null, '', `#${viewId}`);
  }, []);

  const navigateTo = useCallback((viewId: string) => {
    if (viewId === currentView) return;

    previousViewRef.current = currentView;

    setHistory(prev => {
      // Truncate forward history
      const truncated = prev.slice(0, currentIndex + 1);
      const newEntry: NavigationEntry = { viewId, timestamp: Date.now() };
      const newHistory = [...truncated, newEntry].slice(-MAX_HISTORY);
      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIdx = Math.min(prev + 1, MAX_HISTORY - 1);
      return newIdx;
    });

    syncHash(viewId);
  }, [currentView, currentIndex, syncHash]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    previousViewRef.current = currentView;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    const targetView = history[newIndex]?.viewId;
    if (targetView) syncHash(targetView);
  }, [currentIndex, currentView, history, syncHash]);

  const goForward = useCallback(() => {
    if (currentIndex >= history.length - 1) return;
    previousViewRef.current = currentView;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    const targetView = history[newIndex]?.viewId;
    if (targetView) syncHash(targetView);
  }, [currentIndex, currentView, history, syncHash]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  const breadcrumbTrail = useMemo(() => {
    const trail: string[] = [];
    // Walk backwards from current, deduplicate consecutive
    for (let i = currentIndex; i >= 0 && trail.length < BREADCRUMB_DEPTH; i--) {
      const viewId = history[i].viewId;
      if (trail.length === 0 || trail[trail.length - 1] !== viewId) {
        trail.push(viewId);
      }
    }
    return trail.reverse();
  }, [history, currentIndex]);

  return {
    currentView,
    navigateTo,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    breadcrumbTrail,
    previousView: previousViewRef.current,
    history,
  };
}
