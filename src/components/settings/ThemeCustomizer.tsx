import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Palette, RotateCcw, Download, Upload, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface PresetColors {
  primary: string;
  'primary-glow': string;
  secondary: string;
  accent: string;
  'accent-foreground': string;
  ring: string;
  'sidebar-primary': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-ring': string;
  'chat-bubble-sent': string;
  'status-open': string;
  unread: string;
  xp: string;
  'gradient-primary': string;
  'gradient-secondary': string;
  'gradient-xp': string;
  'gradient-vibrant': string;
  'gradient-purple-green': string;
  'shadow-glow-primary': string;
  'shadow-glow-secondary': string;
  'shadow-glow-accent': string;
  'shadow-glow-purple': string;
  'glass-border': string;
  'chart-1': string;
  'chart-9': string;
  'chart-status-open': string;
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  hue: number;
  colors: PresetColors;
  swatches: [string, string, string];
}

const makePreset = (
  id: string,
  name: string,
  description: string,
  hue: number,
  sat: number,
  light: number,
  glowHue: number,
  secHue: number,
  secSat: number,
): ThemePreset => ({
  id,
  name,
  description,
  hue,
  swatches: [
    `hsl(${hue} ${sat}% ${light}%)`,
    `hsl(${secHue} ${secSat}% 50%)`,
    `hsl(240 6% 6%)`,
  ],
  colors: {
    primary: `${hue} ${sat}% ${light}%`,
    'primary-glow': `${glowHue} ${sat + 3}% ${light + 6}%`,
    secondary: `${secHue} ${secSat}% 67%`,
    accent: `${hue} 55% 20%`,
    'accent-foreground': `${hue} ${sat}% 78%`,
    ring: `${hue} ${sat}% ${light}%`,
    'sidebar-primary': `${hue} ${sat}% ${light}%`,
    'sidebar-accent': `${hue} 45% 18%`,
    'sidebar-accent-foreground': `${hue} ${sat}% 78%`,
    'sidebar-ring': `${hue} ${sat}% ${light}%`,
    'chat-bubble-sent': `${hue} ${sat}% ${light}%`,
    'status-open': `${hue} ${sat}% ${light}%`,
    unread: `${hue} ${sat}% ${light}%`,
    xp: `${hue} ${sat}% ${light}%`,
    'gradient-primary': `linear-gradient(135deg, hsl(${hue} ${sat}% ${light}%), hsl(${glowHue} ${sat - 7}% ${light - 2}%))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${secHue} ${secSat}% 67%), hsl(${glowHue} ${secSat - 10}% 65%))`,
    'gradient-xp': `linear-gradient(90deg, hsl(${hue} ${sat}% ${light}%), hsl(${glowHue} ${sat - 7}% ${light + 4}%))`,
    'gradient-vibrant': `linear-gradient(135deg, hsl(${hue} ${sat}% ${light}%), hsl(210 90% 62%), hsl(${glowHue} ${sat - 7}% ${light + 4}%))`,
    'gradient-purple-green': `linear-gradient(135deg, hsl(${hue} ${sat}% ${light}%), hsl(155 75% 48%))`,
    'shadow-glow-primary': `0 4px 24px hsl(${hue} ${sat}% ${light}% / 0.35)`,
    'shadow-glow-secondary': `0 4px 24px hsl(${secHue} ${secSat}% 67% / 0.3)`,
    'shadow-glow-accent': `0 4px 24px hsl(${glowHue} ${sat - 7}% ${light + 4}% / 0.3)`,
    'shadow-glow-purple': `0 4px 24px hsl(${hue} ${sat}% ${light}% / 0.4)`,
    'glass-border': `${hue} 45% 28% / 0.35`,
    'chart-1': `${hue} ${sat}% ${light}%`,
    'chart-9': `${glowHue} ${sat - 7}% 65%`,
    'chart-status-open': `${hue} ${sat}% ${light}%`,
  },
});

const PRESETS: ThemePreset[] = [
  makePreset('default', 'Padrão', 'Roxo vibrante original', 254, 92, 62, 260, 260, 90),
  makePreset('corporate', 'Corporativo', 'Azul profissional', 221, 83, 53, 230, 215, 70),
  makePreset('emerald', 'Esmeralda', 'Verde sofisticado', 160, 84, 45, 170, 145, 70),
  makePreset('sunset', 'Pôr do Sol', 'Quente e acolhedor', 25, 95, 53, 35, 15, 80),
  makePreset('rose', 'Rosé', 'Elegante e moderno', 346, 77, 50, 355, 330, 70),
  makePreset('minimal', 'Minimal', 'Clean e neutro', 220, 15, 50, 220, 220, 10),
  makePreset('ocean', 'Oceano', 'Azul profundo', 200, 85, 55, 210, 190, 75),
  makePreset('amber', 'Âmbar', 'Dourado e premium', 38, 92, 50, 45, 30, 80),
];

