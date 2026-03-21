import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface NavItemConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface SidebarNavItemProps {
  item: NavItemConfig;
  currentView: string;
  onViewChange: (v: string) => void;
}

export function SidebarNavItem({ item, currentView, onViewChange }: SidebarNavItemProps) {
  const Icon = item.icon;
  const isActive = currentView === item.id;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          data-tour={item.id}
          onClick={() => onViewChange(item.id)}
          aria-label={item.label}
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
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-xs font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
