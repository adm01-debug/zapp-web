import { useEffect, useRef, useCallback, createContext, useContext, useState } from 'react';

interface UnsavedChangesContextValue {
  /** Register that a component has unsaved changes */
  setHasUnsavedChanges: (id: string, hasChanges: boolean) => void;
  /** Check if any component has unsaved changes */
  hasAnyUnsavedChanges: () => boolean;
  /** Show confirmation and resolve with user's choice */
  confirmNavigation: () => Promise<boolean>;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyMap = useRef<Map<string, boolean>>(new Map());
  const [showDialog, setShowDialog] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const setHasUnsavedChanges = useCallback((id: string, hasChanges: boolean) => {
    if (hasChanges) {
      dirtyMap.current.set(id, true);
    } else {
      dirtyMap.current.delete(id);
    }
  }, []);

  const hasAnyUnsavedChanges = useCallback(() => {
    return dirtyMap.current.size > 0;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!hasAnyUnsavedChanges()) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setShowDialog(true);
    });
  }, [hasAnyUnsavedChanges]);

  const handleConfirm = useCallback(() => {
    dirtyMap.current.clear();
    setShowDialog(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  // Warn on browser tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedChanges()) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsavedChanges]);

  return (
    <UnsavedChangesContext.Provider value={{ setHasUnsavedChanges, hasAnyUnsavedChanges, confirmNavigation }}>
      {children}
      {showDialog && <UnsavedChangesDialog onConfirm={handleConfirm} onCancel={handleCancel} />}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(id: string) {
  const ctx = useContext(UnsavedChangesContext);
  
  const markDirty = useCallback(() => {
    ctx?.setHasUnsavedChanges(id, true);
  }, [ctx, id]);

  const markClean = useCallback(() => {
    ctx?.setHasUnsavedChanges(id, false);
  }, [ctx, id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      ctx?.setHasUnsavedChanges(id, false);
    };
  }, [ctx, id]);

  return { markDirty, markClean, confirmNavigation: ctx?.confirmNavigation ?? (() => Promise.resolve(true)) };
}

export function useUnsavedChangesContext() {
  return useContext(UnsavedChangesContext);
}

/** Internal dialog component */
function UnsavedChangesDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--warning))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Alterações não salvas</h3>
            <p className="text-sm text-muted-foreground">Deseja sair sem salvar?</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Continuar editando
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Sair sem salvar
          </button>
        </div>
      </div>
    </div>
  );
}
