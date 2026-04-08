import { useState } from 'react';
import { useSLARules, SLARule, SLARuleScope } from '@/hooks/useSLARules';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { SLARuleRow } from './SLARuleRow';
import { SLARuleFormDialog } from './SLARuleFormDialog';

interface ScopeRulesListProps {
  scope: SLARuleScope;
}

export function ScopeRulesList({ scope }: ScopeRulesListProps) {
  const { rules, isLoading, deleteRule, toggleRule } = useSLARules(scope);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<SLARule | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingRule(null); setShowDialog(true); }}
            className="gap-1.5 rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Regra
          </Button>
        </motion.div>
      </div>

      {rules.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma regra de SLA neste escopo</p>
          <p className="text-xs mt-1 opacity-70">Crie uma regra para definir prazos específicos</p>
        </motion.div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <SLARuleRow
                key={rule.id}
                rule={rule}
                scope={scope}
                index={index}
                onEdit={() => { setEditingRule(rule); setShowDialog(true); }}
                onDelete={() => deleteRule(rule.id)}
                onToggle={(active) => toggleRule({ id: rule.id, is_active: active })}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <SLARuleFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        scope={scope}
        editingRule={editingRule}
      />
    </div>
  );
}
