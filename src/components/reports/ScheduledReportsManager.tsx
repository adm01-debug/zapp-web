import { useState, useEffect, useCallback } from 'react';
import { ScheduledReportConfigs } from './ScheduledReportConfigs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit2,
  Trash2,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  BarChart3,
  Users,
  MessageSquare,
  Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  recipients: string[];
  format: string;
  is_active: boolean;
  next_send_at: string | null;
  last_sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const REPORT_TYPES = [
  { value: 'dashboard_summary', label: 'Resumo do Dashboard', icon: BarChart3, description: 'Métricas gerais de atendimento' },
  { value: 'agent_performance', label: 'Performance de Agentes', icon: Users, description: 'Relatório individual por agente' },
  { value: 'conversation_analytics', label: 'Análise de Conversas', icon: MessageSquare, description: 'Volume e métricas de conversas' },
  { value: 'sla_compliance', label: 'Cumprimento de SLA', icon: Target, description: 'Taxa de cumprimento e violações' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Diário', description: 'Todos os dias às 8h' },
  { value: 'weekly', label: 'Semanal', description: 'Toda segunda-feira às 8h' },
  { value: 'monthly', label: 'Mensal', description: 'Primeiro dia do mês às 8h' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
];

const EMPTY_REPORT: Partial<ScheduledReport> = {
  name: '',
  report_type: 'dashboard_summary',
  frequency: 'weekly',
  recipients: [],
  format: 'pdf',
  is_active: true,
};

export function ScheduledReportsManager() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<ScheduledReport>>(EMPTY_REPORT);
  const [recipientInput, setRecipientInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data || []) as unknown as ScheduledReport[]);
    } catch (err) {
      log.error('Error fetching scheduled reports:', err);
      toast.error('Erro ao carregar relatórios agendados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (!email || !email.includes('@')) {
      toast.error('Digite um email válido');
      return;
    }
    if (editingReport.recipients?.includes(email)) {
      toast.error('Email já adicionado');
      return;
    }
    setEditingReport(prev => ({
      ...prev,
      recipients: [...(prev.recipients || []), email],
    }));
    setRecipientInput('');
  };

  const removeRecipient = (email: string) => {
    setEditingReport(prev => ({
      ...prev,
      recipients: (prev.recipients || []).filter(r => r !== email),
    }));
  };

  const calculateNextSendAt = (frequency: string): string => {
    const now = new Date();
    const next = new Date(now);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(8, 0, 0, 0);
        break;
      case 'weekly':
        next.setDate(next.getDate() + ((1 + 7 - next.getDay()) % 7 || 7));
        next.setHours(8, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(8, 0, 0, 0);
        break;
    }
    
    return next.toISOString();
  };

  const handleSave = async () => {
    if (!editingReport.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!editingReport.recipients?.length) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }

    setIsSaving(true);
    try {
      const reportData = {
        name: editingReport.name.trim(),
        report_type: editingReport.report_type || 'dashboard_summary',
        frequency: editingReport.frequency || 'weekly',
        recipients: editingReport.recipients,
        format: editingReport.format || 'pdf',
        is_active: editingReport.is_active ?? true,
        next_send_at: calculateNextSendAt(editingReport.frequency || 'weekly'),
        created_by: user?.id || null,
      };

      if (editingReport.id) {
        const { error } = await supabase
          .from('scheduled_reports')
          .update(reportData)
          .eq('id', editingReport.id);
        if (error) throw error;
        toast.success('Relatório atualizado!');
      } else {
        const { error } = await supabase
          .from('scheduled_reports')
          .insert(reportData);
        if (error) throw error;
        toast.success('Relatório agendado!');
      }

      setIsDialogOpen(false);
      setEditingReport(EMPTY_REPORT);
      setRecipientInput('');
      fetchReports();
    } catch (err) {
      log.error('Error saving scheduled report:', err);
      toast.error('Erro ao salvar relatório');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Relatório removido!');
      fetchReports();
    } catch (err) {
      log.error('Error deleting report:', err);
      toast.error('Erro ao remover relatório');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      fetchReports();
    } catch (err) {
      log.error('Error toggling report:', err);
    }
  };

  const handleSendNow = async (report: ScheduledReport) => {
    try {
      toast.info('Enviando relatório...');
      const { error } = await supabase.functions.invoke('send-scheduled-report', {
        body: { reportId: report.id },
      });
      if (error) throw error;
      toast.success('Relatório enviado!');
      fetchReports();
    } catch (err) {
      log.error('Error sending report:', err);
      toast.error('Erro ao enviar relatório');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Relatórios Agendados</h2>
          <p className="text-sm text-muted-foreground">
            Configure envio automático de relatórios por email
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingReport(EMPTY_REPORT);
            setRecipientInput('');
            setIsDialogOpen(true);
          }}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Novo Relatório
        </Button>
      </div>

      {/* Reports List */}
      <div className="grid gap-4">
        {loading ? (
          <Card className="border-secondary/20">
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando relatórios...
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="border-secondary/20">
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum relatório agendado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEditingReport(EMPTY_REPORT);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agendar primeiro relatório
              </Button>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {reports.map(report => {
              const typeInfo = REPORT_TYPES.find(t => t.value === report.report_type);
              const freqInfo = FREQUENCIES.find(f => f.value === report.frequency);
              const Icon = typeInfo?.icon || BarChart3;

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={cn(
                    'border-secondary/20 transition-all',
                    !report.is_active && 'opacity-60'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'p-3 rounded-xl shrink-0',
                          report.is_active ? 'bg-primary/15' : 'bg-muted'
                        )}>
                          <Icon className={cn(
                            'w-5 h-5',
                            report.is_active ? 'text-primary' : 'text-muted-foreground'
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{report.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {report.format.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {typeInfo?.label} • {freqInfo?.label}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {report.recipients.join(', ')}
                            </span>
                          </div>
                          {report.next_send_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Próximo: {new Date(report.next_send_at).toLocaleDateString('pt-BR', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={report.is_active}
                            onCheckedChange={(checked) => toggleActive(report.id, checked)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSendNow(report)}>
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditingReport(report);
                            setRecipientInput('');
                            setIsDialogOpen(true);
                          }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(report.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReport.id ? 'Editar Relatório' : 'Novo Relatório Agendado'}</DialogTitle>
            <DialogDescription>
              Configure o envio automático de relatórios por email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Relatório</Label>
              <Input
                value={editingReport.name || ''}
                onChange={(e) => setEditingReport(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Relatório Semanal de Performance"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select
                value={editingReport.report_type || 'dashboard_summary'}
                onValueChange={(value) => setEditingReport(prev => ({ ...prev, report_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={editingReport.frequency || 'weekly'}
                  onValueChange={(value) => setEditingReport(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
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
                <Label>Formato</Label>
                <Select
                  value={editingReport.format || 'pdf'}
                  onValueChange={(value) => setEditingReport(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="email@exemplo.com"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                />
                <Button variant="outline" onClick={addRecipient}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {(editingReport.recipients?.length || 0) > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {editingReport.recipients?.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button onClick={() => removeRecipient(email)} className="hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
              {editingReport.id ? 'Atualizar' : 'Agendar'} Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduledReportConfigs />
    </div>
  );
}
