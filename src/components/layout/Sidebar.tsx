import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LogOut,
  Moon,
  Sun,
  Search,
  Circle,
  Clock,
  MinusCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/hooks/useTheme';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useSidebarFavorites } from '@/hooks/useSidebarFavorites';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { ScreenProtectionToggle } from '@/components/notifications/ScreenProtectionToggle';
import { SoundMuteToggle } from '@/components/notifications/SoundMuteToggle';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarNavGroup } from './SidebarNavGroup';
import { primaryNav, sidebarGroups, communicationNav, automationNav, salesNav, connectionsNav, analyticsNav, systemNav } from './sidebarNavConfig';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentAgent?: {
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
  };
  onLogout?: () => void;
  inboxBadge?: number;
  onStatusChange?: (status: 'online' | 'away' | 'offline') => void;
}

export const Sidebar = React.memo(function Sidebar({ currentView, onViewChange, currentAgent, onLogout, inboxBadge, onStatusChange }: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [statusOpen, setStatusOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapse();
  const { favorites, toggleFavorite, isFavorite } = useSidebarFavorites();

  // Build favorite items from all nav configs
  const allNavItems = [...communicationNav, ...automationNav, ...salesNav, ...connectionsNav, ...analyticsNav, ...systemNav];
  const favoriteItems = favorites.map(id => allNavItems.find(item => item.id === id)).filter(Boolean) as typeof allNavItems;

  return (
    <aside
      id="main-navigation"
      role="navigation"
      aria-label="Menu de navegação principal"
      className={cn(
        'flex flex-col h-screen border-r border-border bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[62px]' : 'w-[220px]'
      )}
    >
      {/* ─── Logo + Toggle ─── */}
      <div className={cn('flex items-center h-[56px] shrink-0 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <button
          onClick={() => onViewChange('inbox')}
          className="w-[36px] h-[36px] rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          aria-label="ZAPP — Ir para Inbox"
        >
          <span className="text-primary-foreground font-bold text-sm tracking-tight">Z</span>
        </button>
        {!collapsed && (
          <span className="text-sm font-bold text-foreground tracking-tight ml-2 mr-auto">ZAPP</span>
        )}
        {!collapsed && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="w-[28px] h-[28px] rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                aria-label="Recolher menu"
              >
                <PanelLeftClose className="w-[15px] h-[15px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              Recolher <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌘B</kbd>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ─── Expand Button (collapsed only) ─── */}
      {collapsed && (
        <div className="flex justify-center my-1">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all border border-border/40 hover:border-border focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                aria-label="Expandir menu"
              >
                <PanelLeftOpen className="w-[16px] h-[16px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              Expandir <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌘B</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ─── Primary Nav ─── */}
      <nav className={cn('flex flex-col gap-0.5', collapsed ? 'items-center px-[11px]' : 'px-2')} aria-label="Menu principal">
        <ul role="list" className={cn('flex flex-col gap-0.5 w-full list-none p-0 m-0', collapsed && 'items-center')}>
          {primaryNav.map((item) => (
            <li key={item.id}>
              <SidebarNavItem
                item={item}
                currentView={currentView}
                onViewChange={onViewChange}
                badge={item.id === 'inbox' ? inboxBadge : undefined}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ─── ⌘K Search ─── */}
      <div className={cn('flex my-1.5', collapsed ? 'justify-center px-[11px]' : 'px-2')}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-global-search'))}
              className={cn(
                'rounded-lg flex items-center gap-2 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-all border border-dashed border-border/40 hover:border-border',
                collapsed ? 'w-[40px] h-[30px] justify-center' : 'w-full h-[32px] px-3'
              )}
              aria-label="Buscar módulo (Ctrl+K)"
            >
              <Search className="w-[14px] h-[14px] shrink-0" />
              {!collapsed && <span className="text-xs text-muted-foreground/60">Buscar...</span>}
              {!collapsed && <kbd className="ml-auto px-1 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground/50">⌘K</kbd>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              Buscar <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* ─── Favorites Section ─── */}
      {favoriteItems.length > 0 && (
        <>
          <div className={cn('mx-3 h-px bg-border/40', collapsed ? 'my-1' : 'my-1.5')} />
          {!collapsed && (
            <div className="px-3 flex items-center gap-1.5">
              <Star className="w-[10px] h-[10px] text-warning fill-warning" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Favoritos</span>
            </div>
          )}
          <nav className={cn('flex flex-col gap-0.5', collapsed ? 'items-center px-[11px]' : 'px-2')} aria-label="Favoritos">
            <ul role="list" className={cn('flex flex-col gap-0.5 w-full list-none p-0 m-0', collapsed && 'items-center')}>
              {favoriteItems.map((item) => (
                <li key={item.id}>
                  <SidebarNavItem
                    item={item}
                    currentView={currentView}
                    onViewChange={onViewChange}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      {/* ─── Section Divider ─── */}
      <div className={cn('mx-3 h-px bg-border/40', collapsed ? 'my-1' : 'my-1.5')} />

      {/* ─── Collapsible Groups ─── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scroll-smooth [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/70">
        <div className={cn('flex flex-col gap-1.5 py-1', collapsed ? 'items-center px-[11px]' : 'px-2')}>
          {sidebarGroups.map((group) => (
            <SidebarNavGroup
              key={group.label}
              label={group.label}
              icon={group.icon}
              items={group.items}
              currentView={currentView}
              onViewChange={onViewChange}
              collapsed={collapsed}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          ))}
        </div>
      </div>

      {/* ─── Bottom Controls ─── */}
      <div className="flex flex-col items-center gap-1.5 pt-1.5 pb-3 shrink-0">
        <div className="mx-3 h-px bg-border/40 self-stretch" />

        {!collapsed && (
          <div className="px-3 self-stretch flex items-center gap-1.5 pb-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Controles rápidos</span>
          </div>
        )}

        <div className={cn(
          'flex items-center gap-1 rounded-xl border border-border/50 bg-muted/25 px-1.5 py-1.5 shadow-sm',
          collapsed ? 'flex-col' : 'flex-row self-stretch mx-2'
        )}>
          <ScreenProtectionToggle className="w-[36px] h-[36px]" />
          <PushNotificationToggle className="w-[36px] h-[36px]" />
          <SoundMuteToggle className="w-[36px] h-[36px]" />
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn(
                  "w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-all duration-200",
                  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
                  isDark && "text-primary"
                )}
                aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-[16px] h-[16px]" /> : <Moon className="w-[16px] h-[16px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ─── Agent Profile ─── */}
        {currentAgent && (
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'relative group flex items-center gap-2.5 rounded-lg transition-colors hover:bg-muted/40',
                  collapsed ? 'justify-center p-1' : 'w-full px-3 py-1.5'
                )}
                aria-label="Status e perfil"
              >
                <Avatar className="w-[32px] h-[32px] ring-2 ring-transparent group-hover:ring-primary/30 transition-all shrink-0">
                  <AvatarImage src={currentAgent.avatar} alt={currentAgent.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                    {currentAgent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                    collapsed ? '-bottom-0.5 -right-0.5' : 'bottom-1 left-[30px]',
                    currentAgent.status === 'online' && 'bg-[hsl(var(--online))]',
                    currentAgent.status === 'away' && 'bg-[hsl(var(--away))]',
                    currentAgent.status === 'offline' && 'bg-[hsl(var(--offline))]'
                  )}
                />
                {!collapsed && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-medium text-foreground truncate leading-tight">{currentAgent.name}</span>
                    <span className={cn(
                      'text-[10px] capitalize leading-tight',
                      currentAgent.status === 'online' && 'text-[hsl(var(--online))]',
                      currentAgent.status === 'away' && 'text-[hsl(var(--away))]',
                      currentAgent.status === 'offline' && 'text-muted-foreground'
                    )}>
                      {currentAgent.status === 'away' ? 'Ausente' : currentAgent.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={12} align="end" className="w-48 p-2">
              <div className="px-2 py-1.5 mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{currentAgent.name}</p>
              </div>
              <div className="space-y-0.5">
                {([
                  { status: 'online' as const, label: 'Online', icon: Circle, color: 'text-[hsl(var(--online))]' },
                  { status: 'away' as const, label: 'Ausente', icon: Clock, color: 'text-[hsl(var(--away))]' },
                  { status: 'offline' as const, label: 'Offline', icon: MinusCircle, color: 'text-[hsl(var(--offline))]' },
                ]).map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => { onStatusChange?.(opt.status); setStatusOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                      currentAgent.status === opt.status
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <opt.icon className={cn('w-3.5 h-3.5', opt.color)} />
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 pt-1 border-t border-border/50 space-y-0.5">
                <button
                  onClick={() => { onViewChange('settings'); setStatusOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurações
                </button>
                {onLogout && (
                  <button
                    onClick={() => { onLogout(); setStatusOpen(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair da conta
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}



      </div>
    </aside>
  );
});
