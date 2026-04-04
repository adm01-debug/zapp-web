/**
 * Comprehensive theme presets with FULL CSS variable coverage.
 * Each preset defines colors for BOTH light and dark modes,
 * ensuring the entire UI transforms when a skin is selected.
 */

export interface ThemeModeColors {
  // Core surfaces
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  'card-elevated': string;
  popover: string;
  'popover-foreground': string;

  // Primary
  primary: string;
  'primary-foreground': string;
  'primary-glow': string;

  // Secondary
  secondary: string;
  'secondary-foreground': string;

  // Muted
  muted: string;
  'muted-foreground': string;

  // Accent
  accent: string;
  'accent-foreground': string;

  // Borders & inputs
  border: string;
  input: string;
  ring: string;

  // Gamification
  xp: string;
  unread: string;

  // Sidebar
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;

  // Chat
  'chat-bubble-sent': string;
  'chat-bubble-sent-foreground': string;
  'chat-bubble-received': string;
  'chat-bubble-received-foreground': string;
  'chat-header': string;
  'chat-input-bg': string;

  // Status
  'status-open': string;

  // Gradients
  'gradient-primary': string;
  'gradient-secondary': string;
  'gradient-xp': string;
  'gradient-vibrant': string;
  'gradient-purple-green': string;
  'gradient-surface': string;
  'gradient-divider': string;

  // Shadows
  'shadow-glow-primary': string;
  'shadow-glow-secondary': string;
  'shadow-glow-accent': string;
  'shadow-glow-purple': string;

  // Glass
  'glass-bg': string;
  'glass-border': string;

  // Elevated
  elevated: string;
  'elevated-hover': string;

  // Charts
  'chart-1': string;
  'chart-9': string;
  'chart-status-open': string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  swatches: [string, string, string, string];
  light: ThemeModeColors;
  dark: ThemeModeColors;
}

/**
 * All CSS variable keys that presets will apply/remove.
 */
export const CSS_VARS_TO_APPLY: (keyof ThemeModeColors)[] = [
  'background', 'foreground',
  'card', 'card-foreground', 'card-elevated',
  'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'primary-glow',
  'secondary', 'secondary-foreground',
  'muted', 'muted-foreground',
  'accent', 'accent-foreground',
  'border', 'input', 'ring',
  'xp', 'unread',
  'sidebar-background', 'sidebar-foreground',
  'sidebar-primary', 'sidebar-primary-foreground',
  'sidebar-accent', 'sidebar-accent-foreground',
  'sidebar-border', 'sidebar-ring',
  'chat-bubble-sent', 'chat-bubble-sent-foreground',
  'chat-bubble-received', 'chat-bubble-received-foreground',
  'chat-header', 'chat-input-bg',
  'status-open',
  'gradient-primary', 'gradient-secondary', 'gradient-xp',
  'gradient-vibrant', 'gradient-purple-green',
  'gradient-surface', 'gradient-divider',
  'shadow-glow-primary', 'shadow-glow-secondary',
  'shadow-glow-accent', 'shadow-glow-purple',
  'glass-bg', 'glass-border',
  'elevated', 'elevated-hover',
  'chart-1', 'chart-9', 'chart-status-open',
];

// ──────────── Helper ────────────
interface PresetParams {
  id: string;
  name: string;
  description: string;
  emoji: string;
  // Primary hue/sat/light
  h: number; s: number; l: number;
  // Glow hue
  gh: number;
  // Secondary hue/sat/light
  sh: number; ss: number; sl: number;
}