const CSS_VARS_TO_APPLY: (keyof PresetColors)[] = [
  'primary', 'primary-glow', 'secondary', 'accent', 'accent-foreground',
  'ring', 'sidebar-primary', 'sidebar-accent', 'sidebar-accent-foreground',
  'sidebar-ring', 'chat-bubble-sent', 'status-open', 'unread', 'xp',
  'gradient-primary', 'gradient-secondary', 'gradient-xp', 'gradient-vibrant',
  'gradient-purple-green', 'shadow-glow-primary', 'shadow-glow-secondary',
  'shadow-glow-accent', 'shadow-glow-purple', 'glass-border',
  'chart-1', 'chart-9', 'chart-status-open',
];

const STORAGE_KEY = 'theme-custom-colors';

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [activePreset, setActivePreset] = useState<string>('default');
  const [borderRadius, setBorderRadius] = useState<number>(8);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.preset) setActivePreset(parsed.preset);
        if (parsed.borderRadius) setBorderRadius(parsed.borderRadius);
        applyPreset(parsed.preset || 'default', false);
        if (parsed.borderRadius) applyBorderRadius(parsed.borderRadius);
      } catch {}
    }
  }, []);

  const applyPreset = (presetId: string, save = true) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const root = document.documentElement;

    // Apply ALL CSS variables from the preset
    for (const key of CSS_VARS_TO_APPLY) {
      root.style.setProperty(`--${key}`, preset.colors[key]);
    }

    setActivePreset(presetId);
    if (save) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: presetId, borderRadius }));
      toast.success(`Tema "${preset.name}" aplicado!`);
    }
  };

  const applyBorderRadius = (radius: number) => {
    document.documentElement.style.setProperty('--radius', `${radius / 16}rem`);
  };

  const handleBorderRadiusChange = (value: number[]) => {
    const radius = value[0];
    setBorderRadius(radius);
    applyBorderRadius(radius);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: activePreset, borderRadius: radius }));
  };

  const resetTheme = () => {
    localStorage.removeItem(STORAGE_KEY);
    const root = document.documentElement;
    for (const key of CSS_VARS_TO_APPLY) {
      root.style.removeProperty(`--${key}`);
    }
    root.style.removeProperty('--radius');
    setActivePreset('default');
    setBorderRadius(8);
    toast.success('Tema restaurado ao padrão!');
  };

  const exportTheme = () => {
    toast.error('🔒 Exportação bloqueada por política de segurança', {
      description: 'A exportação de configurações está desabilitada para proteção de dados.',
    });
  };

  const importTheme = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        if (config.preset) applyPreset(config.preset);
        if (config.borderRadius) {
          setBorderRadius(config.borderRadius);
          applyBorderRadius(config.borderRadius);
        }
        if (config.theme) setTheme(config.theme);
        toast.success('Tema importado!');
      } catch {
        toast.error('Arquivo de tema inválido');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Personalizar Tema
          </h3>
          <p className="text-sm text-muted-foreground">Escolha um preset ou customize as cores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={importTheme}>
            <Upload className="w-4 h-4 mr-1" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={exportTheme}>
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={resetTheme}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
        </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Presets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PRESETS.map((preset) => (
          <motion.div
            key={preset.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all border-2 ${
                activePreset === preset.id
                  ? 'border-primary shadow-lg shadow-primary/10'
                  : 'border-secondary/30 hover:border-primary/30'
              }`}
              onClick={() => applyPreset(preset.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1">
                    {preset.swatches.map((swatch, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border-2 border-background"
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                  {activePreset === preset.id && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{preset.name}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Border Radius */}
      <Card className="border-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Raio da Borda</CardTitle>
          <CardDescription className="text-xs">Ajuste o arredondamento dos elementos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[borderRadius]}
              onValueChange={handleBorderRadiusChange}
              min={0}
              max={20}
              step={1}
              className="flex-1"
            />
            <Badge variant="outline" className="min-w-[3rem] justify-center">{borderRadius}px</Badge>
          </div>
          <div className="flex gap-3 mt-4">
            <div
              className="w-16 h-10 bg-primary flex items-center justify-center text-primary-foreground text-xs"
              style={{ borderRadius: `${borderRadius}px` }}
            >
              Botão
            </div>
            <div
              className="w-24 h-10 bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground"
              style={{ borderRadius: `${borderRadius}px` }}
            >
              Input
            </div>
            <div
              className="w-20 h-10 bg-card border border-border flex items-center justify-center text-xs text-foreground"
              style={{ borderRadius: `${borderRadius}px` }}
            >
              Card
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
