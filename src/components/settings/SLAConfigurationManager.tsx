import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings2, Plus, Trash2, Clock, Target, AlertTriangle, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface SLAConfig {
  id: string;
  name: string;
  first_response_minutes: number;
  resolution_minutes: number;
  priority: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  high: { label: 'Alta', color: 'bg-warning/20 text-warning border-warning/30' },
  medium: { label: 'Média', color: 'bg-warning/20 text-warning border-warning/30' },
  low: { label: 'Baixa', color: 'bg-success/20 text-success border-success/30' },
};

const defaultForm = {
  name: '',
  first_response_minutes: 15,
  resolution_minutes: 120,
  priority: 'medium',
  is_default: false,
};

export function SLAConfigurationManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['sla-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configurations')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data || []) as SLAConfig[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from('sla_configurations')
          .update({
            name: values.name,
            first_response_minutes: values.first_response_minutes,
            resolution_minutes: values.resolution_minutes,
            priority: values.priority,
            is_default: values.is_default,
          })
          .eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sla_configurations')
          .insert({
            name: values.name,
            first_response_minutes: values.first_response_minutes,
            resolution_minutes: values.resolution_minutes,
            priority: values.priority,
            is_default: values.is_default,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-configurations'] });
      setShowDialog(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success(editingId ? 'SLA atualizado' : 'SLA criado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sla_configurations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sla-configurations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sla_configurations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-configurations'] });
      toast.success('SLA removido');
    },
  });

  const openEdit = (cfg: SLAConfig) => {
    setEditingId(cfg.id);
    setForm({
      name: cfg.name,
      first_response_minutes: cfg.first_response_minutes,
      resolution_minutes: cfg.resolution_minutes,
      priority: cfg.priority,
      is_default: cfg.is_default,
    });
    setShowDialog(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const formatMinutes = (m: number) => {
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Configurações de SLA
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo SLA
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhuma configuração de SLA</p>
              <p className="text-xs mt-1">Defina metas de tempo de resposta e resolução</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border/50">
                {configs.map((cfg) => {
                  const pCfg = PRIORITY_CONFIG[cfg.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={cfg.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Switch
                        checked={cfg.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: cfg.id, is_active: checked })}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{cfg.name}</span>
                          <Badge variant="outline" className={`text-[10px] ${pCfg.color}`}>
                            {pCfg.label}
                          </Badge>
                          {cfg.is_default && (
                            <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            1ª Resposta: {formatMinutes(cfg.first_response_minutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Resolução: {formatMinutes(cfg.resolution_minutes)}
                          </span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cfg)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(cfg.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar SLA' : 'Nova Configuração de SLA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: SLA Crítico" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              <Label className="text-xs">SLA padrão</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.name || saveMutation.isPending}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
