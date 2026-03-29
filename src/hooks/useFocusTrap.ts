import { useEffect, useRef } from 'react';

/**
 * Traps focus within a container while active.
 * Useful for modals, drawers, and panels to prevent
 * keyboard focus from escaping.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Remember what was focused before
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusableElements() {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(el => el.offsetParent !== null); // visible only
    }

    // Focus first element
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