const buildPreset = (p: PresetParams): ThemePreset => {
  const { id, name, description, emoji, h, s, l, gh, sh, ss, sl } = p;

  const light: ThemeModeColors = {
    background: `${h} 20% 97%`,
    foreground: `${h} 20% 12%`,
    card: `0 0% 100%`,
    'card-foreground': `${h} 20% 12%`,
    'card-elevated': `0 0% 100%`,
    popover: `0 0% 100%`,
    'popover-foreground': `${h} 20% 12%`,
    primary: `${h} ${s}% ${l}%`,
    'primary-foreground': '0 0% 100%',
    'primary-glow': `${gh} ${s + 3}% ${l + 6}%`,
    secondary: `${sh} ${ss}% ${sl}%`,
    'secondary-foreground': '0 0% 100%',
    muted: `${h} 15% 92%`,
    'muted-foreground': `${h} 10% 45%`,
    accent: `${h} 55% 95%`,
    'accent-foreground': `${h} ${s}% ${l - 8}%`,
    border: `${h} 15% 90%`,
    input: `${h} 15% 93%`,
    ring: `${h} ${s}% ${l}%`,
    xp: `${h} ${s}% ${l}%`,
    unread: `${h} ${s}% ${l}%`,
    'sidebar-background': `0 0% 100%`,
    'sidebar-foreground': `${h} 20% 12%`,
    'sidebar-primary': `${h} ${s}% ${l}%`,
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': `${h} 50% 96%`,
    'sidebar-accent-foreground': `${h} ${s}% ${l - 8}%`,
    'sidebar-border': `${h} 15% 92%`,
    'sidebar-ring': `${h} ${s}% ${l}%`,
    'chat-bubble-sent': `${h} ${s}% ${l}%`,
    'chat-bubble-sent-foreground': '0 0% 100%',
    'chat-bubble-received': `${h} 15% 95%`,
    'chat-bubble-received-foreground': `${h} 20% 15%`,
    'chat-header': `0 0% 100%`,
    'chat-input-bg': `0 0% 100%`,
    'status-open': `${h} ${s}% ${l}%`,
    'gradient-primary': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${sh} ${ss}% ${sl}%), hsl(${gh} ${ss - 10}% ${sl + 5}%))`,
    'gradient-xp': `linear-gradient(90deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-vibrant': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(210 80% 55%), hsl(${gh} ${s - 7}% ${l + 4}%))`,
    'gradient-purple-green': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(155 75% 48%))`,
    'gradient-surface': `linear-gradient(180deg, hsl(${h} 20% 97%), hsl(${h} 15% 95%))`,
    'gradient-divider': `linear-gradient(90deg, transparent, hsl(${h} 15% 88% / 0.5), transparent)`,
    'shadow-glow-primary': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.25)`,
    'shadow-glow-secondary': `0 4px 24px hsl(${sh} ${ss}% ${sl}% / 0.2)`,
    'shadow-glow-accent': `0 4px 24px hsl(${gh} ${s - 7}% ${l + 4}% / 0.25)`,
    'shadow-glow-purple': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.3)`,
    'glass-bg': `0 0% 100% / 0.8`,
    'glass-border': `${h} 15% 88% / 0.5`,
    elevated: `0 0% 100%`,
    'elevated-hover': `${h} 20% 97%`,
    'chart-1': `${h} ${s}% ${l}%`,
    'chart-9': `${gh} ${s - 7}% ${sl}%`,
    'chart-status-open': `${h} ${s}% ${l}%`,
  };

  const dark: ThemeModeColors = {
    background: `240 6% 6%`,
    foreground: `${h} 12% 95%`,
    card: `240 5% 10%`,
    'card-foreground': `${h} 12% 95%`,
    'card-elevated': `240 5% 15%`,
    popover: `240 5% 13%`,
    'popover-foreground': `${h} 12% 95%`,
    primary: `${h} ${s}% ${l}%`,
    'primary-foreground': '0 0% 100%',
    'primary-glow': `${gh} ${s + 3}% ${l + 6}%`,
    secondary: `${sh} ${ss}% ${sl}%`,
    'secondary-foreground': '0 0% 100%',
    muted: `240 5% 15%`,
    'muted-foreground': `${h} 10% 65%`,
    accent: `${h} 55% 20%`,
    'accent-foreground': `${h} ${s}% 78%`,
    border: `240 5% 16%`,
    input: `240 5% 15%`,
    ring: `${h} ${s}% ${l}%`,
    xp: `${h} ${s}% ${l}%`,
    unread: `${h} ${s}% ${l}%`,
    'sidebar-background': `240 6% 9%`,
    'sidebar-foreground': `${h} 12% 95%`,
    'sidebar-primary': `${h} ${s}% ${l}%`,
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': `${h} 45% 18%`,
    'sidebar-accent-foreground': `${h} ${s}% 78%`,
    'sidebar-border': `240 5% 16%`,
    'sidebar-ring': `${h} ${s}% ${l}%`,
    'chat-bubble-sent': `${h} ${s}% ${l}%`,
    'chat-bubble-sent-foreground': '0 0% 100%',
    'chat-bubble-received': `240 5% 15%`,
    'chat-bubble-received-foreground': `${h} 12% 95%`,
    'chat-header': `240 5% 10%`,
    'chat-input-bg': `240 5% 13%`,
    'status-open': `${h} ${s}% ${l}%`,
    'gradient-primary': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 5}% ${l + 4}%))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${sh} ${ss}% ${sl}%), hsl(${gh} ${ss - 8}% ${sl + 5}%))`,
    'gradient-xp': `linear-gradient(90deg, hsl(${h} ${s}% ${l}%), hsl(${gh} ${s - 5}% ${l + 4}%))`,
    'gradient-vibrant': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(210 90% 62%), hsl(${gh} ${s - 5}% ${l + 4}%))`,
    'gradient-purple-green': `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(155 75% 48%))`,
    'gradient-surface': `linear-gradient(180deg, hsl(240 5% 10%), hsl(240 6% 7%))`,
    'gradient-divider': `linear-gradient(90deg, transparent, hsl(${h} 40% 30% / 0.3), transparent)`,
    'shadow-glow-primary': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.35)`,
    'shadow-glow-secondary': `0 4px 24px hsl(${sh} ${ss}% ${sl}% / 0.3)`,
    'shadow-glow-accent': `0 4px 24px hsl(${gh} ${s - 7}% ${l + 4}% / 0.3)`,
    'shadow-glow-purple': `0 4px 24px hsl(${h} ${s}% ${l}% / 0.4)`,
    'glass-bg': `240 5% 10% / 0.9`,
    'glass-border': `${h} 45% 28% / 0.35`,
    elevated: `240 5% 15%`,
    'elevated-hover': `240 5% 19%`,
    'chart-1': `${h} ${s}% ${l}%`,
    'chart-9': `${gh} ${s - 7}% ${sl}%`,
    'chart-status-open': `${h} ${s}% ${l}%`,
  };

  return {
    id,
    name,
    description,
    emoji,
    swatches: [
      `hsl(${h} ${s}% ${l}%)`,
      `hsl(${sh} ${ss}% ${sl}%)`,
      `hsl(${gh} ${s - 5}% ${l + 6}%)`,
      `hsl(240 6% 10%)`,
    ],
    light,
    dark,
  };
};

