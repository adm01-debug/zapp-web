import { useState, useEffect, useCallback, useRef } from 'react';
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
  media_url: string | null;
  media_type: string | null;
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
        .select('conversation_id, last_read_at')
        .eq('profile_id', profile.id);

      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const convIds = memberships.map(m => m.conversation_id);
      const lastReadMap = new Map(memberships.map(m => [m.conversation_id, m.last_read_at]));

      // Fetch conversations and members in parallel (avoid N+1)
      const [convResult, membersResult] = await Promise.all([
        supabase
          .from('team_conversations')
          .select('*')
          .in('id', convIds)
          .order('updated_at', { ascending: false }),
        supabase
          .from('team_conversation_members')
          .select('*, profile:profiles(id, name, email, avatar_url, is_active)')
          .in('conversation_id', convIds),
      ]);

      if (convResult.error) throw convResult.error;
      const conversations = convResult.data || [];
      const allMembers = membersResult.data || [];

      // Fetch last message per conversation in a single query using ordering
      // We get a few recent messages per conversation and pick the latest
      const { data: recentMessages } = await supabase
        .from('team_messages')
        .select('id, conversation_id, content, sender_id, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(convIds.length * 2); // Heuristic: at most 2x conversations

      // Build last-message map (first occurrence per conversation_id is the latest)
      const lastMessageMap = new Map<string, { id: string; conversation_id: string; content: string; sender_id: string; created_at: string }>();
      for (const msg of recentMessages || []) {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      }

      // Calculate unread counts in batch
      const unreadPromises = convIds.map(async (cid) => {
        const lastRead = lastReadMap.get(cid);
        let query = supabase
          .from('team_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', cid)
          .neq('sender_id', profile.id);

        // FIX: If last_read_at is null, count ALL messages from others
        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        return { cid, count: count || 0 };
      });

      const unreadResults = await Promise.all(unreadPromises);
      const unreadMap = new Map(unreadResults.map(r => [r.cid, r.count]));

      const enriched: TeamConversation[] = conversations.map(conv => {
        const members = ((allMembers || []).filter(m => m.conversation_id === conv.id)) as unknown as TeamMember[];
        const lastMsg = lastMessageMap.get(conv.id) || null;

        // For direct chats, use the other person's name
        let displayName = conv.name;
        if (conv.type === 'direct' && !conv.name) {
          const other = members.find(m => m.profile_id !== profile.id);
          displayName = other?.profile?.name || 'Chat Direto';
        }

        return {
          ...conv,
          type: conv.type as 'direct' | 'group',
          name: displayName,
          avatar_url: conv.type === 'direct' && !conv.avatar_url
            ? members.find(m => m.profile_id !== profile.id)?.profile?.avatar_url
            : conv.avatar_url,
          members,
          last_message: lastMsg as TeamMessage | null,
          unread_count: unreadMap.get(conv.id) || 0,
        };
      });

      return enriched;
    },
    enabled: !!profile,
    refetchInterval: 30000,
    staleTime: 10000,
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
  const lastReadRef = useRef<string | null>(null);

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
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['team-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  // Mark as read — debounced, only when conversation changes
  useEffect(() => {
    if (!conversationId || !profile) return;
    if (lastReadRef.current === conversationId) return;
    lastReadRef.current = conversationId;

    const timeout = setTimeout(() => {
      supabase
        .from('team_conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('profile_id', profile.id)
        .then();
    }, 500);

    return () => clearTimeout(timeout);
  }, [conversationId, profile]);

  // Also mark as read when new messages arrive
  useEffect(() => {
    if (!conversationId || !profile || !query.data?.length) return;
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
    mutationFn: async ({ conversationId, content, replyToId, mediaUrl, mediaType }: {
      conversationId: string;
      content: string;
      replyToId?: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content,
          reply_to_id: replyToId || null,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
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

export function useDeleteTeamMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir mensagem', variant: 'destructive' });
    },
  });
}

export function useEditTeamMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content, conversationId }: {
      messageId: string;
      content: string;
      conversationId: string;
    }) => {
      const { error } = await supabase
        .from('team_messages')
        .update({ content, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', data.conversationId] });
    },
    onError: () => {
      toast({ title: 'Erro ao editar mensagem', variant: 'destructive' });
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

export function useToggleMuteConversation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, muted }: { conversationId: string; muted: boolean }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('team_conversation_members')
        .update({ is_muted: muted })
        .eq('conversation_id', conversationId)
        .eq('profile_id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => {
      toast({ title: 'Erro ao alterar silenciar', variant: 'destructive' });
    },
  });
}
