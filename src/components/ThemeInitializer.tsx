import { useEffect } from 'react';
import { PRESETS, CSS_VARS_TO_APPLY, STORAGE_KEY } from '@/components/settings/theme/presets';
import type { ThemeModeColors } from '@/components/settings/theme/presets';
import { useTheme } from '@/hooks/useTheme';

/**
 * Global theme initializer — must be mounted at the app root.
 * Restores saved skin (preset + border-radius) on every page load
 * and re-applies when light/dark mode changes.
 * Also caches computed CSS vars in localStorage for the inline
 * flash-prevention script in index.html.
 */
export function ThemeInitializer() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let presetId = 'corporate';
    let radius = 8;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        presetId = parsed.preset === 'default' ? 'purpure' : (parsed.preset || 'corporate');
        if (parsed.borderRadius != null) radius = parsed.borderRadius;
      } catch { /* corrupted */ }
    }

    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      const colors: ThemeModeColors = resolvedTheme === 'dark' ? preset.dark : preset.light;
      const root = document.documentElement;
      const cssVarsCache: Record<string, string> = {};

      for (const key of CSS_VARS_TO_APPLY) {
        const value = colors[key];
        root.style.setProperty(`--${key}`, value);
        cssVarsCache[key] = value;
      }

      // Cache for the inline flash-prevention script
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        stored.cssVarsCache = cssVarsCache;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch { /* ignore */ }
    }

    document.documentElement.style.setProperty('--radius', `${radius / 16}rem`);
  }, [resolvedTheme]);

  return null;
}
