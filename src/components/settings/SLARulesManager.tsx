import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSLARules, SLARuleForm, SLARule, SLARuleScope } from '@/hooks/useSLARules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  User, Building2, Briefcase, Tag, LayoutGrid, UserCog,
  Plus, Trash2, Edit2, Clock, Target, AlertTriangle, Search
} from 'lucide-react';

const SCOPE_TABS: { value: SLARuleScope; label: string; icon: React.ElementType }[] = [
  { value: 'contact', label: 'Por Cliente', icon: User },
  { value: 'company', label: 'Por Empresa', icon: Building2 },
  { value: 'job_title', label: 'Por Cargo', icon: Briefcase },
  { value: 'contact_type', label: 'Por Tipo', icon: Tag },
  { value: 'queue', label: 'Por Fila', icon: LayoutGrid },
  { value: 'agent', label: 'Por Agente', icon: UserCog },
];

const formatMinutes = (m: number) => {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
};

function ScopeRulesList({ scope }: { scope: SLARuleScope }) {
  const { rules, isLoading, deleteRule, toggleRule } = useSLARules(scope);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<SLARule | null>(null);

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { setEditingRule(null); setShowDialog(true); }} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Nenhuma regra de SLA neste escopo</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {rules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                scope={scope}
                onEdit={() => { setEditingRule(rule); setShowDialog(true); }}
                onDelete={() => deleteRule(rule.id)}
                onToggle={(active) => toggleRule({ id: rule.id, is_active: active })}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <RuleFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        scope={scope}
        editingRule={editingRule}
      />
    </div>
  );
}

function RuleRow({ rule, scope, onEdit, onDelete, onToggle }: {
  rule: SLARule;
  scope: SLARuleScope;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const scopeLabel = scope === 'contact' ? rule.contact_id?.slice(0, 8) + '...'
    : scope === 'company' ? rule.company
    : scope === 'job_title' ? rule.job_title
    : scope === 'contact_type' ? rule.contact_type
    : scope === 'queue' ? rule.queue_id?.slice(0, 8) + '...'
    : rule.agent_id?.slice(0, 8) + '...';

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Switch checked={rule.is_active} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{rule.name}</span>
          <Badge variant="outline" className="text-[10px]">P{rule.priority}</Badge>
          {scopeLabel && (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[150px]">{scopeLabel}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> 1ª Resp: {formatMinutes(rule.first_response_minutes)}
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" /> Resolução: {formatMinutes(rule.resolution_minutes)}
          </span>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function RuleFormDialog({ open, onOpenChange, scope, editingRule }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scope: SLARuleScope;
  editingRule: SLARule | null;
}) {
  const { createRule, updateRule, isCreating, isUpdating } = useSLARules(scope);
  const [form, setForm] = useState<SLARuleForm>({
    name: '',
    first_response_minutes: 5,
    resolution_minutes: 60,
    priority: 10,
  });
  const [scopeValue, setScopeValue] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // Reset form when opening
  useState(() => {
    if (open && editingRule) {
      setForm({
        name: editingRule.name,
        first_response_minutes: editingRule.first_response_minutes,
        resolution_minutes: editingRule.resolution_minutes,
        priority: editingRule.priority,
      });
      setScopeValue(
        editingRule.contact_id || editingRule.company || editingRule.job_title ||
        editingRule.contact_type || editingRule.queue_id || editingRule.agent_id || ''
      );
    } else if (open) {
      setForm({ name: '', first_response_minutes: 5, resolution_minutes: 60, priority: 10 });
      setScopeValue('');
    }
  });

  // Fetch scope options
  const { data: companies = [] } = useQuery({
    queryKey: ['sla-scope-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('company').not('company', 'is', null);
      return [...new Set((data || []).map(d => d.company).filter(Boolean))] as string[];
    },
    enabled: open && scope === 'company',
  });

  const { data: jobTitles = [] } = useQuery({
    queryKey: ['sla-scope-jobtitles'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('job_title').not('job_title', 'is', null);
      return [...new Set((data || []).map(d => d.job_title).filter(Boolean))] as string[];
    },
    enabled: open && scope === 'job_title',
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['sla-scope-queues'],
    queryFn: async () => {
      const { data } = await supabase.from('queues').select('id, name');
      return data || [];
    },
    enabled: open && scope === 'queue',
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['sla-scope-agents'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name').eq('is_active', true);
      return data || [];
    },
    enabled: open && scope === 'agent',
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['sla-scope-contacts', contactSearch],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, name, phone')
        .or(`name.ilike.%${contactSearch}%,phone.ilike.%${contactSearch}%`)
        .limit(20);
      return data || [];
    },
    enabled: open && scope === 'contact' && contactSearch.length >= 2,
  });

  const handleSave = () => {
    const payload: SLARuleForm = { ...form };
    if (scope === 'contact') payload.contact_id = scopeValue || null;
    else if (scope === 'company') payload.company = scopeValue || null;
    else if (scope === 'job_title') payload.job_title = scopeValue || null;
    else if (scope === 'contact_type') payload.contact_type = scopeValue || null;
    else if (scope === 'queue') payload.queue_id = scopeValue || null;
    else if (scope === 'agent') payload.agent_id = scopeValue || null;

    if (!form.name || !scopeValue) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingRule) {
      updateRule({ ...payload, id: editingRule.id });
    } else {
      createRule(payload);
    }
    onOpenChange(false);
  };

  const contactTypes = ['cliente', 'lead', 'fornecedor', 'parceiro', 'vip'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Editar Regra de SLA' : 'Nova Regra de SLA'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome da Regra</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: SLA VIP - Empresa X" className="mt-1" />
          </div>

          {/* Scope selector */}
          <div>
            <Label className="text-xs">
              {scope === 'contact' ? 'Cliente' : scope === 'company' ? 'Empresa' :
               scope === 'job_title' ? 'Cargo' : scope === 'contact_type' ? 'Tipo de Contato' :
               scope === 'queue' ? 'Fila' : 'Agente'}
            </Label>
            {scope === 'contact' ? (
              <div className="space-y-2 mt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {contacts.length > 0 && (
                  <div className="border rounded-lg max-h-32 overflow-auto">
                    {contacts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setScopeValue(c.id); setContactSearch(c.name); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 ${scopeValue === c.id ? 'bg-primary/10' : ''}`}
                      >
                        {c.name} - {c.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : scope === 'contact_type' ? (
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contactTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : scope === 'company' ? (
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : scope === 'job_title' ? (
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {jobTitles.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : scope === 'queue' ? (
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {queues.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">1ª Resposta (min)</Label>
              <Input type="number" min={1} value={form.first_response_minutes}
                onChange={e => setForm(f => ({ ...f, first_response_minutes: parseInt(e.target.value) || 1 }))}
                className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Resolução (min)</Label>
              <Input type="number" min={1} value={form.resolution_minutes}
                onChange={e => setForm(f => ({ ...f, resolution_minutes: parseInt(e.target.value) || 1 }))}
                className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Prioridade (maior = mais prioritário)</Label>
            <Input type="number" min={0} max={100} value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
              className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isCreating || isUpdating}>
            {editingRule ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SLARulesManager() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Regras Granulares de SLA
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure prazos específicos por cliente, empresa, cargo, tipo, fila ou agente. Regras mais específicas sobrescrevem as genéricas.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {SCOPE_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs">
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SCOPE_TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <ScopeRulesList scope={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
