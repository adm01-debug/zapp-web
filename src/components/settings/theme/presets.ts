/**
 * Comprehensive theme presets that cover ALL CSS variables.
 * Each preset defines colors for both dark and light contexts,
 * ensuring the entire UI transforms when a skin is selected.
 */

export interface ThemePresetColors {
  // Core
  primary: string;
  'primary-foreground': string;
  'primary-glow': string;
  secondary: string;
  'secondary-foreground': string;
  accent: string;
  'accent-foreground': string;
  ring: string;

  // Gamification
  xp: string;
  unread: string;

  // Sidebar
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-ring': string;

  // Chat
  'chat-bubble-sent': string;
  'chat-bubble-sent-foreground': string;

  // Status
  'status-open': string;

  // Gradients
  'gradient-primary': string;
  'gradient-secondary': string;
  'gradient-xp': string;
  'gradient-vibrant': string;
  'gradient-purple-green': string;

  // Shadows
  'shadow-glow-primary': string;
  'shadow-glow-secondary': string;
  'shadow-glow-accent': string;
  'shadow-glow-purple': string;

  // Glass
  'glass-border': string;

  // Charts
  'chart-1': string;
  'chart-9': string;
  'chart-status-open': string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  swatches: [string, string, string, string];
  colors: ThemePresetColors;
}

/**
 * All CSS variable keys that presets will apply/remove.
 */
export const CSS_VARS_TO_APPLY: (keyof ThemePresetColors)[] = [
  'primary', 'primary-foreground', 'primary-glow',
  'secondary', 'secondary-foreground',
  'accent', 'accent-foreground', 'ring',
  'xp', 'unread',
  'sidebar-primary', 'sidebar-primary-foreground',
  'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-ring',
  'chat-bubble-sent', 'chat-bubble-sent-foreground',
  'status-open',
  'gradient-primary', 'gradient-secondary', 'gradient-xp',
  'gradient-vibrant', 'gradient-purple-green',
  'shadow-glow-primary', 'shadow-glow-secondary',
  'shadow-glow-accent', 'shadow-glow-purple',
  'glass-border',
  'chart-1', 'chart-9', 'chart-status-open',
];

// ──────────── Helper ────────────
const buildPreset = (
  id: string,
  name: string,
  description: string,
  h: number,   // primary hue
  s: number,   // primary saturation
  l: number,   // primary lightness
  gh: number,  // glow hue
  sh: number,  // secondary hue
  ss: number,  // secondary saturation
  sl: number,  // secondary lightness
): ThemePreset => ({
  id,
  name,
  description,
  swatches: [
    `hsl(${h} ${s}% ${l}%)`,
    `hsl(${sh} ${ss}% ${sl}%)`,
    `hsl(${gh} ${s - 5}% ${l + 6}%)`,
    `hsl(240 6% 10%)`,
  ],
  colors: {
    primary: `${h} ${s}% ${l}%`,
    'primary-foreground': '0 0% 100%',
    'primary-glow': `${gh} ${s + 3}% ${l + 6}%`,
    secondary: `${sh} ${ss}% ${sl}%`,
    'secondary-foreground': '0 0% 100%',
    accent: `${h} 55% 20%`,
    'accent-foreground': `${h} ${s}% 78%`,
    ring: `${h} ${s}% ${l}%`,
    xp: `${h} ${s}% ${l}%`,
    unread: `${h} ${s}% ${l}%`,
    'sidebar-primary': `${h} ${s}% ${l}%`,
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': `${h} 45% 18%`,
    'sidebar-accent-foreground': `${h} ${s}% 78%`,
    'sidebar-ring': `${h} ${s}% ${l}%`,
    'chat-bubble-sent': `${h} ${s}% ${l}%`,
    'chat-bubble-sent-foreground': '0 0% 100%',
    'status-open': `${h} ${s}% ${l}%`,
    'gradient-primary': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${sh} ${ss}% ${sl}%), hsl(${gh} ${ss - 10}% ${sl + 5}%))`,
    'gradient-xp': `linear-gradient(90deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-vibrant': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(210 90% 62%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-purple-green': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(155 75% 48%))`,
    'shadow-glow-primary': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.35)`,
    'shadow-glow-secondary': `0 4px 24px hsl(${sh} ${ss}% ${sl}% / 0.3)`,
    'shadow-glow-accent': `0 4px 24px hsl(${gh} ${s - 7}% ${l + 4}% / 0.3)`,
    'shadow-glow-purple': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.4)`,
    'glass-border': `${h} 45% 28% / 0.35`,
    'chart-1': `${h} ${s}% ${l}%`,
    'chart-9': `${gh} ${s - 7}% ${sl}%`,
    'chart-status-open': `${h} ${s}% ${l}%`,
  },
});

// ──────────── PRESETS ────────────
export const PRESETS: ThemePreset[] = [
  // Default purple - original DreamsChat
  buildPreset('default', 'Padrão', 'Roxo vibrante original', 254, 92, 62, 260, 260, 90, 67),

  // Corporate blue
  buildPreset('corporate', 'Corporativo', 'Azul profissional e sóbrio', 221, 83, 53, 230, 215, 70, 55),

  // Emerald green
  buildPreset('emerald', 'Esmeralda', 'Verde sofisticado', 160, 84, 45, 170, 145, 70, 50),

  // Sunset orange
  buildPreset('sunset', 'Pôr do Sol', 'Quente e acolhedor', 25, 95, 53, 35, 15, 80, 50),

  // Rosé pink
  buildPreset('rose', 'Rosé', 'Elegante e moderno', 346, 77, 50, 355, 330, 70, 55),

  // Minimal gray
  buildPreset('minimal', 'Minimal', 'Clean e neutro', 220, 15, 50, 220, 220, 10, 45),

  // Ocean deep blue
  buildPreset('ocean', 'Oceano', 'Azul profundo', 200, 85, 55, 210, 190, 75, 50),

  // Amber gold
  buildPreset('amber', 'Âmbar', 'Dourado e premium', 38, 92, 50, 45, 30, 80, 55),

  // Cyberpunk neon
  buildPreset('cyber', 'Cyber', 'Neon futurista', 180, 100, 50, 300, 320, 100, 60),

  // Lavender soft purple
  buildPreset('lavender', 'Lavanda', 'Suave e calmante', 270, 60, 65, 280, 250, 50, 60),
];

export const STORAGE_KEY = 'theme-custom-colors';
