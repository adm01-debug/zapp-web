import { cn } from '@/lib/utils';
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
            'relative w-[40px] h-[40px] rounded-[10px] flex items-center justify-center transition-all duration-200',
            isActive
              ? 'bg-primary text-primary-foreground shadow-[var(--shadow-glow-primary)]'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="w-[18px] h-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-xs font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
