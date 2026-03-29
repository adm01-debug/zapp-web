import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnsavedChangesProvider, useUnsavedChanges, useUnsavedChangesContext } from '@/hooks/useUnsavedChanges';
import React, { useEffect } from 'react';

function TestComponent({ id, shouldDirty = false }: { id: string; shouldDirty?: boolean }) {
  const { markDirty, markClean } = useUnsavedChanges(id);
  
  useEffect(() => {
    if (shouldDirty) markDirty();
  }, [shouldDirty, markDirty]);

  return (
    <div>
      <button onClick={markDirty} data-testid={`dirty-${id}`}>Mark Dirty</button>
      <button onClick={markClean} data-testid={`clean-${id}`}>Mark Clean</button>
    </div>
  );
}

function ConfirmTestComponent() {
  const ctx = useUnsavedChangesContext();
  const [result, setResult] = React.useState<string>('none');

  const handleConfirm = async () => {
    const ok = await ctx?.confirmNavigation();
    setResult(ok ? 'confirmed' : 'cancelled');
  };

  return (
    <div>
      <button onClick={handleConfirm} data-testid="confirm">Confirm</button>
      <span data-testid="result">{result}</span>
    </div>
  );
}

describe('useUnsavedChanges', () => {
  describe('Dirty State Management', () => {
    it('starts clean (no unsaved changes)', () => {
      let hasChanges = false;
      function Check() {
        const ctx = useUnsavedChangesContext();
        hasChanges = ctx?.hasAnyUnsavedChanges() ?? false;
        return null;
      }
      render(
        <UnsavedChangesProvider>
          <Check />
        </UnsavedChangesProvider>
      );
      expect(hasChanges).toBe(false);
    });

    it('markDirty sets unsaved state', () => {
      let hasChanges = false;
      function Check() {
        const ctx = useUnsavedChangesContext();
        const { markDirty } = useUnsavedChanges('test');
        
        return (
          <>
            <button onClick={() => { markDirty(); hasChanges = ctx?.hasAnyUnsavedChanges() ?? false; }} data-testid="dirty">
              Dirty
            </button>
          </>
        );
      }
      render(
        <UnsavedChangesProvider>
          <Check />
        </UnsavedChangesProvider>
      );
      fireEvent.click(screen.getByTestId('dirty'));
      expect(hasChanges).toBe(true);
    });

    it('markClean removes unsaved state', () => {
      let hasChanges = true;
      function Check() {
        const ctx = useUnsavedChangesContext();
        const { markDirty, markClean } = useUnsavedChanges('test');
        
        return (
          <>
            <button onClick={markDirty} data-testid="dirty">Dirty</button>
            <button onClick={() => { markClean(); hasChanges = ctx?.hasAnyUnsavedChanges() ?? true; }} data-testid="clean">Clean</button>
          </>
        );
      }
      render(
        <UnsavedChangesProvider>
          <Check />
        </UnsavedChangesProvider>
      );
      fireEvent.click(screen.getByTestId('dirty'));
      fireEvent.click(screen.getByTestId('clean'));
      expect(hasChanges).toBe(false);
    });

    it('tracks multiple components independently', () => {
      let hasChanges = false;
      function Check() {
        const ctx = useUnsavedChangesContext();
        useEffect(() => {
          hasChanges = ctx?.hasAnyUnsavedChanges() ?? false;
        });
        return null;
      }
      render(
        <UnsavedChangesProvider>
          <TestComponent id="form1" />
          <TestComponent id="form2" />
          <Check />
        </UnsavedChangesProvider>
      );
      
      // Mark form1 dirty
      fireEvent.click(screen.getByTestId('dirty-form1'));
      // Mark form1 clean
      fireEvent.click(screen.getByTestId('clean-form1'));
      // form2 still clean, so no unsaved changes
    });
  });

  describe('Confirmation Dialog', () => {
    it('skips dialog when no unsaved changes', async () => {
      render(
        <UnsavedChangesProvider>
          <ConfirmTestComponent />
        </UnsavedChangesProvider>
      );

      fireEvent.click(screen.getByTestId('confirm'));
      
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('confirmed');
      });
    });

    it('shows dialog when there are unsaved changes', () => {
      render(
        <UnsavedChangesProvider>
          <TestComponent id="form" shouldDirty />
          <ConfirmTestComponent />
        </UnsavedChangesProvider>
      );

      fireEvent.click(screen.getByTestId('confirm'));
      
      // Dialog should appear
      expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
    });

    it('confirm button in dialog resolves with true', async () => {
      render(
        <UnsavedChangesProvider>
          <TestComponent id="form" shouldDirty />
          <ConfirmTestComponent />
        </UnsavedChangesProvider>
      );

      fireEvent.click(screen.getByTestId('confirm'));
      fireEvent.click(screen.getByText('Sair sem salvar'));
      
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('confirmed');
      });
    });

    it('cancel button in dialog resolves with false', async () => {
      render(
        <UnsavedChangesProvider>
          <TestComponent id="form" shouldDirty />
          <ConfirmTestComponent />
        </UnsavedChangesProvider>
      );

      fireEvent.click(screen.getByTestId('confirm'));
      fireEvent.click(screen.getByText('Continuar editando'));
      
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('cancelled');
      });
    });
  });

  describe('Cleanup on Unmount', () => {
    it('cleans up dirty state when component unmounts', () => {
      let hasChanges = false;
      function Check() {
        const ctx = useUnsavedChangesContext();
        return (
          <button 
            onClick={() => { hasChanges = ctx?.hasAnyUnsavedChanges() ?? false; }}
            data-testid="check"
          >Check</button>
        );
      }
      
      const { rerender } = render(
        <UnsavedChangesProvider>
          <TestComponent id="form" shouldDirty />
          <Check />
        </UnsavedChangesProvider>
      );

      // Unmount the dirty component
      rerender(
        <UnsavedChangesProvider>
          <Check />
        </UnsavedChangesProvider>
      );

      fireEvent.click(screen.getByTestId('check'));
      expect(hasChanges).toBe(false);
    });
  });

  describe('beforeunload', () => {
    it('adds beforeunload listener', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(
        <UnsavedChangesProvider>
          <TestComponent id="form" />
        </UnsavedChangesProvider>
      );
      
      const beforeunloadCalls = addSpy.mock.calls.filter(c => c[0] === 'beforeunload');
      expect(beforeunloadCalls.length).toBeGreaterThan(0);
      addSpy.mockRestore();
    });
  });
});
