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

// Map nav IDs to keyboard shortcut hints
const SHORTCUT_MAP: Record<string, string> = {
  inbox: '⌘1',
  dashboard: '⌘2',
};

interface SidebarNavItemProps {
  item: NavItemConfig;
  currentView: string;
  onViewChange: (v: string) => void;
  badge?: number;
}

export function SidebarNavItem({ item, currentView, onViewChange, badge }: SidebarNavItemProps) {
  const Icon = item.icon;
  const isActive = currentView === item.id;
  const shortcut = item.shortcut || SHORTCUT_MAP[item.id];
  const badgeCount = badge ?? item.badge;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          data-tour={item.id}
          onClick={() => onViewChange(item.id)}
          aria-label={badgeCount ? `${item.label} (${badgeCount} não lidas)` : item.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'relative w-[40px] h-[40px] rounded-[10px] flex items-center justify-center transition-colors duration-150',
            isActive
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-[10px] bg-primary shadow-[var(--shadow-glow-primary)]"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <Icon className="w-[18px] h-[18px] relative z-10" />
          {badgeCount != null && badgeCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 z-20 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none shadow-sm"
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </motion.span>
          )}
        </button>
      </TooltipTrigger>
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
