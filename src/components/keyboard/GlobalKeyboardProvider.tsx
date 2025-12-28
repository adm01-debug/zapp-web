import React, { useEffect, useState, useCallback } from 'react';
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

interface GlobalKeyboardProviderProps {
  children: React.ReactNode;
  customActions?: { id: string; action: () => void }[];
}

export function GlobalKeyboardProvider({ children, customActions }: GlobalKeyboardProviderProps) {
  const [showHelp, setShowHelp] = useState(false);

  // Initialize global shortcuts
  useGlobalKeyboardShortcuts([
    ...(customActions || []),
    {
      id: 'show-shortcuts-help',
      action: () => setShowHelp(true),
    },
  ]);

  // Listen for custom events
  useEffect(() => {
    const handleShowHelp = () => setShowHelp(true);
    
    document.addEventListener('show-shortcuts-help', handleShowHelp);
    return () => {
      document.removeEventListener('show-shortcuts-help', handleShowHelp);
    };
  }, []);

  // Add ? shortcut for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          setShowHelp(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
}