// ──────────── PRESETS ────────────
export const PRESETS: ThemePreset[] = [
  buildPreset({ id: 'corporate', name: 'Padrão', description: 'Azul profissional', emoji: '💼', h: 221, s: 83, l: 53, gh: 230, sh: 215, ss: 70, sl: 55 }),
  buildPreset({ id: 'purpure', name: 'Púrpure', description: 'Roxo vibrante original', emoji: '💜', h: 254, s: 92, l: 62, gh: 260, sh: 260, ss: 90, sl: 67 }),
  buildPreset({ id: 'emerald', name: 'Esmeralda', description: 'Verde sofisticado', emoji: '💎', h: 160, s: 84, l: 45, gh: 170, sh: 145, ss: 70, sl: 50 }),
  buildPreset({ id: 'sunset', name: 'Pôr do Sol', description: 'Quente e acolhedor', emoji: '🌅', h: 25, s: 95, l: 53, gh: 35, sh: 15, ss: 80, sl: 50 }),
  buildPreset({ id: 'rose', name: 'Rosé', description: 'Elegante e moderno', emoji: '🌸', h: 346, s: 77, l: 50, gh: 355, sh: 330, ss: 70, sl: 55 }),
  buildPreset({ id: 'minimal', name: 'Minimal', description: 'Clean e neutro', emoji: '⚪', h: 220, s: 15, l: 50, gh: 220, sh: 220, ss: 10, sl: 45 }),
  buildPreset({ id: 'ocean', name: 'Oceano', description: 'Azul profundo', emoji: '🌊', h: 200, s: 85, l: 55, gh: 210, sh: 190, ss: 75, sl: 50 }),
  buildPreset({ id: 'amber', name: 'Âmbar', description: 'Dourado e premium', emoji: '✨', h: 38, s: 92, l: 50, gh: 45, sh: 30, ss: 80, sl: 55 }),
  buildPreset({ id: 'cyber', name: 'Cyber', description: 'Neon futurista', emoji: '🤖', h: 180, s: 100, l: 50, gh: 300, sh: 320, ss: 100, sl: 60 }),
  (() => {
    // Diversity — Rainbow Pride theme 🏳️‍🌈
    const base = buildPreset({ id: 'diversity', name: 'Diversity', description: 'Orgulho e diversidade 🏳️‍🌈', emoji: '🏳️‍🌈', h: 280, s: 80, l: 58, gh: 340, sh: 200, ss: 80, sl: 55 });
    // Override gradients with full rainbow
    const rainbowGrad = 'linear-gradient(135deg, hsl(0 85% 55%), hsl(30 90% 55%), hsl(55 90% 50%), hsl(130 70% 45%), hsl(210 80% 55%), hsl(280 80% 58%))';
    const rainbowGradH = 'linear-gradient(90deg, hsl(0 85% 55%), hsl(30 90% 55%), hsl(55 90% 50%), hsl(130 70% 45%), hsl(210 80% 55%), hsl(280 80% 58%))';
    base.light['gradient-primary'] = rainbowGrad;
    base.light['gradient-secondary'] = rainbowGrad;
    base.light['gradient-xp'] = rainbowGradH;
    base.light['gradient-vibrant'] = rainbowGrad;
    base.light['gradient-purple-green'] = rainbowGrad;
    base.dark['gradient-primary'] = rainbowGrad;
    base.dark['gradient-secondary'] = rainbowGrad;
    base.dark['gradient-xp'] = rainbowGradH;
    base.dark['gradient-vibrant'] = rainbowGrad;
    base.dark['gradient-purple-green'] = rainbowGrad;
    base.swatches = ['hsl(0 85% 55%)', 'hsl(55 90% 50%)', 'hsl(130 70% 45%)', 'hsl(280 80% 58%)'];
    return base;
  })(),
];

export const STORAGE_KEY = 'theme-custom-colors';
