import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { DashboardWidget } from '@/hooks/useDashboardWidgets';

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
  const [showLevel2, setShowLevel2] = useState(true);
  const [showLevel3, setShowLevel3] = useState(false);

  return (
    <div className="space-y-6">
      {/* Level 1 - Always Visible: KPIs Críticos */}
      <section aria-label="Métricas principais">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {level1Widgets.map((widget) => (
            <div key={widget.id}>{renderWidget(widget)}</div>
          ))}
        </motion.div>
      </section>

      {/* Level 2 - Expandable: Detalhes Operacionais */}
      <Collapsible open={showLevel2} onOpenChange={setShowLevel2}>
        <CollapsibleTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl",
              "bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50",
              "border border-border/50 hover:border-primary/30",
              "transition-all duration-300 group"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Eye className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-medium text-foreground">Detalhes Operacionais</span>
                <p className="text-xs text-muted-foreground">
                  Filas, atividades recentes e desafios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {level2Widgets.length} itens
              </Badge>
              <motion.div
                animate={{ rotate: showLevel2 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="p-1 rounded-full bg-muted group-hover:bg-primary/10"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </motion.div>
            </div>
          </motion.button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AnimatePresence>
            {showLevel2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-4 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {level2Widgets.map((widget, index) => (
                    <motion.div
                      key={widget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        widget.size === 'full' && 'md:col-span-2'
                      )}
                    >
                      {renderWidget(widget)}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>

      {/* Level 3 - On Demand: Gamificação */}
      <Collapsible open={showLevel3} onOpenChange={setShowLevel3}>
        <CollapsibleTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl",
              "bg-gradient-to-r from-secondary/10 to-primary/10 hover:from-secondary/20 hover:to-primary/20",
              "border border-secondary/30 hover:border-secondary/50",
              "transition-all duration-300 group"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20 text-secondary">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Gamificação & IA</span>
                  <Sparkles className="w-3 h-3 text-secondary animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Conquistas, ranking, mini-games e estatísticas de IA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs bg-secondary/20 text-secondary border-0">
                {level3Widgets.length} itens
              </Badge>
              <motion.div
                animate={{ rotate: showLevel3 ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="p-1 rounded-full bg-secondary/10 group-hover:bg-secondary/20"
              >
                <ChevronDown className="w-4 h-4 text-secondary" />
              </motion.div>
            </div>
          </motion.button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <AnimatePresence>
            {showLevel3 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-4 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {level3Widgets.map((widget, index) => (
                    <motion.div
                      key={widget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        widget.size === 'full' && 'md:col-span-2'
                      )}
                    >
                      {renderWidget(widget)}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
