import * as React from 'react';
import { useCallback, useRef, useEffect } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: boolean;
  onEscape?: () => void;
}

/**
 * Traps focus within the container for modal dialogs and overlays
 */
export function FocusTrap({ 
  children, 
  active = true,
  initialFocus,
  returnFocus = true,
  onEscape
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter(el => el.offsetParent !== null);
  }, []);

  useEffect(() => {
    if (!active) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusInitial = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    const timeoutId = setTimeout(focusInitial, 10);

    return () => {
      clearTimeout(timeoutId);
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, initialFocus, returnFocus, getFocusableElements]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!active) return;

    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

// Skip link component for accessibility
export function SkipLink({ 
  href = '#main-content', 
  children = 'Pular para o conteúdo principal' 
}: { 
  href?: string; 
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {children}
    </a>
  );
}

// Announce for screen readers
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'sr-only');
    document.body.appendChild(announcer);

    setTimeout(() => {
      announcer.textContent = message;
    }, 100);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return announce;
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Keyboard navigation hook
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          newIndex = loop 
            ? (activeIndex + 1) % items.length 
            : Math.min(activeIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          newIndex = loop 
            ? (activeIndex - 1 + items.length) % items.length 
            : Math.max(activeIndex - 1, 0);
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = loop 
            ? (activeIndex + 1) % items.length 
            : Math.min(activeIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = loop 
            ? (activeIndex - 1 + items.length) % items.length 
            : Math.max(activeIndex - 1, 0);
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(activeIndex);
        return;
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      items[newIndex]?.focus();
    }
  }, [activeIndex, items, orientation, loop, onSelect]);

  return { activeIndex, setActiveIndex, handleKeyDown };
}
