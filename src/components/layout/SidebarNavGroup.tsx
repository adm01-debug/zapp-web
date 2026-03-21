import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarNavItem, type NavItemConfig } from './SidebarNavItem';

interface SidebarNavGroupProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: readonly NavItemConfig[];
  currentView: string;
  onViewChange: (v: string) => void;
  defaultOpen?: boolean;
}

export function SidebarNavGroup({ label, icon: GroupIcon, items, currentView, onViewChange, defaultOpen = false }: SidebarNavGroupProps) {
  const hasActiveItem = items.some(item => item.id === currentView);
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveItem);

  return (
    <div className="flex flex-col items-center">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-[40px] h-[32px] rounded-lg flex items-center justify-center transition-all duration-200 relative',
              hasActiveItem
                ? 'text-primary'
                : 'text-muted-foreground/60 hover:text-muted-foreground'
            )}
            aria-expanded={isOpen}
            aria-label={`${label} — ${isOpen ? 'recolher' : 'expandir'}`}
          >
            <GroupIcon className="w-[14px] h-[14px]" />
            <ChevronDown className={cn(
              'w-[8px] h-[8px] absolute bottom-0.5 right-1 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-semibold">
          {label}
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <nav className="flex flex-col items-center gap-0.5 mt-0.5" aria-label={label}>
          {items.map((item) => (
            <SidebarNavItem key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
          ))}
        </nav>
      )}
    </div>
  );
}
