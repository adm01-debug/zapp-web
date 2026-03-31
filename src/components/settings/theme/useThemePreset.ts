import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PRESETS, CSS_VARS_TO_APPLY, STORAGE_KEY } from './presets';
import type { ThemePreset } from './presets';

interface ThemeConfig {
  preset: string;
  borderRadius: number;
}

export function useThemePreset() {
  const [activePreset, setActivePreset] = useState<string>('default');
  const [borderRadius, setBorderRadius] = useState<number>(8);

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: ThemeConfig = JSON.parse(saved);
        if (parsed.preset) {
          setActivePreset(parsed.preset);
          applyPresetById(parsed.preset, false);
        }
        if (parsed.borderRadius != null) {
          setBorderRadius(parsed.borderRadius);
          applyBorderRadius(parsed.borderRadius);
        }
      } catch { /* corrupted storage */ }
    }
  }, []);

  const save = useCallback((presetId: string, radius: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: presetId, borderRadius: radius }));
  }, []);

  const applyPresetColors = useCallback((preset: ThemePreset) => {
    const root = document.documentElement;
    for (const key of CSS_VARS_TO_APPLY) {
      root.style.setProperty(`--${key}`, preset.colors[key]);
    }
  }, []);

  const applyPresetById = useCallback((presetId: string, notify = true) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    applyPresetColors(preset);
    setActivePreset(presetId);
    if (notify) {
      save(presetId, borderRadius);
      toast.success(`Tema "${preset.name}" aplicado!`);
    }
  }, [applyPresetColors, borderRadius, save]);

  const applyBorderRadius = useCallback((radius: number) => {
    document.documentElement.style.setProperty('--radius', `${radius / 16}rem`);
  }, []);

  const handleBorderRadiusChange = useCallback((value: number[]) => {
    const radius = value[0];
    setBorderRadius(radius);
    applyBorderRadius(radius);
    save(activePreset, radius);
  }, [activePreset, applyBorderRadius, save]);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const root = document.documentElement;
    for (const key of CSS_VARS_TO_APPLY) {
      root.style.removeProperty(`--${key}`);
    }
    root.style.removeProperty('--radius');
    setActivePreset('default');
    setBorderRadius(8);
    toast.success('Tema restaurado ao padrão!');
  }, []);

  const exportTheme = useCallback(() => {
    const config: ThemeConfig = { preset: activePreset, borderRadius };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tema-${activePreset}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tema exportado!');
  }, [activePreset, borderRadius]);

  const importTheme = useCallback((onThemeChange?: (theme: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        if (config.preset) applyPresetById(config.preset);
        if (config.borderRadius != null) {
          setBorderRadius(config.borderRadius);
          applyBorderRadius(config.borderRadius);
        }
        if (config.theme && onThemeChange) onThemeChange(config.theme);
        toast.success('Tema importado!');
      } catch {
        toast.error('Arquivo de tema inválido');
      }
    };
    input.click();
  }, [applyPresetById, applyBorderRadius]);

  return {
    activePreset,
    borderRadius,
    applyPreset: applyPresetById,
    handleBorderRadiusChange,
    resetTheme,
    exportTheme,
    importTheme,
  };
}
