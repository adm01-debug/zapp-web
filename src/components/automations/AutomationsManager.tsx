import { useState, useMemo } from 'react';
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
  Clock,
  MessageSquare,
  Tag,
  Users,
  ArrowRight,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Automation types
interface AutomationTrigger {
  type: 'new_message' | 'keyword' | 'time_inactive' | 'tag_added' | 'business_hours';
  config: Record<string, any>;
}

interface AutomationAction {
  type: 'send_message' | 'assign_agent' | 'add_tag' | 'send_notification' | 'close_conversation';
  config: Record<string, any>;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  created_at: string;
  last_triggered_at: string | null;
  trigger_count: number;
}

// Trigger type definitions
const TRIGGER_TYPES = [
  {
    type: 'new_message',
    label: 'Nova Mensagem',
    icon: MessageSquare,
    description: 'Quando uma nova mensagem é recebida',
  },
  {
    type: 'keyword',
    label: 'Palavra-chave',
    icon: Tag,
    description: 'Quando uma mensagem contém palavras específicas',
  },
  {
    type: 'time_inactive',
    label: 'Tempo Inativo',
    icon: Clock,
    description: 'Quando não há resposta por X minutos',
  },
  {
    type: 'tag_added',
    label: 'Tag Adicionada',
    icon: Tag,
    description: 'Quando uma tag é adicionada ao contato',
  },
  {
    type: 'business_hours',
    label: 'Fora do Horário',
    icon: Clock,
    description: 'Quando mensagem chega fora do expediente',
  },
];

// Action type definitions
const ACTION_TYPES = [
  {
    type: 'send_message',
    label: 'Enviar Mensagem',
    icon: MessageSquare,
    description: 'Envia uma mensagem automática',
  },
  {
    type: 'assign_agent',
    label: 'Atribuir Agente',
    icon: Users,
    description: 'Atribui a conversa a um agente',
  },
  {
    type: 'add_tag',
    label: 'Adicionar Tag',
    icon: Tag,
    description: 'Adiciona uma tag ao contato',
  },
  {
    type: 'send_notification',
    label: 'Enviar Notificação',
    icon: AlertCircle,
    description: 'Envia notificação para a equipe',
  },
  {
    type: 'close_conversation',
    label: 'Fechar Conversa',
    icon: CheckCircle2,
    description: 'Marca a conversa como resolvida',
  },
];

// Mock data for demo
const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: '1',
    name: 'Boas-vindas Automáticas',
    description: 'Envia mensagem de boas-vindas para novos contatos',
    is_active: true,
    trigger: { type: 'new_message', config: { first_contact: true } },
    actions: [
      { type: 'send_message', config: { message: 'Olá! Bem-vindo. Em que posso ajudar?' } },
      { type: 'add_tag', config: { tag: 'novo-contato' } },
    ],
    created_at: new Date().toISOString(),
    last_triggered_at: new Date().toISOString(),
    trigger_count: 150,
  },
  {
    id: '2',
    name: 'Resposta Fora do Horário',
    description: 'Informa o horário de atendimento',
    is_active: true,
    trigger: { type: 'business_hours', config: { outside: true } },
    actions: [
      { type: 'send_message', config: { message: 'Nosso horário é de 9h às 18h. Retornaremos em breve!' } },
    ],
    created_at: new Date().toISOString(),
    last_triggered_at: null,
    trigger_count: 45,
  },
  {
    id: '3',
    name: 'Alerta de Inatividade',
    description: 'Notifica equipe após 30 min sem resposta',
    is_active: false,
    trigger: { type: 'time_inactive', config: { minutes: 30 } },
    actions: [
      { type: 'send_notification', config: { message: 'Conversa aguardando resposta!' } },
    ],
    created_at: new Date().toISOString(),
    last_triggered_at: null,
    trigger_count: 0,
  },
];

