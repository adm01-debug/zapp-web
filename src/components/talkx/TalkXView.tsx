import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Play, Pause, X, Trash2, Eye, Users, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, MessageSquare,
  Send, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTalkX, TalkXCampaign } from '@/hooks/useTalkX';
import { supabase } from '@/integrations/supabase/client';
import { TalkXCampaignEditor } from './TalkXCampaignEditor';
import { TalkXRecipientsList } from './TalkXRecipientsList';
import { TalkXLiveMonitor } from './TalkXLiveMonitor';

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
    deleteCampaign, startCampaign, pauseCampaign, cancelCampaign,
  } = useTalkX();

  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TalkXCampaign | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Realtime subscription for campaign updates
  useEffect(() => {
    const channel = supabase
      .channel('talkx-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'talkx_campaigns' }, () => {
        // Will be handled by React Query refetch
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    setShowEditor(true);
  };

  const handleEditCampaign = (campaign: TalkXCampaign) => {
    setEditingCampaign(campaign);
    setShowEditor(true);
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
        onClose={() => setShowEditor(false)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Talk X</h1>
            <p className="text-sm text-muted-foreground">Marketing humanizado com simulação de digitação</p>
          </div>
        </div>
        <Button onClick={handleNewCampaign} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: campaigns.length, icon: BarChart3, color: 'text-primary' },
          { label: 'Ativas', value: campaigns.filter(c => c.status === 'sending').length, icon: Play, color: 'text-green-500' },
          { label: 'Concluídas', value: campaigns.filter(c => c.status === 'completed').length, icon: CheckCircle2, color: 'text-blue-500' },
          { label: 'Mensagens Enviadas', value: campaigns.reduce((a, c) => a + c.sent_count, 0), icon: Send, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2" disabled={!selectedCampaignId}>
            <Eye className="w-4 h-4" />
            Monitor ao Vivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="flex-1 overflow-auto mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
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
            <div className="grid gap-4">
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
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                                <Badge variant={cfg.variant} className="gap-1 shrink-0">
                                  <StatusIcon className={`w-3 h-3 ${campaign.status === 'sending' ? 'animate-spin' : ''}`} />
                                  {cfg.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                                {campaign.message_template}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {campaign.total_recipients} contatos
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  {campaign.sent_count} enviadas
                                </span>
                                {campaign.failed_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                                    {campaign.failed_count} falhas
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {campaign.typing_delay_min / 1000}–{campaign.typing_delay_max / 1000}s digitação
                                </span>
                              </div>
                              {campaign.status === 'sending' && (
                                <Progress value={progress} className="mt-3 h-2" />
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
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
                                className="gap-1"
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
