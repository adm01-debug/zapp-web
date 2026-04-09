import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Play, Pause, X, Trash2, Eye, Users, Clock,
  CheckCircle2, XCircle, Loader2, MessageSquare,
  Send, BarChart3, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTalkX, TalkXCampaign } from '@/hooks/useTalkX';
import { supabase } from '@/integrations/supabase/client';
import { TalkXCampaignEditor } from './TalkXCampaignEditor';
import { TalkXLiveMonitor } from './TalkXLiveMonitor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', variant: 'secondary', icon: MessageSquare },
  sending: { label: 'Enviando', variant: 'default', icon: Loader2 },
  paused: { label: 'Pausada', variant: 'outline', icon: Pause },
  completed: { label: 'Concluída', variant: 'default', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: XCircle },
};

export default function TalkXView() {
  const {
    campaigns, isLoading, selectedCampaignId, setSelectedCampaignId,
    deleteCampaign, startCampaign, pauseCampaign, cancelCampaign, refetchCampaigns,
  } = useTalkX();

  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TalkXCampaign | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Realtime subscription for campaign updates → auto refetch
  useEffect(() => {
    const channel = supabase
      .channel('talkx-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'talkx_campaigns' }, () => {
        refetchCampaigns();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchCampaigns]);

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    setShowEditor(false);
    setTimeout(() => setShowEditor(true), 0);
  };

  const handleEditCampaign = (campaign: TalkXCampaign) => {
    setEditingCampaign(campaign);
    setShowEditor(true);
  };

  const handleDuplicateCampaign = async (campaign: TalkXCampaign) => {
    try {
      await createCampaign.mutateAsync({
        name: `${campaign.name} (cópia)`,
        message_template: campaign.message_template,
        typing_delay_min: campaign.typing_delay_min,
        typing_delay_max: campaign.typing_delay_max,
        send_interval_min: campaign.send_interval_min,
        send_interval_max: campaign.send_interval_max,
        whatsapp_connection_id: campaign.whatsapp_connection_id,
      });
      toast.success('Campanha duplicada!');
    } catch {
      toast.error('Erro ao duplicar campanha');
    }
  };

  const handleViewCampaign = (campaign: TalkXCampaign) => {
    setSelectedCampaignId(campaign.id);
    setActiveTab('monitor');
  };

  const getProgress = (c: TalkXCampaign) => {
    if (c.total_recipients === 0) return 0;
    return Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100);
  };

  if (showEditor) {
    return (
      <TalkXCampaignEditor
        campaign={editingCampaign}
        onClose={() => { setShowEditor(false); refetchCampaigns(); }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">Talk X</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Marketing humanizado com simulação de digitação</p>
          </div>
        </div>
        <Button onClick={handleNewCampaign} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: campaigns.length, icon: BarChart3, cls: 'text-primary' },
          { label: 'Ativas', value: campaigns.filter(c => c.status === 'sending').length, icon: Play, cls: 'text-primary' },
          { label: 'Concluídas', value: campaigns.filter(c => c.status === 'completed').length, icon: CheckCircle2, cls: 'text-accent-foreground' },
          { label: 'Enviadas', value: campaigns.reduce((a, c) => a + c.sent_count, 0), icon: Send, cls: 'text-primary' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3 md:p-4">
              <Icon className={`w-5 h-5 ${cls} shrink-0`} />
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="campaigns" className="gap-2 flex-1 sm:flex-none">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2 flex-1 sm:flex-none" disabled={!selectedCampaignId}>
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Monitor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 gap-4 px-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-foreground">Crie sua primeira campanha Talk X</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md">
                    Envie mensagens personalizadas para vários contatos simulando digitação humana.
                    Use variáveis como {'{{nome}}'}, {'{{apelido}}'} e {'{{empresa}}'}.
                  </p>
                </div>
                <Button onClick={handleNewCampaign} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" />
                  Criar Campanha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {campaigns.map((campaign) => {
                  const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                  const StatusIcon = cfg.icon;
                  const progress = getProgress(campaign);

                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      layout
                    >
                      <Card className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 md:p-5">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                                <Badge variant={cfg.variant} className="gap-1 shrink-0">
                                  <StatusIcon className={`w-3 h-3 ${campaign.status === 'sending' ? 'animate-spin' : ''}`} />
                                  {cfg.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                                {campaign.message_template}
                              </p>
                              <div className="flex items-center gap-3 md:gap-4 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {campaign.total_recipients}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                  {campaign.sent_count} enviadas
                                </span>
                                {campaign.failed_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                                    {campaign.failed_count}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {campaign.typing_delay_min / 1000}–{campaign.typing_delay_max / 1000}s
                                </span>
                                {campaign.created_at && (
                                  <span className="text-muted-foreground/60">
                                    {format(new Date(campaign.created_at), "dd MMM yyyy", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                              {campaign.status === 'sending' && (
                                <div className="mt-3">
                                  <Progress value={progress} className="h-2" />
                                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{progress}%</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0 flex-wrap">
                              {campaign.status === 'draft' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleEditCampaign(campaign)}>
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => startCampaign(campaign.id)}
                                    disabled={campaign.total_recipients === 0}
                                    className="gap-1"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    Iniciar
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => deleteCampaign.mutate(campaign.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {campaign.status === 'sending' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => pauseCampaign(campaign.id)} className="gap-1">
                                    <Pause className="w-3.5 h-3.5" />
                                    Pausar
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => cancelCampaign(campaign.id)} className="gap-1">
                                    <X className="w-3.5 h-3.5" />
                                    Cancelar
                                  </Button>
                                </>
                              )}
                              {campaign.status === 'paused' && (
                                <Button size="sm" onClick={() => startCampaign(campaign.id)} className="gap-1">
                                  <Play className="w-3.5 h-3.5" />
                                  Retomar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewCampaign(campaign)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="monitor" className="flex-1 overflow-auto mt-4">
          {selectedCampaignId ? (
            <TalkXLiveMonitor campaignId={selectedCampaignId} />
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Selecione uma campanha para monitorar
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
