import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useCurrentModule } from '@/hooks/useCurrentModule';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ViewHeaderProps {
  viewId: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  breadcrumbTrail?: string[];
  onNavigateTo?: (viewId: string) => void;
}

function BreadcrumbLink({ viewId, onClick }: { viewId: string; onClick: () => void }) {
  const mod = useCurrentModule(viewId);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="flex items-center gap-1 shrink-0"
    >
      <button
        onClick={onClick}
        className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground font-medium transition-colors truncate max-w-[100px]"
        aria-label={`Ir para ${mod.label}`}
      >
        {mod.label}
      </button>
      <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
    </motion.div>
  );
}

/** Compact auto-contextual header with back/forward navigation and breadcrumbs */
export function ViewHeader({
  viewId,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  breadcrumbTrail = [],
  onNavigateTo,
}: ViewHeaderProps) {
  const mod = useCurrentModule(viewId);
  const Icon = mod.icon;
  const breadcrumbItems = breadcrumbTrail.slice(0, -1);

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 min-h-[40px]">
      {/* Back / Forward */}
      <div className="flex items-center gap-0.5 mr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-7 h-7 rounded-lg transition-all',
                canGoBack
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground/25 cursor-default'
              )}
              onClick={onGoBack}
              disabled={!canGoBack}
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {canGoBack ? 'Voltar (Alt+←)' : 'Sem histórico anterior'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-7 h-7 rounded-lg transition-all',
                canGoForward
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground/25 cursor-default'
              )}
              onClick={onGoForward}
              disabled={!canGoForward}
              aria-label="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {canGoForward ? 'Avançar (Alt+→)' : 'Sem histórico à frente'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Breadcrumb trail */}
      <nav aria-label="Trilha de navegação" className="flex items-center gap-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {breadcrumbItems.map((trailViewId) => (
            <BreadcrumbLink
              key={trailViewId}
              viewId={trailViewId}
              onClick={() => onNavigateTo?.(trailViewId)}
            />
          ))}
        </AnimatePresence>

        {/* Group label when no breadcrumb trail */}
        {mod.group && breadcrumbItems.length === 0 && (
          <>
            <span className="text-[11px] text-muted-foreground/60 font-medium shrink-0">{mod.group}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" aria-hidden="true" />
          </>
        )}

        {/* Current module */}
        <motion.div
          key={viewId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 shrink-0"
          aria-current="page"
        >
          {Icon && <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
          <span className="text-sm font-semibold text-foreground">{mod.label}</span>
        </motion.div>
      </nav>

      {/* Search */}
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('open-global-search'))}
        className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors shrink-0"
        aria-label="Buscar módulo"
      >
        <Search className="w-3 h-3" />
        <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-muted/60 text-[9px] font-mono">⌘K</kbd>
      </button>
    </div>
  );
}
