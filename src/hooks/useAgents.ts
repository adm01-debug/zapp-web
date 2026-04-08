import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface AgentProfile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean | null;
  max_chats: number | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWithStats extends AgentProfile {
  activeChats: number;
  status: 'online' | 'away' | 'offline';
  queues: Array<{ id: string; name: string; color: string }>;
}

// Presence status derived from user_sessions.last_activity_at
// Thresholds: <5min = online, <30min = away, else offline
const getAgentStatus = (lastActivity?: string): 'online' | 'away' | 'offline' => {
  if (!lastActivity) return 'offline';
  const now = new Date();
  const lastActive = new Date(lastActivity);
  if (isNaN(lastActive.getTime())) return 'offline';
  const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);

  if (diffMinutes < 5) return 'online';
  if (diffMinutes < 30) return 'away';
  return 'offline';
};

export function useAgents() {
  // Fetch profiles
  const { data: profiles, isLoading: loadingProfiles, error: profilesError, refetch: refetchProfiles } = useQuery({
    queryKey: ['agents-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as AgentProfile[];
    },
  });

  // Fetch queues and memberships
  const { data: queuesData, isLoading: loadingQueues } = useQuery({
    queryKey: ['agents-queues'],
    queryFn: async () => {
      const [queuesResult, membersResult] = await Promise.all([
        supabase.from('queues').select('id, name, color').eq('is_active', true),
        supabase.from('queue_members').select('queue_id, profile_id').eq('is_active', true),
      ]);

      if (queuesResult.error) throw queuesResult.error;
      if (membersResult.error) throw membersResult.error;

      return {
        queues: queuesResult.data,
        members: membersResult.data,
      };
    },
  });

  // Fetch active chats count per agent
  const { data: activeChatsData } = useQuery({
    queryKey: ['agents-active-chats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('assigned_to')
        .not('assigned_to', 'is', null);

      if (error) throw error;

      // Count contacts per agent
      const chatCounts: Record<string, number> = {};
      data?.forEach((contact) => {
        if (contact.assigned_to) {
          chatCounts[contact.assigned_to] = (chatCounts[contact.assigned_to] || 0) + 1;
        }
      });

      return chatCounts;
    },
  });

  // Fetch real session activity for presence
  const { data: sessionActivity } = useQuery({
    queryKey: ['agents-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_sessions')
        .select('user_id, last_activity_at')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      // Build map: user_id → most recent activity
      const activityMap: Record<string, string> = {};
      (data || []).forEach(s => {
        if (!activityMap[s.user_id]) activityMap[s.user_id] = s.last_activity_at;
      });
      return activityMap;
    },
    refetchInterval: 30_000, // Refresh every 30s for near-realtime status
  });

  // Combine data into AgentWithStats
  const agents: AgentWithStats[] = useMemo(() => {
    if (!profiles) return [];

    return profiles.map((profile) => {
      const agentQueues = queuesData?.members
        ?.filter((m) => m.profile_id === profile.id)
        .map((m) => {
          const queue = queuesData.queues?.find((q) => q.id === m.queue_id);
          return queue ? { id: queue.id, name: queue.name, color: queue.color } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string; color: string }> || [];

      const activeChats = activeChatsData?.[profile.id] || 0;

      // Use real session activity, fallback to profile.updated_at
      const lastActivity = sessionActivity?.[profile.user_id] || profile.updated_at;
      const status = getAgentStatus(lastActivity);

      return {
        ...profile,
        activeChats,
        status,
        queues: agentQueues,
      };
    });
  }, [profiles, queuesData, activeChatsData, sessionActivity]);

  const isLoading = loadingProfiles || loadingQueues;

  // Stats calculations
  const stats = useMemo(() => {
    const onlineCount = agents.filter((a) => a.status === 'online').length;
    const awayCount = agents.filter((a) => a.status === 'away').length;
    const offlineCount = agents.filter((a) => a.status === 'offline').length;
    const totalActiveChats = agents.reduce((sum, a) => sum + a.activeChats, 0);

    return {
      onlineCount,
      awayCount,
      offlineCount,
      totalActiveChats,
      totalAgents: agents.length,
    };
  }, [agents]);

  return {
    agents,
    stats,
    isLoading,
    error: profilesError,
    refetch: refetchProfiles,
  };
}
