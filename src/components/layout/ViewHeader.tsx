import { useCurrentModule } from '@/hooks/useCurrentModule';
import { ChevronRight, Search } from 'lucide-react';

interface ViewHeaderProps {
  viewId: string;
}

/** Compact auto-contextual header for view pages */
export function ViewHeader({ viewId }: ViewHeaderProps) {
  const mod = useCurrentModule(viewId);
  const Icon = mod.icon;

  return (
    <div className="flex items-center gap-2 px-5 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 min-h-[40px]">
      {mod.group && (
        <>
          <span className="text-[11px] text-muted-foreground/60 font-medium">{mod.group}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
        </>
      )}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className="text-sm font-semibold text-foreground">{mod.label}</span>
      </div>

      <button
        onClick={() => document.dispatchEvent(new CustomEvent('open-global-search'))}
        className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
        aria-label="Buscar módulo"
      >
        <Search className="w-3 h-3" />
        <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-muted/60 text-[9px] font-mono">⌘K</kbd>
      </button>
    </div>
  );
}
