import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, DollarSign, Calendar, User, GripVertical, MoreHorizontal,
  TrendingUp, Target, ChevronRight, Trash2, Edit, ArrowRight, Trophy, X
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  priority: string;
  expected_close_date: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  created_at: string;
  contact?: { name: string; phone: string } | null;
  assignee?: { name: string } | null;
}

export function SalesPipelineView() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStageId, setFormStageId] = useState('');
  const [formContactId, setFormContactId] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formCloseDate, setFormCloseDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stagesRes, dealsRes, contactsRes, agentsRes] = await Promise.all([
      supabase.from('sales_pipeline_stages').select('*').order('position'),
      supabase.from('sales_deals').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name, phone').limit(200),
      supabase.from('profiles').select('id, name').eq('is_active', true),
    ]);

    if (stagesRes.data) setStages(stagesRes.data);
    if (dealsRes.data) {
      setDeals(dealsRes.data.map((d: any) => ({
        ...d,
        tags: d.tags || [],
        contact: d.contacts,
        assignee: d.profiles,
      })));
    }
    if (contactsRes.data) setContacts(contactsRes.data);
    if (agentsRes.data) setAgents(agentsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_deals' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const openNewDeal = (stageId?: string) => {
    setEditingDeal(null);
    setFormTitle('');
    setFormValue('');
    setFormStageId(stageId || stages[0]?.id || '');
    setFormContactId('');
    setFormAssignedTo('');
    setFormPriority('medium');
    setFormCloseDate('');
    setFormNotes('');
    setShowDealDialog(true);
  };

  const openEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setFormTitle(deal.title);
    setFormValue(String(deal.value || ''));
    setFormStageId(deal.stage_id || '');
    setFormContactId(deal.contact_id || '');
    setFormAssignedTo(deal.assigned_to || '');
    setFormPriority(deal.priority);
    setFormCloseDate(deal.expected_close_date || '');
    setFormNotes(deal.notes || '');
    setShowDealDialog(true);
  };

  const saveDeal = async () => {
    if (!formTitle.trim()) return;
    const payload = {
      title: formTitle,
      value: parseFloat(formValue) || 0,
      stage_id: formStageId || null,
      contact_id: formContactId || null,
      assigned_to: formAssignedTo || null,
      priority: formPriority,
      expected_close_date: formCloseDate || null,
      notes: formNotes || null,
    };

    if (editingDeal) {
      const { error } = await supabase.from('sales_deals').update(payload).eq('id', editingDeal.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Deal atualizado!' });
    } else {
      const { error } = await supabase.from('sales_deals').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Deal criado!' });
    }
    setShowDealDialog(false);
    fetchData();
  };

  const moveDeal = async (dealId: string, newStageId: string) => {
    await supabase.from('sales_deals').update({ stage_id: newStageId }).eq('id', dealId);
    // Log activity
    await supabase.from('deal_activities').insert({
      deal_id: dealId,
      activity_type: 'stage_change',
      description: `Movido para ${stages.find(s => s.id === newStageId)?.name}`,
    });
    fetchData();
  };

  const deleteDeal = async (id: string) => {
    await supabase.from('sales_deals').delete().eq('id', id);
    toast({ title: 'Deal removido' });
    fetchData();
  };

  const markAsWon = async (deal: Deal) => {
    await supabase.from('sales_deals').update({ status: 'won', won_at: new Date().toISOString() }).eq('id', deal.id);
    toast({ title: '🎉 Deal ganho!', description: `${deal.title} - R$ ${deal.value.toLocaleString('pt-BR')}` });
    fetchData();
  };

  const markAsLost = async (deal: Deal) => {
    await supabase.from('sales_deals').update({ status: 'lost', lost_at: new Date().toISOString() }).eq('id', deal.id);
    toast({ title: 'Deal perdido', description: deal.title });
    fetchData();
  };

  const getStageDeals = (stageId: string) => deals.filter(d => d.stage_id === stageId && d.status === 'open');
  const getStageTotal = (stageId: string) => getStageDeals(stageId).reduce((sum, d) => sum + (d.value || 0), 0);
  const totalPipeline = deals.filter(d => d.status === 'open').reduce((sum, d) => sum + (d.value || 0), 0);
  const wonDeals = deals.filter(d => d.status === 'won');
  const totalWon = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  const priorityColors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const handleDragStart = (dealId: string) => setDraggedDeal(dealId);
  const handleDragEnd = () => { setDraggedDeal(null); setDragOverStage(null); };
  const handleDragOver = (e: React.DragEvent, stageId: string) => { e.preventDefault(); setDragOverStage(stageId); };
  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedDeal) moveDeal(draggedDeal, stageId);
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Carregando pipeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Pipeline de Vendas"
        subtitle="Gerencie suas oportunidades de negócio"
        actions={
          <Button onClick={() => openNewDeal()} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Deal
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pb-4">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="w-3.5 h-3.5" /> Pipeline Total
            </div>
            <p className="text-lg font-bold text-foreground">
              R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Deals Ativos
            </div>
            <p className="text-lg font-bold text-foreground">{deals.filter(d => d.status === 'open').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Trophy className="w-3.5 h-3.5 text-green-400" /> Ganhos
            </div>
            <p className="text-lg font-bold text-green-400">
              R$ {totalWon.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Taxa Conversão
            </div>
            <p className="text-lg font-bold text-foreground">
              {deals.length > 0 ? ((wonDeals.length / deals.length) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-4 h-full min-w-max">
          {stages.map((stage) => {
            const stageDeals = getStageDeals(stage.id);
            const stageTotal = getStageTotal(stage.id);
            const isOver = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex flex-col w-72 min-w-[288px] rounded-xl border transition-all duration-200",
                  isOver
                    ? "border-secondary bg-secondary/5 shadow-lg shadow-secondary/10"
                    : "border-border/30 bg-card/30"
                )}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="font-semibold text-sm text-foreground">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs h-5">{stageDeals.length}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNewDeal(stage.id)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {stageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Deals List */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
                  <AnimatePresence>
                    {stageDeals.map((deal) => (
                      <motion.div
                        key={deal.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        draggable
                        onDragStart={() => handleDragStart(deal.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "p-3 rounded-lg border bg-card/80 cursor-grab active:cursor-grabbing transition-all hover:border-secondary/30 hover:shadow-sm group",
                          draggedDeal === deal.id && "opacity-50 scale-95"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground leading-tight">{deal.title}</h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDeal(deal)}>
                                <Edit className="w-3.5 h-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markAsWon(deal)} className="text-green-400">
                                <Trophy className="w-3.5 h-3.5 mr-2" /> Marcar como ganho
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markAsLost(deal)} className="text-red-400">
                                <X className="w-3.5 h-3.5 mr-2" /> Marcar como perdido
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteDeal(deal.id)} className="text-destructive">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {deal.value > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <DollarSign className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">
                              R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] h-4", priorityColors[deal.priority])}>
                            {deal.priority === 'high' ? 'Alta' : deal.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          {deal.contact && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">{deal.contact.name}</span>
                            </div>
                          )}
                          {deal.expected_close_date && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(deal.expected_close_date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground/50 text-xs">
                      Arraste deals aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editingDeal ? 'Editar Deal' : 'Novo Deal'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Nome do deal" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Etapa</Label>
              <Select value={formStageId} onValueChange={setFormStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contato</Label>
              <Select value={formContactId} onValueChange={setFormContactId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formPriority} onValueChange={setFormPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input type="date" value={formCloseDate} onChange={(e) => setFormCloseDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDealDialog(false)}>Cancelar</Button>
            <Button onClick={saveDeal}>{editingDeal ? 'Salvar' : 'Criar Deal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
