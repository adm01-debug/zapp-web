/**
 * ============================================================
 * DESIGN IMPROVEMENTS VALIDATION TEST SUITE
 * ============================================================
 * Tests covering all 14+ design improvements implemented:
 * 
 * #1  - Unified mobile header (no duplication)
 * #2  - Compact filters/tabs
 * #3  - FAB with contextual label
 * #4  - Muted-foreground contrast (WCAG 4.5:1)
 * #5  - Rich empty state in Inbox
 * #6  - Sidebar group separators
 * #7  - Outline badges in tabs
 * #8  - Expandable search on mobile
 * #9  - Responsive tab labels
 * #10 - Animated view transitions
 * #11 - Colorful avatar fallbacks
 * #12 - Staggered skeleton loading
 * #13 - Custom scrollbar & focus rings
 * #14 - Sentiment indicator dots
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────
// Utility: read source file
// ─────────────────────────────────────────────
function readSrc(filePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf-8');
}

function readRoot(filePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', filePath), 'utf-8');
}

// ============================================================
// GROUP 1: CSS & Design System Improvements
// ============================================================
describe('Design System — CSS Variables & Tokens', () => {
  let indexCSS: string;

  beforeEach(() => {
    indexCSS = readSrc('index.css');
  });

  // ─── #4: Muted-foreground contrast ───
  describe('#4 — Muted-foreground Contrast', () => {
    it('should have muted-foreground with lightness >= 70% in dark mode', () => {
      const darkMatch = indexCSS.match(/\.dark[\s\S]*?--muted-foreground:\s*(\d+)\s+(\d+)%\s+(\d+)%/);
      expect(darkMatch).toBeTruthy();
      const lightness = parseInt(darkMatch![3], 10);
      expect(lightness).toBeGreaterThanOrEqual(70);
    });

    it('should have muted-foreground with lightness <= 40% in light mode', () => {
      const lightMatch = indexCSS.match(/:root[\s\S]*?--muted-foreground:\s*(\d+)\s+(\d+)%\s+(\d+)%/);
      expect(lightMatch).toBeTruthy();
      const lightness = parseInt(lightMatch![3], 10);
      expect(lightness).toBeLessThanOrEqual(40);
    });
  });

  // ─── #13: Scrollbar customization ───
  describe('#13 — Custom Scrollbar Styles', () => {
    it('should have scrollbar-thumb with border-radius', () => {
      expect(indexCSS).toContain('scrollbar-thumb');
      expect(indexCSS).toContain('border-radius');
    });

    it('should have scrollbar-thumb with background-clip padding-box', () => {
      expect(indexCSS).toContain('background-clip: padding-box');
    });

    it('should have hover state for scrollbar-thumb', () => {
      expect(indexCSS).toContain('scrollbar-thumb:hover');
    });

    it('should use muted-foreground color for scrollbar', () => {
      const matches = indexCSS.match(/scrollbar-thumb[\s\S]*?muted-foreground/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(0);
    });
  });

  // ─── #13: Focus ring styles ───
  describe('#13 — Focus Ring Styles', () => {
    it('should have focus-visible styles defined', () => {
      expect(indexCSS).toContain(':focus-visible');
    });

    it('should use primary color for button focus-visible', () => {
      expect(indexCSS).toContain('button:focus-visible');
      expect(indexCSS).toContain('--primary');
    });

    it('should have input focus-visible styles', () => {
      expect(indexCSS).toContain('input:focus-visible');
    });

    it('should have double-ring focus effect (background + ring)', () => {
      const focusSection = indexCSS.match(/:focus-visible[\s\S]*?box-shadow[\s\S]*?;/);
      expect(focusSection).toBeTruthy();
      expect(focusSection![0]).toContain('--background');
      expect(focusSection![0]).toContain('--ring');
    });
  });

  // ─── Reduced motion support ───
  describe('Reduced Motion Support', () => {
    it('should have prefers-reduced-motion media query', () => {
      expect(indexCSS).toContain('prefers-reduced-motion');
    });

    it('should set animation-duration to near-zero', () => {
      expect(indexCSS).toContain('animation-duration: 0.01ms');
    });

    it('should disable scroll-behavior', () => {
      expect(indexCSS).toContain('scroll-behavior: auto');
    });
  });
});

// ============================================================
// GROUP 2: Component Structure Validation
// ============================================================
describe('Component Structure Validation', () => {
  // ─── #1: Unified mobile header ───
  describe('#1 — Mobile Header Unification', () => {
    let inboxSource: string;

    beforeEach(() => {
      inboxSource = readSrc('components/inbox/RealtimeInboxView.tsx');
    });

    it('should conditionally hide the header title on mobile', () => {
      expect(inboxSource).toContain('!isMobile');
    });

    it('should have different padding for mobile vs desktop', () => {
      expect(inboxSource).toContain('isMobile ? "pt-1.5 pb-1.5" : "pt-2.5 pb-1.5"');
    });

    it('should only render title row when NOT mobile', () => {
      // The header block with "Conversas" h2 should be wrapped in !isMobile condition
      const titleSection = inboxSource.match(/\{!isMobile && \(\s*<div.*?Conversas/s);
      expect(titleSection).toBeTruthy();
    });
  });

  // ─── #3: FAB with contextual label ───
  describe('#3 — FAB Contextual Label', () => {
    let fabSource: string;

    beforeEach(() => {
      fabSource = readSrc('components/mobile/MobileFAB.tsx');
    });

    it('should use MessageSquarePlus icon when FAB is closed', () => {
      expect(fabSource).toContain('MessageSquarePlus');
    });

    it('should display "Novo" label when FAB is closed', () => {
      expect(fabSource).toContain('Novo');
    });

    it('should switch to Plus icon when FAB is open', () => {
      expect(fabSource).toContain('isOpen ? <Plus');
    });

    it('should animate label visibility with AnimatePresence', () => {
      expect(fabSource).toContain('AnimatePresence');
      expect(fabSource).toContain('!isOpen');
    });

    it('should use gradient primary background', () => {
      expect(fabSource).toContain('var(--gradient-primary)');
    });

    it('should trigger haptic feedback on click', () => {
      expect(fabSource).toContain('navigator.vibrate');
    });

    it('should have speed-dial actions', () => {
      expect(fabSource).toContain('Nova conversa');
      expect(fabSource).toContain('Novo contato');
      expect(fabSource).toContain('Nova campanha');
    });
  });

  // ─── #5: Rich empty state ───
  describe('#5 — Rich Empty State in Inbox', () => {
    let inboxSource: string;

    beforeEach(() => {
      inboxSource = readSrc('components/inbox/RealtimeInboxView.tsx');
    });

    it('should have floating animation on empty state', () => {
      // Check for the floating secondary icon with animate
      expect(inboxSource).toContain('animate={{ y: [0, -6, 0] }}');
    });

    it('should have descriptive empty state text', () => {
      expect(inboxSource).toContain('Selecione uma conversa');
      expect(inboxSource).toContain('visualizar e responder mensagens');
    });

    it('should have motion scale-in animation', () => {
      expect(inboxSource).toContain('initial={{ opacity: 0, scale: 0.95 }}');
    });

    it('should use MessageSquarePlus as secondary floating icon', () => {
      expect(inboxSource).toContain('MessageSquarePlus');
    });
  });

  // ─── #6: Sidebar group separators ───
  describe('#6 — Sidebar Group Separators', () => {
    let groupSource: string;

    beforeEach(() => {
      groupSource = readSrc('components/layout/SidebarNavGroup.tsx');
    });

    it('should have border-t separator between groups', () => {
      expect(groupSource).toContain('border-t');
    });

    it('should use border-border token for separator color', () => {
      expect(groupSource).toContain('border-border/20');
    });

    it('should not show separator on first group', () => {
      expect(groupSource).toContain('first:border-t-0');
    });

    it('should have proper spacing (pt/mt)', () => {
      expect(groupSource).toContain('pt-1.5');
      expect(groupSource).toContain('mt-0.5');
    });
  });

  // ─── #7: Outline badges ───
  describe('#7 — Outline Badges in Tabs', () => {
    let tabsSource: string;

    beforeEach(() => {
      tabsSource = readSrc('components/inbox/TicketTabs.tsx');
    });

    it('should use outline variant for badges', () => {
      expect(tabsSource).toContain('variant="outline"');
    });

    it('should use transparent background when not active', () => {
      expect(tabsSource).toContain('bg-transparent');
    });

    it('should use white/translucent for active badge', () => {
      expect(tabsSource).toContain('bg-white/15');
    });

    it('should have border styling on badges', () => {
      expect(tabsSource).toContain('border-white/25');
      expect(tabsSource).toContain('border-border/60');
    });
  });

  // ─── #8: Expandable search on mobile ───
  describe('#8 — Expandable Search on Mobile', () => {
    let inboxSource: string;

    beforeEach(() => {
      inboxSource = readSrc('components/inbox/RealtimeInboxView.tsx');
    });

    it('should render search icon button on mobile', () => {
      expect(inboxSource).toContain('isMobile ? (');
      // After the ternary, there should be a Button with search icon
      const searchButtonMatch = inboxSource.match(/isMobile \? \([\s\S]*?SearchIcon/);
      expect(searchButtonMatch).toBeTruthy();
    });

    it('should open global search on mobile icon click', () => {
      expect(inboxSource).toContain('setGlobalSearchOpen(true)');
    });

    it('should render full input field on desktop', () => {
      const desktopInputMatch = inboxSource.match(/: \([\s\S]*?relative flex-1[\s\S]*?Buscar\.\.\. ⌘K/);
      expect(desktopInputMatch).toBeTruthy();
    });

    it('should make contact type filter responsive width', () => {
      expect(inboxSource).toContain('isMobile ? "flex-1" : "w-[130px]"');
    });
  });

  // ─── #9: Responsive tab labels ───
  describe('#9 — Responsive Tab Labels', () => {
    let tabsSource: string;

    beforeEach(() => {
      tabsSource = readSrc('components/inbox/TicketTabs.tsx');
    });

    it('should import useIsMobile hook', () => {
      expect(tabsSource).toContain("import { useIsMobile } from '@/hooks/use-mobile'");
    });

    it('should use shorter label "Todas" on mobile', () => {
      expect(tabsSource).toContain("isMobile ? 'Todas' : 'Todas filas'");
    });

    it('should have smaller max-width on mobile for queue selector', () => {
      expect(tabsSource).toContain('isMobile ? "min-w-[60px] max-w-[90px]" : "min-w-[80px] max-w-[120px]"');
    });
  });
});

// ============================================================
// GROUP 3: View Router & Transitions
// ============================================================
describe('View Router & Transitions', () => {
  // ─── #10: Animated view transitions ───
  describe('#10 — Animated View Transitions', () => {
    let routerSource: string;

    beforeEach(() => {
      routerSource = readSrc('pages/ViewRouter.tsx');
    });

    it('should import AnimatePresence and motion from framer-motion', () => {
      expect(routerSource).toContain('AnimatePresence');
      expect(routerSource).toContain('motion');
      expect(routerSource).toContain('framer-motion');
    });

    it('should wrap content in AnimatePresence', () => {
      expect(routerSource).toContain('<AnimatePresence mode="wait">');
    });

    it('should use motion.div with key for view transitions', () => {
      expect(routerSource).toContain('key={currentView}');
    });

    it('should have initial, animate, and exit states', () => {
      expect(routerSource).toContain('initial={{ opacity: 0');
      expect(routerSource).toContain('animate={{ opacity: 1');
      expect(routerSource).toContain('exit={{ opacity: 0');
    });

    it('should use fast transition duration (<=0.2s)', () => {
      const durationMatch = routerSource.match(/duration:\s*([\d.]+)/);
      expect(durationMatch).toBeTruthy();
      expect(parseFloat(durationMatch![1])).toBeLessThanOrEqual(0.2);
    });

    it('should use ease-out or custom easing', () => {
      expect(routerSource).toMatch(/ease:\s*\[/);
    });

    it('should maintain full-screen views set', () => {
      expect(routerSource).toContain("'inbox'");
      expect(routerSource).toContain("'pipeline'");
      expect(routerSource).toContain("'team-chat'");
    });
  });
});

// ============================================================
// GROUP 4: Avatar System
// ============================================================
describe('Avatar Color System', () => {
  // ─── #11: Colorful avatar fallbacks ───
  describe('#11 — Avatar Color Utility', () => {
    let avatarColorsSource: string;

    beforeEach(() => {
      avatarColorsSource = readSrc('lib/avatar-colors.ts');
    });

    it('should export getAvatarColor function', () => {
      expect(avatarColorsSource).toContain('export function getAvatarColor');
    });

    it('should export getInitials function', () => {
      expect(avatarColorsSource).toContain('export function getInitials');
    });

    it('should have multiple palette options (>= 6)', () => {
      const paletteMatches = avatarColorsSource.match(/bg:/g);
      expect(paletteMatches).toBeTruthy();
      expect(paletteMatches!.length).toBeGreaterThanOrEqual(6);
    });

    it('should use HSL values for palette colors', () => {
      expect(avatarColorsSource).toContain('hsl(');
    });

    it('should have a deterministic hash function', () => {
      expect(avatarColorsSource).toContain('hashName');
      expect(avatarColorsSource).toContain('charCodeAt');
    });

    it('should limit initials to 2 characters', () => {
      expect(avatarColorsSource).toContain('slice(0, 2)');
    });

    it('should convert initials to uppercase', () => {
      expect(avatarColorsSource).toContain('toUpperCase()');
    });
  });

  describe('#11 — Avatar Colors in Conversation List', () => {
    let listSource: string;

    beforeEach(() => {
      listSource = readSrc('components/inbox/VirtualizedRealtimeList.tsx');
    });

    it('should import getAvatarColor and getInitials', () => {
      expect(listSource).toContain('getAvatarColor');
      expect(listSource).toContain('getInitials');
    });

    it('should use getAvatarColor for AvatarFallback styling', () => {
      expect(listSource).toContain("getAvatarColor(conversation.contact.name");
    });

    it('should use getInitials for avatar text', () => {
      expect(listSource).toContain("getInitials(conversation.contact.name");
    });
  });
});

// ============================================================
// GROUP 5: Avatar Color Logic Tests
// ============================================================
describe('Avatar Color Logic', () => {
  // We'll test the actual logic by importing
  let getAvatarColor: (name: string) => { bg: string; text: string };
  let getInitials: (name: string) => string;

  beforeEach(async () => {
    const mod = await import('@/lib/avatar-colors');
    getAvatarColor = mod.getAvatarColor;
    getInitials = mod.getInitials;
  });

  it('should return consistent colors for the same name', () => {
    const c1 = getAvatarColor('João Silva');
    const c2 = getAvatarColor('João Silva');
    expect(c1.bg).toBe(c2.bg);
    expect(c1.text).toBe(c2.text);
  });

  it('should return different colors for different names (probabilistic)', () => {
    const names = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena'];
    const colors = new Set(names.map(n => getAvatarColor(n).bg));
    // With 8 names and 8 palettes, we should get at least 3 different colors
    expect(colors.size).toBeGreaterThanOrEqual(3);
  });

  it('should always return an object with bg and text properties', () => {
    const result = getAvatarColor('Test');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('text');
    expect(typeof result.bg).toBe('string');
    expect(typeof result.text).toBe('string');
  });

  it('should handle single character names', () => {
    const result = getInitials('A');
    expect(result).toBe('A');
  });

  it('should handle multi-word names', () => {
    const result = getInitials('João Carlos Silva');
    expect(result).toBe('JC');
  });

  it('should handle empty-ish names', () => {
    const result = getInitials('?');
    expect(result).toBe('?');
  });

  it('should return uppercase initials', () => {
    const result = getInitials('maria santos');
    expect(result).toBe('MS');
  });

  it('should handle names with extra spaces', () => {
    const result = getInitials('Ana  Maria');
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================
// GROUP 6: Skeleton Loading
// ============================================================
describe('Skeleton Loading', () => {
  // ─── #12: Staggered skeleton loading ───
  describe('#12 — Staggered Skeleton Loading', () => {
    let inboxSource: string;

    beforeEach(() => {
      inboxSource = readSrc('components/inbox/RealtimeInboxView.tsx');
    });

    it('should render 7 skeleton items', () => {
      expect(inboxSource).toContain('[1, 2, 3, 4, 5, 6, 7]');
    });

    it('should use motion.div for staggered animation', () => {
      // Check that skeletons use motion.div
      const skeletonSection = inboxSource.match(/loading \? \([\s\S]*?motion\.div[\s\S]*?delay/);
      expect(skeletonSection).toBeTruthy();
    });

    it('should have progressive delay per item', () => {
      expect(inboxSource).toContain('delay: i * 0.05');
    });

    it('should include skeleton for timestamp', () => {
      // Should have a skeleton for the time on the right side
      expect(inboxSource).toContain('Skeleton className="h-3 w-12"');
    });

    it('should include skeleton for name', () => {
      expect(inboxSource).toContain('Skeleton className="h-3.5 w-24"');
    });

    it('should include circular avatar skeleton', () => {
      expect(inboxSource).toContain('Skeleton className="w-10 h-10 rounded-full');
    });
  });
});

// ============================================================
// GROUP 7: Sentiment Indicators
// ============================================================
describe('Sentiment Indicators', () => {
  // ─── #14: Sentiment dots on avatars ───
  describe('#14 — Sentiment Indicator Dots', () => {
    let listSource: string;

    beforeEach(() => {
      listSource = readSrc('components/inbox/VirtualizedRealtimeList.tsx');
    });

    it('should check for ai_sentiment on contact', () => {
      expect(listSource).toContain('ai_sentiment');
    });

    it('should render a sentiment dot element', () => {
      expect(listSource).toContain('Sentiment indicator dot');
    });

    it('should use success color for positive sentiment', () => {
      expect(listSource).toContain("ai_sentiment === 'positive'");
      expect(listSource).toContain('--success');
    });

    it('should use destructive color for negative sentiment', () => {
      expect(listSource).toContain("ai_sentiment === 'negative'");
      expect(listSource).toContain('bg-destructive');
    });

    it('should use warning color for neutral sentiment', () => {
      expect(listSource).toContain("ai_sentiment === 'neutral'");
      expect(listSource).toContain('--warning');
    });

    it('should have a title attribute for accessibility', () => {
      expect(listSource).toContain("title={`Sentimento:");
    });

    it('should position dot at bottom-right of avatar', () => {
      expect(listSource).toContain('-bottom-0.5');
      expect(listSource).toContain('-right-0.5');
    });

    it('should have border matching card background', () => {
      expect(listSource).toContain('border-card');
    });
  });
});

// ============================================================
// GROUP 8: Compact Filters (#2)
// ============================================================
describe('Compact Filters', () => {
  describe('#2 — Compact Tab Spacing', () => {
    let tabsSource: string;

    beforeEach(() => {
      tabsSource = readSrc('components/inbox/TicketTabs.tsx');
    });

    it('should use compact spacing (space-y-1.5 instead of space-y-2)', () => {
      expect(tabsSource).toContain('space-y-1.5');
    });

    it('should use compact gap in main tabs (gap-0.5)', () => {
      expect(tabsSource).toContain('gap-0.5 bg-muted/40');
    });

    it('should use compact padding in main tabs (p-0.5)', () => {
      expect(tabsSource).toContain('p-0.5');
    });

    it('should use smaller font size (text-[11px])', () => {
      expect(tabsSource).toContain('text-[11px] font-medium');
    });

    it('should use smaller icons (w-3 h-3)', () => {
      expect(tabsSource).toContain('<Icon className="w-3 h-3" />');
    });

    it('should use compact sub-tab spacing (gap-0.5)', () => {
      expect(tabsSource).toContain("gap-0.5 px-0.5");
    });
  });
});

// ============================================================
// GROUP 9: Mobile Shell & Components
// ============================================================
describe('Mobile Shell', () => {
  describe('MobileHeader Component', () => {
    let headerSource: string;

    beforeEach(() => {
      headerSource = readSrc('components/mobile/MobileHeader.tsx');
    });

    it('should have view labels for all major routes', () => {
      expect(headerSource).toContain("inbox: 'Conversas'");
      expect(headerSource).toContain("dashboard: 'Dashboard'");
      expect(headerSource).toContain("contacts: 'Contatos'");
    });

    it('should use backdrop-blur for header', () => {
      expect(headerSource).toContain('backdrop-blur');
    });

    it('should have fixed positioning', () => {
      expect(headerSource).toContain('fixed top-0');
    });

    it('should animate title changes', () => {
      expect(headerSource).toContain('key={currentView}');
      expect(headerSource).toContain('initial={{ opacity: 0');
    });

    it('should show agent status indicator', () => {
      expect(headerSource).toContain('agentStatus');
      expect(headerSource).toContain("'online'");
    });

    it('should show unread notification badge', () => {
      expect(headerSource).toContain('unreadCount');
    });
  });

  describe('MobileShell Component', () => {
    let shellSource: string;

    beforeEach(() => {
      shellSource = readSrc('components/mobile/MobileShell.tsx');
    });

    it('should include bottom navigation', () => {
      expect(shellSource).toContain('BottomNavigation');
    });

    it('should include MobileFAB', () => {
      expect(shellSource).toContain('MobileFAB');
    });

    it('should hide FAB when keyboard is open', () => {
      expect(shellSource).toContain('!isKeyboardOpen');
    });

    it('should have "Equipe" tab in navigation', () => {
      expect(shellSource).toContain("label: 'Equipe'");
    });

    it('should have 5 nav items', () => {
      const navItems = shellSource.match(/\{ id: '/g);
      expect(navItems).toBeTruthy();
      expect(navItems!.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// ============================================================
// GROUP 10: AppShell & Zen Mode
// ============================================================
describe('AppShell & Zen Mode', () => {
  let appShellSource: string;

  beforeEach(() => {
    appShellSource = readSrc('components/layout/AppShell.tsx');
  });

  it('should import useZenMode hook', () => {
    expect(appShellSource).toContain('useZenMode');
  });

  it('should hide sidebar in zen mode', () => {
    expect(appShellSource).toContain('!isZen');
  });

  it('should show zen mode toggle for inbox views', () => {
    expect(appShellSource).toContain('isInboxView');
  });

  it('should use Maximize2 and Minimize2 icons for zen toggle', () => {
    expect(appShellSource).toContain('Maximize2');
    expect(appShellSource).toContain('Minimize2');
  });

  it('should have aria-label for zen mode button', () => {
    expect(appShellSource).toContain('Sair do modo zen');
    expect(appShellSource).toContain('Modo zen');
  });

  it('should have keyboard shortcut hint (Esc)', () => {
    expect(appShellSource).toContain('Esc');
  });

  it('should include skip-to-content link', () => {
    expect(appShellSource).toContain('#main-content');
    expect(appShellSource).toContain('Pular para o conteúdo');
  });

  it('should include a11y live regions', () => {
    expect(appShellSource).toContain('role="status"');
    expect(appShellSource).toContain('role="alert"');
    expect(appShellSource).toContain('aria-live="polite"');
    expect(appShellSource).toContain('aria-live="assertive"');
  });
});

// ============================================================
// GROUP 11: PageTemplate
// ============================================================
describe('PageTemplate Component', () => {
  let pageTemplateSource: string;

  beforeEach(() => {
    pageTemplateSource = readSrc('components/layout/PageTemplate.tsx');
  });

  it('should have title slot', () => {
    expect(pageTemplateSource).toContain('title: string');
  });

  it('should have subtitle slot', () => {
    expect(pageTemplateSource).toContain('subtitle?: string');
  });

  it('should have icon slot', () => {
    expect(pageTemplateSource).toContain('icon?: React.ReactNode');
  });

  it('should have actions slot', () => {
    expect(pageTemplateSource).toContain('actions?: React.ReactNode');
  });

  it('should have filters slot', () => {
    expect(pageTemplateSource).toContain('filters?: React.ReactNode');
  });

  it('should support fullBleed mode', () => {
    expect(pageTemplateSource).toContain('fullBleed');
  });

  it('should use motion for page entry animation', () => {
    expect(pageTemplateSource).toContain('motion');
    expect(pageTemplateSource).toContain('pageVariants');
  });

  it('should have responsive padding', () => {
    expect(pageTemplateSource).toContain('sm:px-6');
  });
});

// ============================================================
// GROUP 12: Tailwind Config Validation
// ============================================================
describe('Tailwind Config — Design Tokens', () => {
  let tailwindConfig: string;

  beforeEach(() => {
    tailwindConfig = readRoot('tailwind.config.ts');
  });

  it('should define semantic color tokens', () => {
    expect(tailwindConfig).toContain('primary');
    expect(tailwindConfig).toContain('secondary');
    expect(tailwindConfig).toContain('muted');
    expect(tailwindConfig).toContain('accent');
    expect(tailwindConfig).toContain('destructive');
    expect(tailwindConfig).toContain('success');
    expect(tailwindConfig).toContain('warning');
    expect(tailwindConfig).toContain('info');
  });

  it('should define chat-specific tokens', () => {
    expect(tailwindConfig).toContain('chat');
    expect(tailwindConfig).toContain('chat-bubble-sent');
    expect(tailwindConfig).toContain('chat-bubble-received');
  });

  it('should define status tokens', () => {
    expect(tailwindConfig).toContain('online');
    expect(tailwindConfig).toContain('away');
    expect(tailwindConfig).toContain('offline');
  });

  it('should define priority tokens', () => {
    expect(tailwindConfig).toContain('priority-high');
    expect(tailwindConfig).toContain('priority-medium');
    expect(tailwindConfig).toContain('priority-low');
  });

  it('should define sidebar tokens', () => {
    expect(tailwindConfig).toContain('sidebar-background');
    expect(tailwindConfig).toContain('sidebar-foreground');
  });

  it('should define spacing utilities', () => {
    expect(tailwindConfig).toContain('card:');
    expect(tailwindConfig).toContain('section:');
  });

  it('should define custom animations', () => {
    expect(tailwindConfig).toContain('fade-in');
    expect(tailwindConfig).toContain('slide-up');
    expect(tailwindConfig).toContain('bounce-in');
    expect(tailwindConfig).toContain('shimmer');
    expect(tailwindConfig).toContain('glow-pulse');
  });

  it('should define easing functions', () => {
    expect(tailwindConfig).toContain('bounce-in');
    expect(tailwindConfig).toContain('smooth');
    expect(tailwindConfig).toContain('spring');
  });

  it('should define shadow utilities', () => {
    expect(tailwindConfig).toContain('glow-primary');
    expect(tailwindConfig).toContain('glow-secondary');
    expect(tailwindConfig).toContain('glow-success');
  });

  it('should use HSL for all colors', () => {
    expect(tailwindConfig).toContain('hsl(var(--');
  });

  it('should define primary-glow color', () => {
    expect(tailwindConfig).toContain('primary-glow');
  });

  it('should define card-elevated color', () => {
    expect(tailwindConfig).toContain('card-elevated');
  });

  it('should include whatsapp tokens', () => {
    expect(tailwindConfig).toContain('whatsapp');
  });

  it('should include rank tokens', () => {
    expect(tailwindConfig).toContain('rank-gold');
    expect(tailwindConfig).toContain('rank-silver');
    expect(tailwindConfig).toContain('rank-bronze');
  });
});

// ============================================================
// GROUP 13: EmptyState Component
// ============================================================
describe('EmptyState Component', () => {
  let emptyStateSource: string;

  beforeEach(() => {
    emptyStateSource = readSrc('components/ui/EmptyState.tsx');
  });

  it('should export EmptyState component', () => {
    expect(emptyStateSource).toContain('export');
    expect(emptyStateSource).toContain('EmptyState');
  });

  it('should support multiple variants', () => {
    expect(emptyStateSource).toContain('variant');
    expect(emptyStateSource).toContain('emptyStateConfigs');
  });

  it('should support custom icon', () => {
    expect(emptyStateSource).toContain('icon?: LucideIcon');
  });

  it('should support CTA action', () => {
    expect(emptyStateSource).toContain('actionLabel');
  });

  it('should use framer-motion for animations', () => {
    expect(emptyStateSource).toContain('motion');
  });
});

// ============================================================
// GROUP 14: SkeletonList Component
// ============================================================
describe('SkeletonList Component', () => {
  let skeletonSource: string;

  beforeEach(() => {
    skeletonSource = readSrc('components/ui/SkeletonList.tsx');
  });

  it('should export SkeletonList component', () => {
    expect(skeletonSource).toContain('SkeletonList');
  });

  it('should support list layout', () => {
    expect(skeletonSource).toContain('list');
  });

  it('should support card layout', () => {
    expect(skeletonSource).toContain('card');
  });

  it('should support table layout', () => {
    expect(skeletonSource).toContain('table');
  });
});

// ============================================================
// GROUP 15: Sidebar Favorites
// ============================================================
describe('Sidebar Favorites', () => {
  let favoritesSource: string;

  beforeEach(() => {
    favoritesSource = readSrc('hooks/useSidebarFavorites.ts');
  });

  it('should export useSidebarFavorites hook', () => {
    expect(favoritesSource).toContain('useSidebarFavorites');
  });

  it('should persist to localStorage', () => {
    expect(favoritesSource).toContain('localStorage');
  });

  it('should have max favorites limit', () => {
    expect(favoritesSource).toMatch(/max|limit|MAX/i);
  });

  it('should support toggle operation', () => {
    expect(favoritesSource).toContain('toggle');
  });
});

// ============================================================
// GROUP 16: Zen Mode Hook
// ============================================================
describe('Zen Mode Hook', () => {
  let zenSource: string;

  beforeEach(() => {
    zenSource = readSrc('hooks/useZenMode.ts');
  });

  it('should export useZenMode hook', () => {
    expect(zenSource).toContain('useZenMode');
  });

  it('should provide isZen state', () => {
    expect(zenSource).toContain('isZen');
  });

  it('should provide toggleZen function', () => {
    expect(zenSource).toContain('toggleZen');
  });

  it('should support Escape key to exit', () => {
    expect(zenSource).toContain('Escape');
  });
});

// ============================================================
// GROUP 17: Cross-cutting Quality Checks
// ============================================================
describe('Cross-cutting Quality Checks', () => {
  it('should not have any hardcoded white/black in AppShell', () => {
    const source = readSrc('components/layout/AppShell.tsx');
    expect(source).not.toMatch(/className="[^"]*\bbg-white\b/);
    expect(source).not.toMatch(/className="[^"]*\bbg-black\b/);
    expect(source).not.toMatch(/className="[^"]*\btext-white\b/);
    expect(source).not.toMatch(/className="[^"]*\btext-black\b/);
  });

  it('should use semantic bg-background in main content', () => {
    const source = readSrc('components/layout/AppShell.tsx');
    expect(source).toContain('bg-background');
  });

  it('should not have inline color styles in PageTemplate', () => {
    const source = readSrc('components/layout/PageTemplate.tsx');
    expect(source).not.toMatch(/style=.*color/);
  });

  it('should have proper ARIA landmarks in AppShell', () => {
    const source = readSrc('components/layout/AppShell.tsx');
    expect(source).toContain('role="main"');
    expect(source).toContain('aria-label');
  });

  it('should have tabIndex=-1 on main for skip link target', () => {
    const source = readSrc('components/layout/AppShell.tsx');
    expect(source).toContain('tabIndex={-1}');
  });

  it('should use design tokens in MobileHeader (not hardcoded colors)', () => {
    const source = readSrc('components/mobile/MobileHeader.tsx');
    expect(source).not.toMatch(/className="[^"]*\bbg-white\b/);
    expect(source).not.toMatch(/className="[^"]*\btext-black\b/);
  });

  it('should have responsive classes in ViewRouter fallback', () => {
    const source = readSrc('pages/ViewRouter.tsx');
    expect(source).toContain('max-w-sm');
  });

  it('should use border-border token for borders', () => {
    const source = readSrc('components/inbox/RealtimeInboxView.tsx');
    expect(source).toContain('border-border');
  });
});

// ============================================================
// GROUP 18: Comprehensive File Existence Checks
// ============================================================
describe('File Existence — All Improvement Files Present', () => {
  const requiredFiles = [
    'src/components/layout/AppShell.tsx',
    'src/components/layout/PageTemplate.tsx',
    'src/components/layout/SidebarNavGroup.tsx',
    'src/components/layout/SidebarNavItem.tsx',
    'src/components/mobile/MobileShell.tsx',
    'src/components/mobile/MobileHeader.tsx',
    'src/components/mobile/MobileFAB.tsx',
    'src/components/ui/EmptyState.tsx',
    'src/components/ui/SkeletonList.tsx',
    'src/components/inbox/RealtimeInboxView.tsx',
    'src/components/inbox/VirtualizedRealtimeList.tsx',
    'src/components/inbox/TicketTabs.tsx',
    'src/components/inbox/InboxFilters.tsx',
    'src/hooks/useZenMode.ts',
    'src/hooks/useSidebarFavorites.ts',
    'src/hooks/use-mobile.tsx',
    'src/lib/avatar-colors.ts',
    'src/lib/utils.ts',
    'src/pages/ViewRouter.tsx',
    'src/index.css',
  ];

  requiredFiles.forEach(file => {
    it(`should have ${file}`, () => {
      const fullPath = path.resolve(__dirname, '../..', file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
