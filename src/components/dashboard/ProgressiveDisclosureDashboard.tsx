import * as React from 'react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Gamepad2,
  TrendingUp,
  Clock,
  Users,
  MessageSquare,
  Settings2,
  Maximize2,
  Minimize2,
  RefreshCw,
  MoreHorizontal,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DashboardWidget } from '@/hooks/useDashboardWidgets';

// =============================================================================
// TIPOS
// =============================================================================

interface WidgetSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  widgets: DashboardWidget[];
  defaultOpen?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

interface EnhancedProgressiveDisclosureProps {
  sections: WidgetSection[];
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

// =============================================================================
// COMPONENTE: WIDGET SECTION HEADER
// =============================================================================

interface SectionHeaderProps {
  section: WidgetSection;
  isOpen: boolean;
  onToggle: () => void;
  onAction?: (action: string) => void;
}

function SectionHeader({ section, isOpen, onToggle, onAction }: SectionHeaderProps) {
  const Icon = section.icon;

  const variantStyles = {
    default: {
      container: 'from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 border-border/50 hover:border-muted-foreground/30',
      icon: 'bg-muted text-muted-foreground',
      chevron: 'bg-muted group-hover:bg-muted-foreground/20',
    },
    primary: {
      container: 'from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20 hover:border-primary/40',
      icon: 'bg-primary/20 text-primary',
      chevron: 'bg-primary/10 group-hover:bg-primary/20',
    },
    secondary: {
      container: 'from-secondary/10 to-secondary/5 hover:from-secondary/20 hover:to-secondary/10 border-secondary/20 hover:border-secondary/40',
      icon: 'bg-secondary/20 text-secondary',
      chevron: 'bg-secondary/10 group-hover:bg-secondary/20',
    },
    accent: {
      container: 'from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border-accent/20 hover:border-accent/40',
      icon: 'bg-accent/20 text-accent',
      chevron: 'bg-accent/10 group-hover:bg-accent/20',
    },
  };

  const styles = variantStyles[section.variant || 'default'];

  return (
    <motion.div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl',
        'bg-gradient-to-r border transition-all duration-300 group cursor-pointer',
        styles.container
      )}
      whileHover={{ scale: 1.002 }}
      whileTap={{ scale: 0.998 }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <motion.div 
          className={cn('p-2.5 rounded-xl', styles.icon)}
          animate={{ rotate: isOpen ? 0 : -5 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{section.title}</span>
            {section.variant === 'secondary' && (
              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {section.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge 
          variant="secondary" 
          className={cn(
            'text-xs transition-colors',
            isOpen && 'bg-primary/10 text-primary'
          )}
        >
          {section.widgets.length} {section.widgets.length === 1 ? 'item' : 'itens'}
        </Badge>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn('p-1.5 rounded-full transition-colors', styles.chevron)}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// COMPONENTE: WIDGET GRID
// =============================================================================

interface WidgetGridProps {
  widgets: DashboardWidget[];
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

function WidgetGrid({ widgets, renderWidget }: WidgetGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="pt-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={cn(
              widget.size === 'full' && 'md:col-span-2 lg:col-span-3',
              widget.size === 'large' && 'md:col-span-2'
            )}
          >
            {renderWidget(widget)}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// =============================================================================
// COMPONENTE: DASHBOARD TOOLBAR
// =============================================================================

interface DashboardToolbarProps {
  onRefresh?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  isLoading?: boolean;
  lastUpdated?: Date;
}

function DashboardToolbar({ 
  onRefresh, 
  onExport, 
  onFilter, 
  isLoading,
  lastUpdated 
}: DashboardToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>
          Atualizado {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'agora'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onFilter && (
          <Button variant="outline" size="sm" onClick={onFilter} className="gap-2">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtrar</span>
          </Button>
        )}
        
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        )}

        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function EnhancedProgressiveDisclosure({
  sections,
  renderWidget,
  onRefresh,
  onExport,
  isLoading,
}: EnhancedProgressiveDisclosureProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach(section => {
      if (section.defaultOpen !== false) {
        initial.add(section.id);
      }
    });
    return initial;
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setOpenSections(new Set());
  };

  const totalWidgets = useMemo(() => 
    sections.reduce((acc, s) => acc + s.widgets.length, 0),
    [sections]
  );

  const visibleWidgets = useMemo(() => 
    sections
      .filter(s => openSections.has(s.id))
      .reduce((acc, s) => acc + s.widgets.length, 0),
    [sections, openSections]
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <DashboardToolbar
        onRefresh={onRefresh}
        onExport={onExport}
        isLoading={isLoading}
        lastUpdated={new Date()}
      />

      {/* Quick actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Mostrando <span className="font-medium text-foreground">{visibleWidgets}</span> de {totalWidgets} widgets
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll} className="gap-1.5 text-xs">
            <Maximize2 className="w-3.5 h-3.5" />
            Expandir
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="gap-1.5 text-xs">
            <Minimize2 className="w-3.5 h-3.5" />
            Recolher
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);

          return (
            <Collapsible 
              key={section.id} 
              open={isOpen} 
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <div>
                  <SectionHeader
                    section={section}
                    isOpen={isOpen}
                    onToggle={() => toggleSection(section.id)}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <AnimatePresence>
                  {isOpen && (
                    <WidgetGrid 
                      widgets={section.widgets} 
                      renderWidget={renderWidget} 
                    />
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE LEGADO (mantido para compatibilidade)
// =============================================================================

interface ProgressiveDisclosureDashboardProps {
  level1Widgets: DashboardWidget[];
  level2Widgets: DashboardWidget[];
  level3Widgets: DashboardWidget[];
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

export function ProgressiveDisclosureDashboard({
  level1Widgets,
  level2Widgets,
  level3Widgets,
  renderWidget,
}: ProgressiveDisclosureDashboardProps) {
  // Converter para o novo formato
  const sections: WidgetSection[] = [
    {
      id: 'kpis',
      title: 'KPIs Principais',
      description: 'Métricas críticas de desempenho',
      icon: TrendingUp,
      widgets: level1Widgets,
      defaultOpen: true,
      variant: 'primary',
    },
    {
      id: 'operations',
      title: 'Detalhes Operacionais',
      description: 'Filas, atividades recentes e desafios',
      icon: Eye,
      widgets: level2Widgets,
      defaultOpen: true,
      variant: 'default',
    },
    {
      id: 'gamification',
      title: 'Gamificação & IA',
      description: 'Conquistas, ranking, mini-games e estatísticas de IA',
      icon: Gamepad2,
      widgets: level3Widgets,
      defaultOpen: false,
      variant: 'secondary',
    },
  ];

  return (
    <EnhancedProgressiveDisclosure
      sections={sections}
      renderWidget={renderWidget}
    />
  );
}
