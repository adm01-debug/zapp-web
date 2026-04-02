import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface TeamConversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
  last_message?: TeamMessage | null;
  unread_count?: number;
}

export interface TeamMember {
  id: string;
  conversation_id: string;
  profile_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  profile?: {
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
}

export interface TeamMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  reply_to?: TeamMessage | null;
}

export function useTeamConversations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team-conversations', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('team_conversation_members')
        .select('conversation_id')
        .eq('profile_id', profile.id);

      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const convIds = memberships.map(m => m.conversation_id);

      const { data: conversations, error } = await supabase
        .from('team_conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch members for each conversation
      const { data: allMembers } = await supabase
        .from('team_conversation_members')
        .select('*, profile:profiles(id, name, email, avatar_url, is_active)')
        .in('conversation_id', convIds);

      // Fetch last message for each conversation
      const enriched: TeamConversation[] = [];
      for (const conv of conversations || []) {
        const members = (allMembers || []).filter(m => m.conversation_id === conv.id) as any[];

        // Get last message
        const { data: lastMsg } = await supabase
          .from('team_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Calculate unread
        const myMembership = members.find(m => m.profile_id === profile.id);
        let unread = 0;
        if (myMembership?.last_read_at) {
          const { count } = await supabase
            .from('team_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', myMembership.last_read_at)
            .neq('sender_id', profile.id);
          unread = count || 0;
        }

        // For direct chats, use the other person's name
        let displayName = conv.name;
        if (conv.type === 'direct' && !conv.name) {
          const other = members.find(m => m.profile_id !== profile.id);
          displayName = other?.profile?.name || 'Chat Direto';
        }

        enriched.push({
          ...conv,
          name: displayName,
          avatar_url: conv.type === 'direct' && !conv.avatar_url
            ? members.find(m => m.profile_id !== profile.id)?.profile?.avatar_url
            : conv.avatar_url,
          members,
          last_message: lastMsg as TeamMessage | null,
          unread_count: unread,
        });
      }

      return enriched;
    },
    enabled: !!profile,
    refetchInterval: 30000,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('team-chat-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_messages',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, queryClient]);

  return query;
}

export function useTeamMessages(conversationId: string | null) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('team_messages')
        .select('*, sender:profiles!team_messages_sender_id_fkey(id, name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      return (data || []) as TeamMessage[];
    },
    enabled: !!conversationId && !!profile,
  });

  // Realtime for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`team-messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['team-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  // Mark as read when viewing
  useEffect(() => {
    if (!conversationId || !profile) return;
    supabase
      .from('team_conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('profile_id', profile.id)
      .then();
  }, [conversationId, profile, query.data?.length]);

  return query;
}

export function useSendTeamMessage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, replyToId }: {
      conversationId: string;
      content: string;
      replyToId?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('team_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    },
  });
}

export function useCreateTeamConversation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, name, memberIds }: {
      type: 'direct' | 'group';
      name?: string;
      memberIds: string[];
    }) => {
      if (!profile) throw new Error('Not authenticated');

      // For direct chats, check if one already exists
      if (type === 'direct' && memberIds.length === 1) {
        const otherId = memberIds[0];
        const { data: existing } = await supabase
          .from('team_conversation_members')
          .select('conversation_id')
          .eq('profile_id', profile.id);

        if (existing?.length) {
          for (const mem of existing) {
            const { data: conv } = await supabase
              .from('team_conversations')
              .select('*')
              .eq('id', mem.conversation_id)
              .eq('type', 'direct')
              .single();

            if (conv) {
              const { data: otherMem } = await supabase
                .from('team_conversation_members')
                .select('id')
                .eq('conversation_id', conv.id)
                .eq('profile_id', otherId)
                .single();

              if (otherMem) return conv;
            }
          }
        }
      }

      // Create conversation
      const { data: conv, error } = await supabase
        .from('team_conversations')
        .insert({
          type,
          name: name || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add members (including self)
      const allMembers = [profile.id, ...memberIds.filter(id => id !== profile.id)];
      const { error: memError } = await supabase
        .from('team_conversation_members')
        .insert(allMembers.map(pid => ({
          conversation_id: conv.id,
          profile_id: pid,
        })));

      if (memError) throw memError;

      return conv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar conversa', variant: 'destructive' });
    },
  });
}
