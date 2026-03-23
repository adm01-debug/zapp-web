import { useState } from 'react';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/hooks/useTheme';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { ScreenProtectionToggle } from '@/components/notifications/ScreenProtectionToggle';
import { SoundMuteToggle } from '@/components/notifications/SoundMuteToggle';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarNavGroup } from './SidebarNavGroup';
import { primaryNav, sidebarGroups } from './sidebarNavConfig';

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

export function Sidebar({ currentView, onViewChange, currentAgent, onLogout, inboxBadge, onStatusChange }: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <aside
      id="main-navigation"
      role="navigation"
      aria-label="Menu de navegação principal"
      className="flex flex-col h-screen w-[62px] border-r border-border bg-sidebar shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-[56px] shrink-0">
        <button
          onClick={() => onViewChange('inbox')}
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors"
          aria-label="ZAPP — Ir para Inbox"
        >
          <span className="text-primary-foreground font-bold text-sm tracking-tight">Z</span>
        </button>
      </div>

      {/* Primary Nav — always visible */}
      <nav className="flex flex-col items-center gap-1 px-[11px]" aria-label="Menu principal">
        <ul role="list" className="flex flex-col items-center gap-1 w-full list-none p-0 m-0">
        {primaryNav.map((item) => (
          <li key={item.id}>
          <SidebarNavItem
            item={item}
            currentView={currentView}
            onViewChange={onViewChange}
            badge={item.id === 'inbox' ? inboxBadge : undefined}
          />
        ))}
      </nav>

      {/* ⌘K Search trigger */}
      <div className="flex justify-center px-[11px] my-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-global-search'))}
              className="w-[40px] h-[30px] rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-all border border-dashed border-border/50 hover:border-border"
              aria-label="Buscar módulo (Ctrl+K)"
            >
              <Search className="w-[14px] h-[14px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs">
            Buscar <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-3 my-1 h-px bg-border/60" />

      {/* Collapsible groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-[11px] scroll-smooth [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/70">
        <div className="flex flex-col items-center gap-0.5 py-1">
          {sidebarGroups.map((group) => (
            <SidebarNavGroup
              key={group.label}
              label={group.label}
              icon={group.icon}
              items={group.items}
              currentView={currentView}
              onViewChange={onViewChange}
            />
          ))}
        </div>
      </div>

      {/* Bottom: Theme toggle + Avatar + Logout */}
      <div className="flex flex-col items-center gap-1 pt-1.5 pb-3 shrink-0">
        <div className="mx-3 mb-1 h-px bg-border/60 self-stretch" />

        <div className="flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-muted/35 px-1 py-1.5 shadow-sm">
          <ScreenProtectionToggle className="w-[36px] h-[36px]" />
          <PushNotificationToggle className="w-[36px] h-[36px]" />
          <SoundMuteToggle className="w-[36px] h-[36px]" />

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn(
                  "w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-all duration-200",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isDark && "text-primary"
                )}
                aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </TooltipContent>
          </Tooltip>
        </div>

        {currentAgent && (
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="relative group" aria-label="Status e perfil">
                <Avatar className="w-[34px] h-[34px] ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  <AvatarImage src={currentAgent.avatar} alt={currentAgent.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                    {currentAgent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                    currentAgent.status === 'online' && 'bg-[hsl(var(--online))]',
                    currentAgent.status === 'away' && 'bg-[hsl(var(--away))]',
                    currentAgent.status === 'offline' && 'bg-[hsl(var(--offline))]'
                  )}
                />
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
              <div className="mt-1 pt-1 border-t border-border/50">
                <button
                  onClick={() => { onViewChange('settings'); setStatusOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurações
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {onLogout && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">Sair</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
