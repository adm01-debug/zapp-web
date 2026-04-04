import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, RotateCcw, Download, Upload, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { PRESETS } from './theme/presets';
import { useThemePreset } from './theme/useThemePreset';
import { PresetCard } from './theme/PresetCard';
import { BorderRadiusControl } from './theme/BorderRadiusControl';

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const {
    activePreset,
    borderRadius,
    applyPreset,
    handleBorderRadiusChange,
    resetTheme,
    exportTheme,
    importTheme,
  } = useThemePreset();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Personalizar Tema
          </h3>
          <p className="text-sm text-muted-foreground">Escolha um preset ou customize as cores</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetTheme}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>

      {/* Mode Toggle */}
      <Card className="border-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Modo de Cor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              <Sun className="w-4 h-4 mr-1" /> Claro
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-4 h-4 mr-1" /> Escuro
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
            >
              <Monitor className="w-4 h-4 mr-1" /> Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets Grid */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          {PRESETS.length} skins disponíveis
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={activePreset === preset.id}
              onSelect={applyPreset}
            />
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <BorderRadiusControl
        borderRadius={borderRadius}
        onChange={handleBorderRadiusChange}
      />
    </div>
  );
}
