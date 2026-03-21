import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useToast, toast, reducer } from '@/hooks/use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reducer', () => {
    const emptyState = { toasts: [] };

    it('ADD_TOAST adds a toast', () => {
      const newToast = { id: '1', title: 'Test', open: true } as any;
      const result = reducer(emptyState, { type: 'ADD_TOAST', toast: newToast });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
    });

    it('ADD_TOAST limits to TOAST_LIMIT (1)', () => {
      const state = { toasts: [{ id: '1', title: 'First', open: true } as any] };
      const newToast = { id: '2', title: 'Second', open: true } as any;
      const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('UPDATE_TOAST updates matching toast', () => {
      const state = { toasts: [{ id: '1', title: 'Old', open: true } as any] };
      const result = reducer(state, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'New' } });
      expect(result.toasts[0].title).toBe('New');
    });

    it('DISMISS_TOAST sets open to false', () => {
      const state = { toasts: [{ id: '1', title: 'Test', open: true } as any] };
      const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
      expect(result.toasts[0].open).toBe(false);
    });

    it('DISMISS_TOAST without id dismisses all', () => {
      const state = { toasts: [
        { id: '1', open: true } as any,
        { id: '2', open: true } as any,
      ]};
      const result = reducer(state, { type: 'DISMISS_TOAST' });
      result.toasts.forEach(t => expect(t.open).toBe(false));
    });

    it('REMOVE_TOAST removes matching toast', () => {
      const state = { toasts: [{ id: '1', title: 'Test' } as any] };
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
      expect(result.toasts).toHaveLength(0);
    });

    it('REMOVE_TOAST without id clears all toasts', () => {
      const state = { toasts: [{ id: '1' } as any, { id: '2' } as any] };
      const result = reducer(state, { type: 'REMOVE_TOAST', toastId: undefined });
      expect(result.toasts).toHaveLength(0);
    });
  });

  describe('useToast hook', () => {
    it('returns toasts array and toast function', () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts).toBeDefined();
      expect(typeof result.current.toast).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
    });

    it('toast() adds a toast and returns id, dismiss, update', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: ReturnType<typeof toast>;
      act(() => {
        toastResult = result.current.toast({ title: 'Hello' });
      });

      expect(toastResult!.id).toBeDefined();
      expect(typeof toastResult!.dismiss).toBe('function');
      expect(typeof toastResult!.update).toBe('function');
      expect(result.current.toasts.length).toBeGreaterThanOrEqual(1);
    });

    it('dismiss() sets toast open to false', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: ReturnType<typeof toast>;
      act(() => {
        toastResult = result.current.toast({ title: 'To dismiss' });
      });

      act(() => {
        result.current.dismiss(toastResult!.id);
      });

      const found = result.current.toasts.find(t => t.id === toastResult!.id);
      expect(found?.open).toBe(false);
    });
  });

  describe('toast standalone function', () => {
    it('returns id, dismiss and update', () => {
      const result = toast({ title: 'Standalone' });
      expect(result.id).toBeDefined();
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.update).toBe('function');
    });
  });
});
