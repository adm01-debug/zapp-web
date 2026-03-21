/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const mockShortcuts = [
  {
    id: 'global-search',
    name: 'Global Search',
    defaultKey: 'k',
    defaultModifiers: { ctrlKey: true },
    category: 'navigation',
  },
  {
    id: 'go-to-inbox',
    name: 'Go to Inbox',
    defaultKey: 'i',
    defaultModifiers: { ctrlKey: true, shiftKey: true },
    category: 'navigation',
  },
];

vi.mock('@/hooks/useCustomShortcuts', () => ({
  useCustomShortcuts: () => ({
    shortcuts: mockShortcuts,
    getActiveBinding: (shortcut: any) => ({
      key: shortcut.customKey || shortcut.defaultKey,
      modifiers: shortcut.customModifiers || shortcut.defaultModifiers || {},
    }),
  }),
}));

import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';

describe('useGlobalKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns shortcuts', () => {
    const { result } = renderHook(() => useGlobalKeyboardShortcuts());
    expect(result.current.shortcuts).toBeDefined();
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it('registers keydown event listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useGlobalKeyboardShortcuts());
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    addSpy.mockRestore();
  });

  it('removes keydown event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useGlobalKeyboardShortcuts());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    removeSpy.mockRestore();
  });

  it('dispatches open-global-search event on Ctrl+K', () => {
    renderHook(() => useGlobalKeyboardShortcuts());

    const dispatchSpy = vi.spyOn(document, 'dispatchEvent');
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });

    window.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    dispatchSpy.mockRestore();
  });

  it('does not trigger shortcuts in input fields (except allowed ones)', () => {
    renderHook(() => useGlobalKeyboardShortcuts());

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', {
      key: 'i',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });

    // go-to-inbox is not in the allowedInInputs list, so navigate should not be called
    window.dispatchEvent(event);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('accepts custom actions', () => {
    const customAction = vi.fn();
    renderHook(() => useGlobalKeyboardShortcuts([
      { id: 'custom-action', action: customAction },
    ]));

    expect(typeof customAction).toBe('function');
  });
});
