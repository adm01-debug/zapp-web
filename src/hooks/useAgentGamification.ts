import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AgentStats {
  id: string;
  profile_id: string;
  xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  messages_sent: number;
  messages_received: number;
  conversations_resolved: number;
  achievements_count: number;
  avg_response_time_seconds: number | null;
  customer_satisfaction_score: number | null;
}

export interface Achievement {
  id: string;
  profile_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  xp_earned: number;
  earned_at: string;
}

// Achievement type definitions
export const ACHIEVEMENT_TYPES = {
  FAST_RESPONSE: 'fast_response',
  SPEED_DEMON: 'speed_demon',
  STREAK: 'streak',
  STREAK_MASTER: 'streak_master',
  RESOLUTION: 'resolution',
  PERFECT_RATING: 'perfect_rating',
  LEVEL_UP: 'level_up',
  DAILY_GOAL: 'daily_goal',
  FIRST_MESSAGE: 'first_message',
  FIRST_RESOLUTION: 'first_resolution',
  MESSAGE_MILESTONE: 'message_milestone',
  TEAM_PLAYER: 'team_player',
} as const;

export const useAgentGamification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current user's profile ID
  const profileQuery = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  const profileId = profileQuery.data?.id;

  // Fetch agent stats
  const statsQuery = useQuery({
    queryKey: ['agent-stats', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('agent_stats')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();
      
      if (error) throw error;
      return data as AgentStats | null;
    },
    enabled: !!profileId,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch recent achievements
  const achievementsQuery = useQuery({
    queryKey: ['agent-achievements', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('agent_achievements')
        .select('*')
        .eq('profile_id', profileId)
        .order('earned_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!profileId,
    refetchOnWindowFocus: false,
  });

  // Add XP mutation
  const addXpMutation = useMutation({
    mutationFn: async ({ xp, reason }: { xp: number; reason: string }) => {
      if (!profileId) throw new Error('No profile ID');
      
      const currentStats = statsQuery.data;
      const newXp = (currentStats?.xp || 0) + xp;
      const newLevel = calculateLevel(newXp);
      const leveledUp = newLevel > (currentStats?.level || 1);
      
      const { error } = await supabase
        .from('agent_stats')
        .update({ 
          xp: newXp,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);
      
      if (error) throw error;
      
      return { newXp, newLevel, leveledUp, previousLevel: currentStats?.level || 1 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', profileId] });
    },
  });

  // Grant achievement mutation
  const grantAchievementMutation = useMutation({
    mutationFn: async ({ 
      type, 
      name, 
      description, 
      xpReward 
    }: { 
      type: string; 
      name: string; 
      description?: string; 
      xpReward: number;
    }) => {
      if (!profileId) throw new Error('No profile ID');
      
      // Check if achievement already exists (for unique achievements)
      const { data: existing } = await supabase
        .from('agent_achievements')
        .select('id')
        .eq('profile_id', profileId)
        .eq('achievement_type', type)
        .maybeSingle();
      
      // For some achievements, allow duplicates (daily goals, streaks)
      const allowDuplicates = ['daily_goal', 'streak', 'message_milestone'];
      if (existing && !allowDuplicates.includes(type)) {
        return { alreadyHad: true };
      }
      
      // Insert achievement
      const { error: achievementError } = await supabase
        .from('agent_achievements')
        .insert({
          profile_id: profileId,
          achievement_type: type,
          achievement_name: name,
          achievement_description: description,
          xp_earned: xpReward,
        });
      
      if (achievementError) throw achievementError;
      
      // Update achievements count and add XP
      const currentStats = statsQuery.data;
      const newXp = (currentStats?.xp || 0) + xpReward;
      const newLevel = calculateLevel(newXp);
      const newAchievementsCount = (currentStats?.achievements_count || 0) + 1;
      
      const { error: statsError } = await supabase
        .from('agent_stats')
        .update({ 
          xp: newXp,
          level: newLevel,
          achievements_count: newAchievementsCount,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);
      
      if (statsError) throw statsError;
      
      return { 
        alreadyHad: false, 
        newXp, 
        newLevel, 
        leveledUp: newLevel > (currentStats?.level || 1) 
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', profileId] });
      queryClient.invalidateQueries({ queryKey: ['agent-achievements', profileId] });
    },
  });

  // Update streak mutation
  const updateStreakMutation = useMutation({
    mutationFn: async (increment: boolean) => {
      if (!profileId) throw new Error('No profile ID');
      
      const currentStats = statsQuery.data;
      let newStreak: number;
      let newBestStreak = currentStats?.best_streak || 0;
      
      if (increment) {
        newStreak = (currentStats?.current_streak || 0) + 1;
        if (newStreak > newBestStreak) {
          newBestStreak = newStreak;
        }
      } else {
        newStreak = 0;
      }
      
      const { error } = await supabase
        .from('agent_stats')
        .update({ 
          current_streak: newStreak,
          best_streak: newBestStreak,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);
      
      if (error) throw error;
      
      return { newStreak, newBestStreak };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', profileId] });
    },
  });

  // Increment messages mutation
  const incrementMessagesMutation = useMutation({
    mutationFn: async (type: 'sent' | 'received') => {
      if (!profileId) throw new Error('No profile ID');
      
      const currentStats = statsQuery.data;
      const newSent = type === 'sent' 
        ? (currentStats?.messages_sent || 0) + 1 
        : currentStats?.messages_sent || 0;
      const newReceived = type === 'received' 
        ? (currentStats?.messages_received || 0) + 1 
        : currentStats?.messages_received || 0;
      
      const { error } = await supabase
        .from('agent_stats')
        .update({ 
          messages_sent: newSent,
          messages_received: newReceived,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);
      
      if (error) throw error;
      
      return { newSent, newReceived };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', profileId] });
    },
  });

  // Increment resolutions mutation
  const incrementResolutionsMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('No profile ID');
      
      const currentStats = statsQuery.data;
      const newResolutions = (currentStats?.conversations_resolved || 0) + 1;
      
      const { error } = await supabase
        .from('agent_stats')
        .update({ 
          conversations_resolved: newResolutions,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);
      
      if (error) throw error;
      
      return { newResolutions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-stats', profileId] });
    },
  });

  return {
    stats: statsQuery.data,
    achievements: achievementsQuery.data || [],
    isLoading: statsQuery.isLoading || achievementsQuery.isLoading,
    profileId,
    
    // Mutations
    addXp: addXpMutation.mutateAsync,
    grantAchievement: grantAchievementMutation.mutateAsync,
    updateStreak: updateStreakMutation.mutateAsync,
    incrementMessages: incrementMessagesMutation.mutateAsync,
    incrementResolutions: incrementResolutionsMutation.mutateAsync,
    
    // Helpers
    isAddingXp: addXpMutation.isPending,
    isGrantingAchievement: grantAchievementMutation.isPending,
  };
};

// Calculate level from XP (same as database function)
export const calculateLevel = (xp: number): number => {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50.0)) + 1);
};

// Calculate XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 50;
};

// Calculate progress to next level (0-100)
export const levelProgress = (xp: number, level: number): number => {
  const currentLevelXp = xpForNextLevel(level - 1);
  const nextLevelXp = xpForNextLevel(level);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
};
