import { SLARule, SLARuleScope, SLARuleMetadata } from '@/hooks/useSLARules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Target, Edit2, Trash2, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatSLAMinutes } from './sla-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SLARuleRowProps {
  rule: SLARule;
  scope: SLARuleScope;
  scopeLabel?: string;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

export function SLARuleRow({ rule, scope, scopeLabel, index, onEdit, onDelete, onToggle }: SLARuleRowProps) {
  const fallbackLabel = scope === 'contact' ? rule.contact_id?.slice(0, 8) + '…'
    : scope === 'company' ? rule.company
    : scope === 'job_title' ? rule.job_title
    : scope === 'contact_type' ? rule.contact_type
    : scope === 'queue' ? rule.queue_id?.slice(0, 8) + '…'
    : rule.agent_id?.slice(0, 8) + '…';

  const displayLabel = scopeLabel || fallbackLabel;
  const meta = (rule.metadata || {}) as SLARuleMetadata;
  const hasEscalation = meta.notify_on_warning || !!meta.escalation_notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all duration-200"
    >
      <Switch checked={rule.is_active} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate text-foreground">{rule.name}</span>
          <Badge variant="outline" className="text-[10px] font-mono">P{rule.priority}</Badge>
          {displayLabel && (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[150px]">{displayLabel}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> 1ª Resp: <span className="font-medium text-foreground/80">{formatSLAMinutes(rule.first_response_minutes)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" /> Resolução: <span className="font-medium text-foreground/80">{formatSLAMinutes(rule.resolution_minutes)}</span>
          </span>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-primary/10" onClick={onEdit}>
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra de SLA</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra <strong>"{rule.name}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
