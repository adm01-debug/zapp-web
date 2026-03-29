import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

// Mock window.history and location.hash
const originalHash = window.location.hash;
const pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, hash: '' },
  });
  pushStateSpy.mockClear();
});

afterEach(() => {
  window.location.hash = originalHash;
});

describe('useNavigationHistory', () => {
  describe('Initialization', () => {
    it('starts with default view "inbox"', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      expect(result.current.currentView).toBe('inbox');
    });

    it('starts with custom default view', () => {
      const { result } = renderHook(() => useNavigationHistory('dashboard'));
      expect(result.current.currentView).toBe('dashboard');
    });

    it('initializes with canGoBack=false and canGoForward=false', () => {
      const { result } = renderHook(() => useNavigationHistory());
      expect(result.current.canGoBack).toBe(false);
      expect(result.current.canGoForward).toBe(false);
    });

    it('has empty breadcrumb trail initially (just current)', () => {
      const { result } = renderHook(() => useNavigationHistory());
      expect(result.current.breadcrumbTrail.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Forward Navigation', () => {
    it('navigates to a new view', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      expect(result.current.currentView).toBe('dashboard');
    });

    it('enables canGoBack after navigating forward', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      expect(result.current.canGoBack).toBe(true);
    });

    it('does not navigate to same view (no-op)', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      const initialHistory = result.current.history.length;
      act(() => result.current.navigateTo('inbox'));
      expect(result.current.history.length).toBe(initialHistory);
    });

    it('handles rapid sequential navigation', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('dashboard');
        result.current.navigateTo('contacts');
        result.current.navigateTo('settings');
        result.current.navigateTo('agents');
      });
      expect(result.current.currentView).toBe('agents');
      expect(result.current.canGoBack).toBe(true);
    });

    it('navigates through 20+ views without issues', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      const views = Array.from({ length: 25 }, (_, i) => `view-${i}`);
      act(() => {
        views.forEach(v => result.current.navigateTo(v));
      });
      expect(result.current.currentView).toBe('view-24');
      expect(result.current.canGoBack).toBe(true);
    });
  });

  describe('Back Navigation', () => {
    it('goes back to previous view', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('inbox');
    });

    it('disables canGoBack at start of history', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      act(() => result.current.goBack());
      expect(result.current.canGoBack).toBe(false);
    });

    it('enables canGoForward after going back', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      act(() => result.current.goBack());
      expect(result.current.canGoForward).toBe(true);
    });

    it('does nothing when canGoBack is false', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('inbox');
    });

    it('handles back through multiple steps', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('a');
        result.current.navigateTo('b');
        result.current.navigateTo('c');
      });
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('b');
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('a');
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('inbox');
      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Forward Navigation After Back', () => {
    it('goes forward after going back', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      act(() => result.current.goBack());
      act(() => result.current.goForward());
      expect(result.current.currentView).toBe('dashboard');
    });

    it('truncates forward history when navigating to new view after back', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('a');
        result.current.navigateTo('b');
      });
      act(() => result.current.goBack()); // at 'a'
      act(() => result.current.navigateTo('c')); // should truncate 'b'
      expect(result.current.canGoForward).toBe(false);
      expect(result.current.currentView).toBe('c');
    });

    it('does nothing when canGoForward is false', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.goForward());
      expect(result.current.currentView).toBe('inbox');
    });
  });

  describe('Breadcrumb Trail', () => {
    it('builds breadcrumb trail with navigation', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('dashboard');
        result.current.navigateTo('contacts');
      });
      expect(result.current.breadcrumbTrail).toContain('inbox');
      expect(result.current.breadcrumbTrail).toContain('contacts');
    });

    it('deduplicates consecutive same-view entries', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('a');
        result.current.navigateTo('b');
      });
      // No consecutive duplicates
      const trail = result.current.breadcrumbTrail;
      for (let i = 1; i < trail.length; i++) {
        expect(trail[i]).not.toBe(trail[i - 1]);
      }
    });

    it('limits breadcrumb depth to 4', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.navigateTo(`view-${i}`);
        }
      });
      expect(result.current.breadcrumbTrail.length).toBeLessThanOrEqual(4);
    });
  });

  describe('History Limit', () => {
    it('caps history at MAX_HISTORY (50)', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.navigateTo(`view-${i}`);
        }
      });
      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Hash Sync', () => {
    it('pushes hash state on navigation', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => result.current.navigateTo('dashboard'));
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '#dashboard');
    });
  });

  describe('Edge Cases', () => {
    it('handles back then forward then back', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('a');
        result.current.navigateTo('b');
      });
      act(() => result.current.goBack());
      act(() => result.current.goForward());
      act(() => result.current.goBack());
      expect(result.current.currentView).toBe('a');
    });

    it('handles navigating to same view repeatedly (no-op)', () => {
      const { result } = renderHook(() => useNavigationHistory('inbox'));
      act(() => {
        result.current.navigateTo('a');
        result.current.navigateTo('a');
        result.current.navigateTo('a');
      });
      expect(result.current.history.length).toBe(2); // inbox + a
    });
  });
});
