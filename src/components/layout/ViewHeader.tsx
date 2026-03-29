import React from 'react';
import { ChevronLeft, ChevronRight, Home, Search } from 'lucide-react';
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

function BreadcrumbLink({ viewId, onClick, isHome }: { viewId: string; onClick: () => void; isHome?: boolean }) {
  const mod = useCurrentModule(viewId);
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1 shrink-0"
    >
      <button
        onClick={onClick}
        className="text-[11px] text-muted-foreground/50 hover:text-foreground font-medium transition-colors truncate max-w-[100px] rounded px-1 py-0.5 hover:bg-muted/40"
        aria-label={`Ir para ${mod.label}`}
      >
        {isHome ? (
          <Home className="w-3 h-3" aria-hidden="true" />
        ) : (
          mod.label
        )}
      </button>
      <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/25 shrink-0" aria-hidden="true" />
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
    <div className="flex items-center gap-1 px-3 py-1 border-b border-border/40 bg-background/60 backdrop-blur-md shrink-0 min-h-[36px]">
      {/* Back / Forward — browser-style controls */}
      <div className="flex items-center gap-px mr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-6 h-6 rounded-md transition-all',
                canGoBack
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground/20 cursor-default pointer-events-none'
              )}
              onClick={onGoBack}
              disabled={!canGoBack}
              aria-label="Voltar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            {canGoBack ? 'Voltar (Alt+←)' : 'Sem histórico'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-6 h-6 rounded-md transition-all',
                canGoForward
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground/20 cursor-default pointer-events-none'
              )}
              onClick={onGoForward}
              disabled={!canGoForward}
              aria-label="Avançar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            {canGoForward ? 'Avançar (Alt+→)' : 'Sem histórico'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Breadcrumb trail */}
      <nav aria-label="Trilha de navegação" className="flex items-center gap-0.5 min-w-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {breadcrumbItems.map((trailViewId, idx) => (
            <BreadcrumbLink
              key={trailViewId}
              viewId={trailViewId}
              isHome={idx === 0 && breadcrumbItems.length > 1}
              onClick={() => onNavigateTo?.(trailViewId)}
            />
          ))}
        </AnimatePresence>

        {/* Group label when no breadcrumb trail */}
        {mod.group && breadcrumbItems.length === 0 && (
          <>
            <span className="text-[10px] text-muted-foreground/40 font-medium shrink-0 uppercase tracking-wider">{mod.group}</span>
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/25 shrink-0 mx-0.5" aria-hidden="true" />
          </>
        )}

        {/* Current module */}
        <motion.div
          key={viewId}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5 shrink-0"
          aria-current="page"
        >
          {Icon && <Icon className="w-3.5 h-3.5 text-primary/80" aria-hidden="true" />}
          <span className="text-[13px] font-semibold text-foreground tracking-tight">{mod.label}</span>
        </motion.div>
      </nav>

      {/* Search trigger */}
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('open-global-search'))}
        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors shrink-0"
        aria-label="Buscar módulo"
      >
        <Search className="w-3 h-3" />
        <kbd className="hidden sm:inline px-1 py-px rounded bg-muted/50 text-[8px] font-mono">⌘K</kbd>
      </button>
    </div>
  );
}
