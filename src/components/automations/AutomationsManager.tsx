import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Clock,
  MessageSquare,
  Tag,
  Users,
  ArrowRight,
  Copy,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface AutomationRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  actions: Record<string, any>[];
  created_by: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

// Trigger type definitions
const TRIGGER_TYPES = [
  { type: 'new_message', label: 'Nova Mensagem', icon: MessageSquare, description: 'Quando uma nova mensagem é recebida' },
  { type: 'keyword', label: 'Palavra-chave', icon: Tag, description: 'Quando uma mensagem contém palavras específicas' },
  { type: 'time_inactive', label: 'Tempo Inativo', icon: Clock, description: 'Quando não há resposta por X minutos' },
  { type: 'tag_added', label: 'Tag Adicionada', icon: Tag, description: 'Quando uma tag é adicionada ao contato' },
  { type: 'business_hours', label: 'Fora do Horário', icon: Clock, description: 'Quando mensagem chega fora do expediente' },
];

// Action type definitions
const ACTION_TYPES = [
  { type: 'send_message', label: 'Enviar Mensagem', icon: MessageSquare, description: 'Envia uma mensagem automática' },
  { type: 'assign_agent', label: 'Atribuir Agente', icon: Users, description: 'Atribui a conversa a um agente' },
  { type: 'add_tag', label: 'Adicionar Tag', icon: Tag, description: 'Adiciona uma tag ao contato' },
  { type: 'send_notification', label: 'Enviar Notificação', icon: AlertCircle, description: 'Envia notificação para a equipe' },
  { type: 'close_conversation', label: 'Fechar Conversa', icon: CheckCircle2, description: 'Marca a conversa como resolvida' },
];

// Hook for automations CRUD
function useAutomations() {
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AutomationRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (automation: Partial<AutomationRow>) => {
      const { data, error } = await supabase
        .from('automations')
        .insert({
          name: automation.name || 'Nova Automação',
          description: automation.description || '',
          trigger_type: automation.trigger_type || 'new_message',
          trigger_config: automation.trigger_config || {},
          actions: automation.actions || [],
          is_active: automation.is_active ?? true,
          created_by: automation.created_by,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação criada!');
    },
    onError: () => toast.error('Erro ao criar automação'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRow> & { id: string }) => {
      const { error } = await supabase
        .from('automations')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar automação'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação removida!');
    },
    onError: () => toast.error('Erro ao remover automação'),
  });

  return { automations, isLoading, createMutation, updateMutation, deleteMutation };
}

// Automation card component
function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  automation: AutomationRow;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const triggerInfo = TRIGGER_TYPES.find(t => t.type === automation.trigger_type);
  const TriggerIcon = triggerInfo?.icon || Zap;
  const actions = Array.isArray(automation.actions) ? automation.actions : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg border transition-all',
        automation.is_active ? 'bg-card border-primary/20' : 'bg-muted/30 border-border opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', automation.is_active ? 'bg-primary/20' : 'bg-muted')}>
          <TriggerIcon className={cn('w-5 h-5', automation.is_active ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{automation.name}</h4>
            <Badge variant={automation.is_active ? 'default' : 'secondary'} className="text-xs">
              {automation.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{automation.description}</p>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{triggerInfo?.label}</Badge>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            {actions.map((action: Record<string, unknown>, i: number) => {
              const actionInfo = ACTION_TYPES.find(a => a.type === action.type);
              return <Badge key={i} variant="secondary" className="text-xs">{actionInfo?.label}</Badge>;
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Play className="w-3 h-3" />{automation.trigger_count}x executado</span>
            {automation.last_triggered_at && (
              <span>Último: {new Date(automation.last_triggered_at).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={automation.is_active} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Edit2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}><Copy className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
    </motion.div>
  );
}

// Editor dialog
function AutomationEditorDialog({
  open,
  onOpenChange,
  automation,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: AutomationRow | null;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [triggerType, setTriggerType] = useState(automation?.trigger_type || 'new_message');
  const actions = Array.isArray(automation?.actions) ? automation.actions : [];
  const [actionType, setActionType] = useState((actions[0] as any)?.type || 'send_message');
  const [messageContent, setMessageContent] = useState((actions[0] as any)?.config?.message || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    setIsSaving(true);
    try {
      await onSave({
        name,
        description,
        trigger_type: triggerType,
        trigger_config: {},
        actions: [{ type: actionType, config: { message: messageContent } }],
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {automation ? 'Editar Automação' : 'Nova Automação'}
          </DialogTitle>
          <DialogDescription>Configure gatilhos e ações automáticas</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Automação</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas Automáticas" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o que essa automação faz" />
          </div>
          <div className="space-y-2">
            <Label>Gatilho (Quando executar?)</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    <div className="flex items-center gap-2"><t.icon className="w-4 h-4" /><span>{t.label}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ação (O que fazer?)</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a.type} value={a.type}>
                    <div className="flex items-center gap-2"><a.icon className="w-4 h-4" /><span>{a.label}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {actionType === 'send_message' && (
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Input value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="Digite a mensagem automática..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export function AutomationsManager() {
  const { user } = useAuth();
  const { automations, isLoading, createMutation, updateMutation, deleteMutation } = useAutomations();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRow | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      if (filter === 'active') return a.is_active;
      if (filter === 'inactive') return !a.is_active;
      return true;
    });
  }, [automations, filter]);

  const handleToggle = (automation: AutomationRow) => {
    updateMutation.mutate({ id: automation.id, is_active: !automation.is_active } as any);
  };

  const handleEdit = (automation: AutomationRow) => {
    setEditingAutomation(automation);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingAutomation(null);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleDuplicate = (automation: AutomationRow) => {
    createMutation.mutate({
      name: `${automation.name} (cópia)`,
      description: automation.description,
      trigger_type: automation.trigger_type,
      trigger_config: automation.trigger_config,
      actions: automation.actions,
      is_active: false,
      created_by: user?.id,
    } as any);
  };

  const handleSave = async (data: any) => {
    if (editingAutomation) {
      updateMutation.mutate({ id: editingAutomation.id, ...data });
    } else {
      createMutation.mutate({ ...data, created_by: user?.id });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Automações
            </CardTitle>
            <CardDescription>Configure respostas e ações automáticas</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />Nova
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            <AnimatePresence>
              {filteredAutomations.map((automation) => (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  onToggle={() => handleToggle(automation)}
                  onEdit={() => handleEdit(automation)}
                  onDelete={() => handleDelete(automation.id)}
                  onDuplicate={() => handleDuplicate(automation)}
                />
              ))}
            </AnimatePresence>
            {filteredAutomations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhuma automação encontrada</p>
                <p className="text-sm">Crie sua primeira automação para otimizar o atendimento</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <AutomationEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        automation={editingAutomation}
        onSave={handleSave}
      />
    </Card>
  );
}
