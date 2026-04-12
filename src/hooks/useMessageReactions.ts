import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string | null;
  contact_id: string | null;
  emoji: string;
  created_at: string;
  user_name?: string;
}

export interface UseMessageReactionsOptions {
  instanceName?: string;
  contactJid?: string;
  externalId?: string;
  senderType?: 'contact' | 'agent';
}

export function useMessageReactions(messageId: string, options?: UseMessageReactionsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { sendReaction } = useEvolutionApi();

  // Get current user's profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile-reactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch reactions for this message
  const { data: reactions = [], isLoading, refetch } = useQuery({
    queryKey: ['message-reactions', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;

      // Get user names for reactions
      const userIds = data?.filter(r => r.user_id).map(r => r.user_id) || [];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const usersMap = new Map(users?.map(u => [u.id, u.name]) || []);

      return (data || []).map(r => ({
        ...r,
        user_name: r.user_id ? usersMap.get(r.user_id) || 'Agente' : 'Cliente',
      })) as MessageReaction[];
    },
    enabled: !!messageId,
  });

  // Add reaction mutation — uses upsert to prevent duplicate key errors
  const addMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!profile?.id) throw new Error('Perfil não encontrado');

      // 1. Save to local DB with upsert (conflict on message_id + user_id + emoji)
      const { data, error } = await supabase
        .from('message_reactions')
        .upsert(
          {
            message_id: messageId,
            user_id: profile.id,
            emoji,
          },
          { onConflict: 'message_id,user_id,emoji' }
        )
        .select()
        .single();

      if (error) throw error;

      // 2. Send reaction via Evolution API to WhatsApp
      if (options?.instanceName && options?.contactJid && options?.externalId) {
        try {
          await sendReaction(
            options.instanceName,
            {
              remoteJid: options.contactJid,
              fromMe: options.senderType === 'agent',
              id: options.externalId,
            },
            emoji
          );
          log.info('Reaction sent via Evolution API', { emoji, messageId });
        } catch (err) {
          log.error('Failed to send reaction via Evolution API', err);
          // Don't throw — local reaction was saved successfully
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reactions', messageId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar reação',
        variant: 'destructive',
      });
    },
  });

  // Remove reaction mutation
  const removeMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!profile?.id) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', profile.id)
        .eq('emoji', emoji);

      if (error) throw error;

      // Send empty reaction to remove on WhatsApp
      if (options?.instanceName && options?.contactJid && options?.externalId) {
        try {
          await sendReaction(
            options.instanceName,
            {
              remoteJid: options.contactJid,
              fromMe: options.senderType === 'agent',
              id: options.externalId,
            },
            '' // empty string removes the reaction
          );
        } catch (err) {
          log.error('Failed to remove reaction via Evolution API', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reactions', messageId] });
    },
  });

  const addReaction = useCallback((emoji: string) => {
    return addMutation.mutateAsync(emoji);
  }, [addMutation]);

  const removeReaction = useCallback((emoji: string) => {
    return removeMutation.mutateAsync(emoji);
  }, [removeMutation]);

  // Check if current user has reacted with emoji
  const hasReacted = useCallback((emoji: string) => {
    return reactions.some(r => r.user_id === profile?.id && r.emoji === emoji);
  }, [reactions, profile?.id]);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = [];
    }
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  return {
    reactions,
    groupedReactions,
    isLoading,
    addReaction,
    removeReaction,
    hasReacted,
    currentProfileId: profile?.id,
    refetch,
  };
}

// Hook for batch loading reactions for multiple messages
export function useMessagesReactions(messageIds: string[]) {
  const [reactionsMap, setReactionsMap] = useState<Record<string, MessageReaction[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (messageIds.length === 0) return;

    const fetchReactions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (error) throw error;

        // Group by message_id
        const grouped = (data || []).reduce((acc, r) => {
          if (!acc[r.message_id]) {
            acc[r.message_id] = [];
          }
          acc[r.message_id].push(r);
          return acc;
        }, {} as Record<string, MessageReaction[]>);

        setReactionsMap(grouped);
      } catch (err) {
        log.error('Error fetching reactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReactions();
  }, [messageIds.join(',')]);

  return { reactionsMap, isLoading };
}
