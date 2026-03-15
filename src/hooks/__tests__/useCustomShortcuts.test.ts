import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useCustomShortcuts } from '@/hooks/useCustomShortcuts';

describe('useCustomShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with default shortcuts', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    expect(result.current.shortcuts).toBeDefined();
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it('getShortcut returns binding by id', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    const sendMessage = result.current.getShortcut('send-message');
    expect(sendMessage).toBeDefined();
    expect(sendMessage?.id).toBe('send-message');
  });

  it('getShortcut returns undefined for unknown id', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    const unknown = result.current.getShortcut('nonexistent');
    expect(unknown).toBeUndefined();
  });

  it('shortcuts have required fields', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    result.current.shortcuts.forEach(shortcut => {
      expect(shortcut.id).toBeTruthy();
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.defaultKey).toBeTruthy();
      expect(shortcut.category).toBeTruthy();
    });
  });

  it('shortcuts have valid categories', () => {
    const validCategories = ['chat', 'navigation', 'actions', 'selection'];
    const { result } = renderHook(() => useCustomShortcuts());
    result.current.shortcuts.forEach(shortcut => {
      expect(validCategories).toContain(shortcut.category);
    });
  });

  it('exposes updateShortcut function', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    expect(typeof result.current.updateShortcut).toBe('function');
  });

  it('exposes resetShortcut function', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    expect(typeof result.current.resetShortcut).toBe('function');
  });

  it('exposes resetAll function', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    expect(typeof result.current.resetAll).toBe('function');
  });

  it('resetAll restores defaults', () => {
    const { result } = renderHook(() => useCustomShortcuts());

    act(() => {
      result.current.resetAll();
    });

    const shortcuts = result.current.shortcuts;
    shortcuts.forEach(s => {
      expect(s.customKey).toBeUndefined();
    });
  });

  it('getShortcutsByCategory filters by category', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    const chatShortcuts = result.current.getShortcutsByCategory('chat');
    expect(chatShortcuts.length).toBeGreaterThan(0);
    chatShortcuts.forEach(s => {
      expect(s.category).toBe('chat');
    });
  });

  it('no duplicate shortcut IDs', () => {
    const { result } = renderHook(() => useCustomShortcuts());
    const ids = result.current.shortcuts.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
