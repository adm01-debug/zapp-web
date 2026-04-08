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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { Settings2, Plus, Trash2, Clock, Target, AlertTriangle, Edit2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatSLAMinutes } from './sla/sla-utils';

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
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['sla-configurations'] });
      const previous = queryClient.getQueryData<SLAConfig[]>(['sla-configurations']);
      queryClient.setQueryData<SLAConfig[]>(['sla-configurations'], old =>
        (old || []).map(c => c.id === id ? { ...c, is_active } : c)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['sla-configurations'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sla-configurations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sla_configurations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['sla-configurations'] });
      const previous = queryClient.getQueryData<SLAConfig[]>(['sla-configurations']);
      queryClient.setQueryData<SLAConfig[]>(['sla-configurations'], old =>
        (old || []).filter(c => c.id !== id)
      );
      return { previous };
    },
    onError: (err: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['sla-configurations'], context.previous);
      toast.error(err.message);
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-card/50 border-border/50 rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Configurações Globais de SLA
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Defina metas padrão de tempo de resposta e resolução por nível de prioridade.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Novo SLA
              </Button>
            </motion.div>
          </CardHeader>
          <CardContent className="p-0">
            {configs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4"
              >
                <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhuma configuração de SLA</p>
                <p className="text-xs mt-1 opacity-70">Defina metas de tempo de resposta e resolução</p>
              </motion.div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 px-4 pb-4">
                  {configs.map((cfg, index) => {
                    const pCfg = PRIORITY_CONFIG[cfg.priority] || PRIORITY_CONFIG.medium;
                    return (
                      <motion.div
                        key={cfg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all duration-200"
                      >
                        <Switch
                          checked={cfg.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: cfg.id, is_active: checked })}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">{cfg.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${pCfg.color}`}>
                              {pCfg.label}
                            </Badge>
                            {cfg.is_default && (
                              <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> 1ª Resp: <span className="font-medium text-foreground/80">{formatSLAMinutes(cfg.first_response_minutes)}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" /> Resolução: <span className="font-medium text-foreground/80">{formatSLAMinutes(cfg.resolution_minutes)}</span>
                            </span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-primary/10" onClick={() => openEdit(cfg)}>
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
                              <AlertDialogTitle>Excluir configuração de SLA</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>"{cfg.name}"</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(cfg.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar SLA' : 'Nova Configuração de SLA'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os prazos e nível de prioridade desta configuração.'
                : 'Defina metas de tempo de resposta e resolução para um nível de prioridade.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: SLA Crítico" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Prioridade</Label>
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
                <Label className="text-xs font-medium">1ª Resposta (min)</Label>
                <Input type="number" min={1} value={form.first_response_minutes}
                  onChange={e => setForm(f => ({ ...f, first_response_minutes: parseInt(e.target.value) || 1 }))}
                  className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Resolução (min)</Label>
                <Input type="number" min={1} value={form.resolution_minutes}
                  onChange={e => setForm(f => ({ ...f, resolution_minutes: parseInt(e.target.value) || 1 }))}
                  className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              <Label className="text-xs">SLA padrão (fallback global)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
