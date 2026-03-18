import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Palette, RotateCcw, Download, Upload, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
}

const PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Padrão',
    description: 'Tema original do sistema',
    colors: {
      primary: '262 83% 58%',
      secondary: '240 4% 16%',
      accent: '262 83% 58%',
      background: '240 10% 4%',
      foreground: '0 0% 98%',
      muted: '240 4% 16%',
    },
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Profissional e sóbrio',
    colors: {
      primary: '221 83% 53%',
      secondary: '215 20% 16%',
      accent: '221 83% 53%',
      background: '222 47% 6%',
      foreground: '210 40% 98%',
      muted: '217 19% 16%',
    },
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde sofisticado',
    colors: {
      primary: '160 84% 39%',
      secondary: '160 20% 14%',
      accent: '160 84% 39%',
      background: '160 30% 4%',
      foreground: '0 0% 98%',
      muted: '160 10% 16%',
    },
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    description: 'Quente e acolhedor',
    colors: {
      primary: '25 95% 53%',
      secondary: '20 15% 16%',
      accent: '25 95% 53%',
      background: '20 14% 4%',
      foreground: '0 0% 98%',
      muted: '20 10% 16%',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    description: 'Elegante e moderno',
    colors: {
      primary: '346 77% 50%',
      secondary: '340 15% 16%',
      accent: '346 77% 50%',
      background: '340 20% 4%',
      foreground: '0 0% 98%',
      muted: '340 10% 16%',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean e neutro',
    colors: {
      primary: '0 0% 45%',
      secondary: '0 0% 14%',
      accent: '0 0% 50%',
      background: '0 0% 4%',
      foreground: '0 0% 95%',
      muted: '0 0% 14%',
    },
  },
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
    root.style.setProperty('--primary', preset.colors.primary);
    root.style.setProperty('--accent', preset.colors.accent);

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
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--radius');
    setActivePreset('default');
    setBorderRadius(8);
    toast.success('Tema restaurado ao padrão!');
  };

  const exportTheme = () => {
    const config = { preset: activePreset, borderRadius, theme };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tema exportado!');
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
        if (config.preset) {
          applyPreset(config.preset);
        }
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  {/* Color swatches */}
                  <div className="flex -space-x-1">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-background"
                      style={{ backgroundColor: `hsl(${preset.colors.primary})` }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 border-background"
                      style={{ backgroundColor: `hsl(${preset.colors.secondary})` }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 border-background"
                      style={{ backgroundColor: `hsl(${preset.colors.background})` }}
                    />
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
          <CardDescription className="text-xs">Ajuste a arredondamento dos elementos</CardDescription>
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
          {/* Preview */}
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
