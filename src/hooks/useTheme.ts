import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
}

const THEME_STORAGE_KEY = 'theme';

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Apply theme to document with smooth transition
  const applyTheme = useCallback((newTheme: Theme, animate = true) => {
    const root = window.document.documentElement;
    const body = window.document.body;

    // Add transition class for smooth theme change
    if (animate) {
      root.style.setProperty('--theme-transition', '0.3s');
      body.classList.add('theme-transitioning');
    }

    // Determine actual theme
    let actualTheme: ResolvedTheme;
    if (newTheme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = newTheme;
    }

    // Remove old theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(actualTheme);
    
    // Update resolved theme
    setResolvedTheme(actualTheme);

    // Store in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);

    // Remove transition class after animation
    if (animate) {
      setTimeout(() => {
        root.style.removeProperty('--theme-transition');
        body.classList.remove('theme-transitioning');
      }, 300);
    }
  }, []);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between light and dark only
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Cycle through all three themes
  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const newTheme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
      applyTheme(newTheme);
      return newTheme;
    });
  }, [applyTheme]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme, false);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Listen for toggle-theme event
  useEffect(() => {
    const handleToggle = () => toggleTheme();
    document.addEventListener('toggle-theme', handleToggle);
    return () => document.removeEventListener('toggle-theme', handleToggle);
  }, [toggleTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    cycleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
}
