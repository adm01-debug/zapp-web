import React, { useEffect, useState } from 'react';
import {
  BarChart3, Users, CheckCircle2, XCircle, Clock, Loader2, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TalkXRecipientsList } from './TalkXRecipientsList';
import type { TalkXCampaign } from '@/hooks/useTalkX';

interface Props {
  campaignId: string;
}

export function TalkXLiveMonitor({ campaignId }: Props) {
  const [campaign, setCampaign] = useState<TalkXCampaign | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['talkx-campaign-live', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talkx_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      return data as TalkXCampaign;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (data) setCampaign(data);
  }, [data]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`talkx-monitor-${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'talkx_campaigns', filter: `id=eq.${campaignId}` },
        (payload) => {
          setCampaign(payload.new as TalkXCampaign);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progress =
    campaign.total_recipients > 0
      ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
      : 0;

  const remaining = campaign.total_recipients - campaign.sent_count - campaign.failed_count;

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">{campaign.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{campaign.message_template}</p>
            </div>
            <Badge
              variant={campaign.status === 'sending' ? 'default' : 'secondary'}
              className="gap-1"
            >
              {campaign.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
              {campaign.status}
            </Badge>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground text-right">{progress}% concluído</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: campaign.total_recipients, icon: Users, color: 'text-primary' },
          { label: 'Enviadas', value: campaign.sent_count, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Falhas', value: campaign.failed_count, icon: XCircle, color: 'text-destructive' },
          { label: 'Restantes', value: remaining, icon: Clock, color: 'text-amber-500' },
          { label: 'Taxa Sucesso', value: campaign.sent_count > 0 ? `${Math.round((campaign.sent_count / (campaign.sent_count + campaign.failed_count)) * 100)}%` : '—', icon: BarChart3, color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-2 p-3">
              <Icon className={`w-4 h-4 ${color} shrink-0`} />
              <div>
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recipients List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Destinatários
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-auto">
          <TalkXRecipientsList campaignId={campaignId} />
        </CardContent>
      </Card>
    </div>
  );
}
