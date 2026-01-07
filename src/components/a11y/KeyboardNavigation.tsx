import { useCallback, useRef, useState, useEffect, KeyboardEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Roving Tabindex Hook
interface UseRovingTabindexOptions {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useRovingTabindex({
  itemCount,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: UseRovingTabindexOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  
  const setItemRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);
  
  const focusItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item) {
      item.focus();
      setFocusedIndex(index);
    }
  }, []);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const prevKeys = orientation === 'horizontal' ? ['ArrowLeft'] : ['ArrowUp'];
    const nextKeys = orientation === 'horizontal' ? ['ArrowRight'] : ['ArrowDown'];
    
    if (orientation === 'both') {
      prevKeys.push('ArrowLeft', 'ArrowUp');
      nextKeys.push('ArrowRight', 'ArrowDown');
    }
    
    let newIndex = focusedIndex;
    
    if (prevKeys.includes(e.key)) {
      e.preventDefault();
      newIndex = focusedIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? itemCount - 1 : 0;
      }
    } else if (nextKeys.includes(e.key)) {
      e.preventDefault();
      newIndex = focusedIndex + 1;
      if (newIndex >= itemCount) {
        newIndex = loop ? 0 : itemCount - 1;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = itemCount - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(focusedIndex);
      return;
    }
    
    if (newIndex !== focusedIndex) {
      focusItem(newIndex);
    }
  }, [focusedIndex, itemCount, loop, orientation, onSelect, focusItem]);
  
  const getItemProps = useCallback((index: number) => ({
    ref: setItemRef(index),
    tabIndex: index === focusedIndex ? 0 : -1,
    onKeyDown: handleKeyDown,
    onFocus: () => setFocusedIndex(index),
    'aria-selected': index === focusedIndex,
  }), [focusedIndex, handleKeyDown, setItemRef]);
  
  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    focusItem,
  };
}

// Focus Visible Hook
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = () => setIsFocusVisible(true);
    const handleMouseDown = () => setIsFocusVisible(false);
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  const focusProps = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };
  
  return {
    isFocusVisible: isFocused && isFocusVisible,
    focusProps,
  };
}

// Skip Links Component
interface SkipLinksProps {
  links?: Array<{ id: string; label: string }>;
}

export function SkipLinks({ links = [
  { id: 'main-content', label: 'Ir para conteúdo principal' },
  { id: 'main-navigation', label: 'Ir para navegação' },
  { id: 'search', label: 'Ir para busca' },
] }: SkipLinksProps) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-0 focus-within:left-0 focus-within:z-[100] focus-within:p-4 focus-within:bg-background">
      <div className="flex gap-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// Live Region for Dynamic Content
interface LiveRegionProps {
  message: string;
  assertive?: boolean;
  className?: string;
}

export function LiveRegion({ message, assertive = false, className }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn("sr-only", className)}
    >
      {message}
    </div>
  );
}

// Focus Ring Component
interface FocusRingProps {
  children: ReactNode;
  className?: string;
  offset?: number;
}

export function FocusRing({ children, className, offset = 2 }: FocusRingProps) {
  const { isFocusVisible, focusProps } = useFocusVisible();
  
  return (
    <div {...focusProps} className={cn("relative inline-block", className)}>
      {children}
      {isFocusVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute inset-0 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none",
            `-m-[${offset}px]`
          )}
        />
      )}
    </div>
  );
}

// Keyboard Shortcut Display
interface KeyboardShortcutProps {
  keys: string[];
  description: string;
  className?: string;
}

export function KeyboardShortcut({ keys, description, className }: KeyboardShortcutProps) {
  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      'Mod': navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
      'Alt': navigator.platform.includes('Mac') ? '⌥' : 'Alt',
      'Shift': '⇧',
      'Enter': '↵',
      'Escape': 'Esc',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Backspace': '⌫',
      'Delete': '⌦',
      'Tab': '⇥',
      'Space': '␣',
    };
    return keyMap[key] || key.toUpperCase();
  };
  
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm">
              {formatKey(key)}
            </kbd>
            {i < keys.length - 1 && <span className="mx-0.5 text-muted-foreground">+</span>}
          </span>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );
}

// Vim-style Navigation Hook
interface UseVimNavigationOptions {
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onAction?: (action: 'enter' | 'escape' | 'delete') => void;
  enabled?: boolean;
}

export function useVimNavigation({
  onNavigate,
  onAction,
  enabled = true,
}: UseVimNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Only handle if not in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'j':
          onNavigate('down');
          break;
        case 'k':
          onNavigate('up');
          break;
        case 'h':
          onNavigate('left');
          break;
        case 'l':
          onNavigate('right');
          break;
        case 'enter':
          onAction?.('enter');
          break;
        case 'escape':
          onAction?.('escape');
          break;
        case 'd':
          if (e.shiftKey) {
            onAction?.('delete');
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNavigate, onAction]);
}

// Accessible List with Keyboard Navigation
interface AccessibleListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, props: Record<string, unknown>) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  label: string;
  className?: string;
}

export function AccessibleList<T>({
  items,
  renderItem,
  onSelect,
  orientation = 'vertical',
  label,
  className,
}: AccessibleListProps<T>) {
  const { getItemProps, focusedIndex } = useRovingTabindex({
    itemCount: items.length,
    orientation,
    onSelect: (index) => onSelect?.(items[index], index),
  });
  
  return (
    <ul
      role="listbox"
      aria-label={label}
      aria-orientation={orientation}
      className={cn(
        "focus:outline-none",
        orientation === 'horizontal' ? "flex gap-2" : "flex flex-col",
        className
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          role="option"
          className={cn(
            "cursor-pointer rounded-lg transition-colors focus:outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            focusedIndex === index && "bg-accent"
          )}
          {...getItemProps(index)}
        >
          {renderItem(item, index, getItemProps(index))}
        </li>
      ))}
    </ul>
  );
}

// Screen Reader Announcer Hook
export function useAnnouncer() {
  const [message, setMessage] = useState('');
  
  const announce = useCallback((text: string, assertive = false) => {
    setMessage('');
    // Small delay to ensure the announcement is picked up
    setTimeout(() => setMessage(text), 100);
  }, []);
  
  const Announcer = useCallback(() => (
    <LiveRegion message={message} />
  ), [message]);
  
  return { announce, Announcer };
}

// Focus Management Hook
export function useFocusManagement() {
  const previousFocus = useRef<HTMLElement | null>(null);
  
  const saveFocus = useCallback(() => {
    previousFocus.current = document.activeElement as HTMLElement;
  }, []);
  
  const restoreFocus = useCallback(() => {
    previousFocus.current?.focus();
  }, []);
  
  const moveFocus = useCallback((element: HTMLElement | null) => {
    element?.focus();
  }, []);
  
  return { saveFocus, restoreFocus, moveFocus };
}

// Accessible Dialog Focus Trap
interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  returnFocusOnDeactivate?: boolean;
}

export function FocusTrap({
  children,
  active = true,
  returnFocusOnDeactivate = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveFocus, restoreFocus } = useFocusManagement();
  
  useEffect(() => {
    if (!active) return;
    
    saveFocus();
    
    // Focus first focusable element
    const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElements?.[0]?.focus();
    
    return () => {
      if (returnFocusOnDeactivate) {
        restoreFocus();
      }
    };
  }, [active, returnFocusOnDeactivate, saveFocus, restoreFocus]);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !active) return;
    
    const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };
  
  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
