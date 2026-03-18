import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, FileSpreadsheet, Mail, Plus, Trash2, Play, Pause, History, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduledExport {
  id: string;
  report_name: string;
  format: string;
  frequency: string;
  email_to: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
];

const REPORT_TYPES = [
  { value: 'conversations', label: 'Conversas' },
  { value: 'contacts', label: 'Contatos' },
  { value: 'agents', label: 'Performance de Agentes' },
  { value: 'queues', label: 'Métricas de Filas' },
  { value: 'csat', label: 'Satisfação (CSAT)' },
  { value: 'sla', label: 'SLA' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF' },
];

export function AutoExportManager() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newExport, setNewExport] = useState({
    report_name: '',
    format: 'csv',
    frequency: 'weekly',
    email_to: '',
  });

  // Use scheduled_reports table
  const { data: exports = [], isLoading } = useQuery({
    queryKey: ['scheduled-exports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ScheduledExport[];
    },
  });

  const createExport = useMutation({
    mutationFn: async (exportConfig: typeof newExport) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          report_name: exportConfig.report_name,
          report_type: exportConfig.report_name,
          format: exportConfig.format,
          frequency: exportConfig.frequency,
          email_to: exportConfig.email_to,
          is_active: true,
          created_by: userData.user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-exports'] });
      setCreateOpen(false);
      setNewExport({ report_name: '', format: 'csv', frequency: 'weekly', email_to: '' });
      toast.success('Exportação automática criada!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const toggleExport = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-exports'] });
      toast.success('Status atualizado!');
    },
  });

  const deleteExport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-exports'] });
      toast.success('Exportação removida!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Exportação Automática
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure relatórios para serem gerados e enviados automaticamente
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nova Exportação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Criar Exportação Automática</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select
                  value={newExport.report_name}
                  onValueChange={(v) => setNewExport(prev => ({ ...prev, report_name: v }))}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={newExport.format}
                  onValueChange={(v) => setNewExport(prev => ({ ...prev, format: v }))}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={newExport.frequency}
                  onValueChange={(v) => setNewExport(prev => ({ ...prev, frequency: v }))}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email de destino</Label>
                <Input
                  type="email"
                  value={newExport.email_to}
                  onChange={(e) => setNewExport(prev => ({ ...prev, email_to: e.target.value }))}
                  placeholder="relatorios@empresa.com"
                  className="bg-muted border-border"
                />
              </div>

              <Button
                className="w-full"
                disabled={!newExport.report_name || !newExport.email_to}
                onClick={() => createExport.mutate(newExport)}
              >
                Criar Exportação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : exports.length === 0 ? (
        <Card className="border-secondary/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma exportação automática configurada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Crie uma para receber relatórios por email automaticamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exports.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {REPORT_TYPES.find(t => t.value === exp.report_name)?.label || exp.report_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {FORMATS.find(f => f.value === exp.format)?.label || exp.format}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-1" />
                            {FREQUENCIES.find(f => f.value === exp.frequency)?.label || exp.frequency}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {exp.email_to}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {exp.last_run_at && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <History className="w-3 h-3" />
                          {format(new Date(exp.last_run_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      )}
                      <Switch
                        checked={exp.is_active}
                        onCheckedChange={(checked) => toggleExport.mutate({ id: exp.id, is_active: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteExport.mutate(exp.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
