import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users, MessageSquare, UsersRound, FileText, ShieldCheck,
  ClipboardList, Handshake, UserCheck, Truck, Wrench, X,
} from 'lucide-react';
import { ConversationWithMessages } from '@/hooks/useRealtimeMessages';

// ---------- types & config ----------

export interface FilterOption {
  value: string;
  label: string;
  icon: typeof Users;
  iconColor: string;
  indent?: boolean;
  /** Function to test if a conversation matches this filter */
  match: (c: ConversationWithMessages) => boolean;
}

const isGroup = (phone: string | null | undefined) =>
  /^\d+-\d+$/.test((phone || '').replace(/\D/g, ''));

export const FILTER_OPTIONS: FilterOption[] = [
  {
    value: 'all',
    label: 'Todos os tipos',
    icon: Users,
    iconColor: 'text-muted-foreground',
    match: () => true,
  },
  {
    value: 'individual',
    label: 'Chats Individuais',
    icon: MessageSquare,
    iconColor: 'text-primary',
    match: (c) => !isGroup(c.contact.phone),
  },
  {
    value: 'grupo',
    label: 'Todos os Grupos',
    icon: UsersRound,
    iconColor: 'text-amber-500',
    match: (c) => isGroup(c.contact.phone),
  },
  {
    value: 'grupo_orcamentos',
    label: 'Orçamentos | Fornecedores',
    icon: FileText,
    iconColor: 'text-blue-500',
    indent: true,
    match: (c) => isGroup(c.contact.phone) && c.contact.group_category === 'orcamentos',
  },
  {
    value: 'grupo_aprovacao',
    label: 'Aprovação | Fornecedores',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    indent: true,
    match: (c) => isGroup(c.contact.phone) && c.contact.group_category === 'aprovacao',
  },
  {
    value: 'grupo_os',
    label: 'O.S. | Fornecedores',
    icon: ClipboardList,
    iconColor: 'text-orange-500',
    indent: true,
    match: (c) => isGroup(c.contact.phone) && c.contact.group_category === 'os',
  },
  {
    value: 'grupo_acerto',
    label: 'Acerto | Fornecedores',
    icon: Handshake,
    iconColor: 'text-purple-500',
    indent: true,
    match: (c) => isGroup(c.contact.phone) && c.contact.group_category === 'acerto',
  },
  {
    value: 'grupo_sem_categoria',
    label: 'Grupos sem categoria',
    icon: UsersRound,
    iconColor: 'text-muted-foreground',
    indent: true,
    match: (c) => isGroup(c.contact.phone) && !c.contact.group_category,
  },
  // separator handled by index
  {
    value: 'cliente',
    label: 'Clientes',
    icon: Users,
    iconColor: 'text-blue-500',
    match: (c) => !isGroup(c.contact.phone) && (c.contact.contact_type || 'cliente') === 'cliente',
  },
  {
    value: 'colaborador',
    label: 'Colaboradores',
    icon: UserCheck,
    iconColor: 'text-green-500',
    match: (c) => !isGroup(c.contact.phone) && c.contact.contact_type === 'colaborador',
  },
  {
    value: 'fornecedor',
    label: 'Fornecedores',
    icon: Truck,
    iconColor: 'text-purple-500',
    match: (c) => !isGroup(c.contact.phone) && c.contact.contact_type === 'fornecedor',
  },
  {
    value: 'prestador_servico',
    label: 'Prestadores de Serviço',
    icon: Wrench,
    iconColor: 'text-orange-500',
    match: (c) => !isGroup(c.contact.phone) && c.contact.contact_type === 'prestador_servico',
  },
  {
    value: 'transportadora',
    label: 'Transportadoras',
    icon: Truck,
    iconColor: 'text-cyan-500',
    match: (c) => !isGroup(c.contact.phone) && c.contact.contact_type === 'transportadora',
  },
];

// Separators go AFTER these values
const SEPARATOR_AFTER = new Set(['individual', 'grupo_sem_categoria']);

// ---------- stats helper ----------

interface FilterStats {
  count: number;
  unread: number;
}

function computeStats(
  conversations: ConversationWithMessages[],
  options: FilterOption[],
): Record<string, FilterStats> {
  const stats: Record<string, FilterStats> = {};
  for (const opt of options) {
    stats[opt.value] = { count: 0, unread: 0 };
  }
  for (const c of conversations) {
    for (const opt of options) {
      if (opt.match(c)) {
        stats[opt.value].count++;
        if (c.unreadCount > 0) stats[opt.value].unread++;
      }
    }
  }
  return stats;
}

// ---------- component ----------

interface ContactTypeFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  conversations: ConversationWithMessages[];
}

export function ContactTypeFilter({ value, onChange, conversations }: ContactTypeFilterProps) {
  const stats = useMemo(
    () => computeStats(conversations, FILTER_OPTIONS),
    [conversations],
  );

  const activeOption = FILTER_OPTIONS.find((o) => o.value === (value || 'all'));
  const TriggerIcon = activeOption?.icon || Users;

  return (
    <div className="space-y-1.5">
      <Select
        value={value || 'all'}
        onValueChange={(v) => onChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 rounded-full focus:ring-1 focus:ring-primary/30">
          <div className="flex items-center gap-1.5">
            <TriggerIcon className={cn('w-3.5 h-3.5', activeOption?.iconColor || 'text-muted-foreground')} />
            <SelectValue placeholder="Todos os tipos" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const st = stats[opt.value];
            return (
              <div key={opt.value}>
                <SelectItem value={opt.value}>
                  <span className={cn('flex items-center gap-2', opt.indent && 'pl-2')}>
                    <Icon className={cn('w-3.5 h-3.5', opt.iconColor)} />
                    <span className="flex-1">{opt.label}</span>
                    {/* counter badge */}
                    {st.count > 0 && (
                      <span className="ml-auto flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                          {st.count}
                        </span>
                        {/* unread dot */}
                        {st.unread > 0 && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </SelectItem>
                {SEPARATOR_AFTER.has(opt.value) && <SelectSeparator />}
              </div>
            );
          })}
        </SelectContent>
      </Select>

      {/* Active filter chip */}
      <AnimatePresence>
        {value && value !== 'all' && activeOption && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1">
              <Badge
                variant="secondary"
                className="text-[10px] gap-1 pr-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => onChange(null)}
              >
                <activeOption.icon className={cn('w-3 h-3', activeOption.iconColor)} />
                {activeOption.label}
                <X className="w-3 h-3 ml-0.5 text-muted-foreground hover:text-destructive" />
              </Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- helper for filtering ----------

export function filterByContactType(
  conversations: ConversationWithMessages[],
  contactType: string | null,
): ConversationWithMessages[] {
  if (!contactType || contactType === 'all') return conversations;
  const option = FILTER_OPTIONS.find((o) => o.value === contactType);
  if (!option) return conversations;
  return conversations.filter(option.match);
}