// Automation card component
function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  automation: Automation;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const triggerInfo = TRIGGER_TYPES.find(t => t.type === automation.trigger.type);
  const TriggerIcon = triggerInfo?.icon || Zap;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg border transition-all',
        automation.is_active 
          ? 'bg-card border-primary/20' 
          : 'bg-muted/30 border-border opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'p-2 rounded-lg shrink-0',
          automation.is_active ? 'bg-primary/20' : 'bg-muted'
        )}>
          <TriggerIcon className={cn(
            'w-5 h-5',
            automation.is_active ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{automation.name}</h4>
            <Badge 
              variant={automation.is_active ? 'default' : 'secondary'}
              className="text-xs"
            >
              {automation.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {automation.description}
          </p>
          
          {/* Actions flow */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {triggerInfo?.label}
            </Badge>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            {automation.actions.map((action, i) => {
              const actionInfo = ACTION_TYPES.find(a => a.type === action.type);
              return (
                <Badge key={i} variant="secondary" className="text-xs">
                  {actionInfo?.label}
                </Badge>
              );
            })}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {automation.trigger_count}x executado
            </span>
            {automation.last_triggered_at && (
              <span>
                Último: {new Date(automation.last_triggered_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={automation.is_active}
            onCheckedChange={onToggle}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Automation editor dialog
function AutomationEditorDialog({
  open,
  onOpenChange,
  automation,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: Automation | null;
  onSave: (data: Partial<Automation>) => Promise<void>;
}) {
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [triggerType, setTriggerType] = useState<string>(automation?.trigger.type || 'new_message');
  const [actionType, setActionType] = useState<string>(automation?.actions[0]?.type || 'send_message');
  const [messageContent, setMessageContent] = useState(
    automation?.actions[0]?.config?.message || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        name,
        description,
        trigger: { type: triggerType as any, config: {} },
        actions: [{ type: actionType as any, config: { message: messageContent } }],
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
          <DialogDescription>
            Configure gatilhos e ações automáticas
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nome da Automação</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boas-vindas Automáticas"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que essa automação faz"
            />
          </div>
          
          {/* Trigger */}
          <div className="space-y-2">
            <Label>Gatilho (Quando executar?)</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    <div className="flex items-center gap-2">
                      <t.icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Action */}
          <div className="space-y-2">
            <Label>Ação (O que fazer?)</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a.type} value={a.type}>
                    <div className="flex items-center gap-2">
                      <a.icon className="w-4 h-4" />
                      <span>{a.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Message content (if send_message action) */}
          {actionType === 'send_message' && (
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite a mensagem automática..."
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main automations view
export function AutomationsManager() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      if (filter === 'active') return a.is_active;
      if (filter === 'inactive') return !a.is_active;
      return true;
    });
  }, [automations, filter]);
  
  const handleToggle = (id: string) => {
    setAutomations(prev => prev.map(a => 
      a.id === id ? { ...a, is_active: !a.is_active } : a
    ));
    toast.success('Status atualizado!');
  };
  
  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setEditorOpen(true);
  };
  
  const handleCreate = () => {
    setEditingAutomation(null);
    setEditorOpen(true);
  };
  
  const handleDelete = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
    toast.success('Automação removida!');
  };
  
  const handleDuplicate = (automation: Automation) => {
    const newAutomation = {
      ...automation,
      id: Date.now().toString(),
      name: `${automation.name} (cópia)`,
      is_active: false,
      trigger_count: 0,
      last_triggered_at: null,
    };
    setAutomations(prev => [...prev, newAutomation]);
    toast.success('Automação duplicada!');
  };
  
  const handleSave = async (data: Partial<Automation>) => {
    if (editingAutomation) {
      setAutomations(prev => prev.map(a => 
        a.id === editingAutomation.id ? { ...a, ...data } : a
      ));
      toast.success('Automação atualizada!');
    } else {
      const newAutomation: Automation = {
        id: Date.now().toString(),
        name: data.name || 'Nova Automação',
        description: data.description || '',
        is_active: true,
        trigger: data.trigger || { type: 'new_message', config: {} },
        actions: data.actions || [],
        created_at: new Date().toISOString(),
        last_triggered_at: null,
        trigger_count: 0,
      };
      setAutomations(prev => [...prev, newAutomation]);
      toast.success('Automação criada!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Automações
            </CardTitle>
            <CardDescription>
              Configure respostas e ações automáticas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova
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
                  onToggle={() => handleToggle(automation.id)}
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
      
      {/* Editor dialog */}
      <AutomationEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        automation={editingAutomation}
        onSave={handleSave}
      />
    </Card>
  );
}
