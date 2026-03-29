import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface NavItemConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  badge?: number;
}

const SHORTCUT_MAP: Record<string, string> = {
  inbox: '⌘1',
  dashboard: '⌘2',
};

interface SidebarNavItemProps {
  item: NavItemConfig;
  currentView: string;
  onViewChange: (v: string) => void;
  badge?: number;
  collapsed?: boolean;
}

export const SidebarNavItem = React.memo(function SidebarNavItem({ item, currentView, onViewChange, badge, collapsed = true }: SidebarNavItemProps) {
  const Icon = item.icon;
  const isActive = currentView === item.id;
  const shortcut = item.shortcut || SHORTCUT_MAP[item.id];
  const badgeCount = badge ?? item.badge;

  const button = (
    <button
      data-tour={item.id}
      onClick={() => onViewChange(item.id)}
      aria-label={badgeCount ? `${item.label} (${badgeCount} não lidas)` : item.label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative rounded-full flex items-center gap-2.5 transition-all duration-150 group/item',
        collapsed ? 'w-[38px] h-[38px] justify-center' : 'w-full h-[36px] px-3 rounded-xl',
        isActive
          ? 'text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.97]'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30"
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        />
      )}
      <Icon className={cn(
        'w-[18px] h-[18px] relative z-10 shrink-0 transition-transform duration-150',
        !isActive && 'group-hover/item:scale-110'
      )} />
      {!collapsed && (
        <span className="relative z-10 text-[13px] font-medium truncate">{item.label}</span>
      )}
      {badgeCount != null && badgeCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'z-20 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none shadow-sm',
            collapsed ? 'absolute -top-0.5 -right-0.5' : 'relative ml-auto'
          )}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </motion.span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-xs font-medium flex items-center gap-2">
          <span>{item.label}</span>
          {shortcut && (
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
              {shortcut}
            </kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
