import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
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

  // Auto-expand when navigating to a child (e.g. via ⌘K or deep link)
  useEffect(() => {
    if (hasActiveItem && !isOpen) setIsOpen(true);
  }, [hasActiveItem]);

  return (
    <div className="flex flex-col items-center w-full">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-full h-[28px] rounded-md flex items-center justify-center gap-0.5 transition-all duration-200 group',
              'border border-transparent',
              hasActiveItem
                ? 'text-primary bg-primary/5 border-primary/20'
                : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40'
            )}
            aria-expanded={isOpen}
            aria-label={`${label} — ${isOpen ? 'recolher' : 'expandir'}`}
          >
            <GroupIcon className="w-[12px] h-[12px]" />
            <ChevronRight className={cn(
              'w-[9px] h-[9px] transition-transform duration-200',
              isOpen && 'rotate-90'
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs font-semibold">
          {label}
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <nav className="flex flex-col items-center gap-0.5 mt-0.5 w-full" aria-label={label}>
          <ul role="list" className="flex flex-col items-center gap-0.5 w-full list-none p-0 m-0">
            {items.map((item) => (
              <li key={item.id}>
                <SidebarNavItem item={item} currentView={currentView} onViewChange={onViewChange} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
