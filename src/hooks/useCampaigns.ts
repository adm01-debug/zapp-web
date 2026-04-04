import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  message_content: string;
  message_type: string;
  media_url: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'paused';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  whatsapp_connection_id: string | null;
  created_by: string | null;
  target_type: 'all' | 'tag' | 'queue' | 'custom';
  target_filter: Record<string, unknown>;
  send_interval_seconds: number;
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Partial<Campaign>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha atualizada!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha excluída!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const addContactsToCampaign = useMutation({
    mutationFn: async ({ campaignId, contactIds }: { campaignId: string; contactIds: string[] }) => {
      const records = contactIds.map(contactId => ({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'pending',
      }));
      const { error } = await (supabase as any)
        .from('campaign_contacts')
        .insert(records);
      if (error) throw error;

      // Update total
      await (supabase as any)
        .from('campaigns')
        .update({ total_contacts: contactIds.length })
        .eq('id', campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Contatos adicionados à campanha!');
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  return {
    campaigns: campaignsQuery.data ?? [],
    isLoading: campaignsQuery.isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    addContactsToCampaign,
    refetch: campaignsQuery.refetch,
  };
}
