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
  collapsed?: boolean;
}

export function SidebarNavGroup({ label, icon: GroupIcon, items, currentView, onViewChange, defaultOpen = false, collapsed = true }: SidebarNavGroupProps) {
  const hasActiveItem = items.some(item => item.id === currentView);
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveItem);

  useEffect(() => {
    if (hasActiveItem && !isOpen) setIsOpen(true);
  }, [hasActiveItem]);

  const triggerButton = (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'rounded-md flex items-center transition-all duration-200 group border border-transparent',
        collapsed ? 'w-full h-[28px] justify-center gap-0.5' : 'w-full h-[32px] px-3 gap-2',
        hasActiveItem
          ? 'text-primary bg-primary/5 border-primary/20'
          : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40'
      )}
      aria-expanded={isOpen}
      aria-label={`${label} — ${isOpen ? 'recolher' : 'expandir'}`}
    >
      <GroupIcon className={cn(collapsed ? 'w-[12px] h-[12px]' : 'w-[14px] h-[14px]', 'shrink-0')} />
      {!collapsed && (
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate">{label}</span>
      )}
      <ChevronRight className={cn(
        'transition-transform duration-200 shrink-0',
        collapsed ? 'w-[9px] h-[9px]' : 'w-[12px] h-[12px] ml-auto',
        isOpen && 'rotate-90'
      )} />
    </button>
  );

  return (
    <div className="flex flex-col w-full">
      {collapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs font-semibold">
            {label}
          </TooltipContent>
        </Tooltip>
      ) : (
        triggerButton
      )}

      {isOpen && (
        <nav className={cn('flex flex-col gap-0.5 mt-0.5 w-full', collapsed && 'items-center')} aria-label={label}>
          <ul role="list" className={cn('flex flex-col gap-0.5 w-full list-none p-0 m-0', collapsed && 'items-center')}>
            {items.map((item) => (
              <li key={item.id}>
                <SidebarNavItem item={item} currentView={currentView} onViewChange={onViewChange} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
