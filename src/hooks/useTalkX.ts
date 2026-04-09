import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TalkXCampaign {
  id: string;
  name: string;
  message_template: string;
  variables_config: string[];
  typing_delay_min: number;
  typing_delay_max: number;
  send_interval_min: number;
  send_interval_max: number;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  whatsapp_connection_id: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TalkXRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  personalized_message: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
  contacts?: {
    name: string;
    nickname: string | null;
    phone: string;
    company: string | null;
    avatar_url: string | null;
  };
}

export function useTalkX() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ['talkx-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talkx_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TalkXCampaign[];
    },
  });

  const recipientsQuery = useQuery({
    queryKey: ['talkx-recipients', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return [];
      const { data, error } = await supabase
        .from('talkx_recipients')
        .select('*, contacts:contact_id(name, nickname, phone, company, avatar_url)')
        .eq('campaign_id', selectedCampaignId)
        .order('created_at');
      if (error) throw error;
      return data as TalkXRecipient[];
    },
    enabled: !!selectedCampaignId,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Partial<TalkXCampaign>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();
      
      const { data, error } = await supabase
        .from('talkx_campaigns')
        .insert({ ...campaign, created_by: profile?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.success('Campanha Talk X criada!');
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TalkXCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('talkx_campaigns')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('talkx_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.success('Campanha excluída');
    },
  });

  const addRecipients = useMutation({
    mutationFn: async ({
      campaignId,
      contactIds,
    }: {
      campaignId: string;
      contactIds: string[];
    }) => {
      const rows = contactIds.map((contact_id) => ({
        campaign_id: campaignId,
        contact_id,
      }));
      const { error } = await supabase.from('talkx_recipients').insert(rows as any);
      if (error) throw error;

      await supabase
        .from('talkx_campaigns')
        .update({ total_recipients: contactIds.length } as any)
        .eq('id', campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talkx-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.success('Contatos adicionados!');
    },
  });

  const startCampaign = useCallback(async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('talkx-send', {
        body: { campaignId, action: 'start' },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.success('Campanha Talk X iniciada! 🚀');
      return data;
    } catch (e: any) {
      toast.error(`Erro ao iniciar: ${e.message}`);
    }
  }, [queryClient]);

  const pauseCampaign = useCallback(async (campaignId: string) => {
    try {
      await supabase.functions.invoke('talkx-send', {
        body: { campaignId, action: 'pause' },
      });
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.info('Campanha pausada');
    } catch (e: any) {
      toast.error(`Erro ao pausar: ${e.message}`);
    }
  }, [queryClient]);

  const cancelCampaign = useCallback(async (campaignId: string) => {
    try {
      await supabase.functions.invoke('talkx-send', {
        body: { campaignId, action: 'cancel' },
      });
      queryClient.invalidateQueries({ queryKey: ['talkx-campaigns'] });
      toast.info('Campanha cancelada');
    } catch (e: any) {
      toast.error(`Erro ao cancelar: ${e.message}`);
    }
  }, [queryClient]);

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    recipients: recipientsQuery.data || [],
    recipientsLoading: recipientsQuery.isLoading,
    selectedCampaignId,
    setSelectedCampaignId,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    addRecipients,
    startCampaign,
    pauseCampaign,
    cancelCampaign,
    refetchCampaigns: campaignsQuery.refetch,
  };
}
