import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Star,
  Zap,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentGoalData {
  profile_id: string;
  profile_name: string;
  avatar_url: string | null;
  goals_completed: number;
  total_goals: number;
  completion_rate: number;
  messages_sent: number;
  contacts_handled: number;
  streak: number;
  trend: 'up' | 'down' | 'stable';
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
];

function getDateRange(period: string) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

function getRankIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="w-5 h-5 text-warning" />;
    case 2:
      return <Medal className="w-5 h-5 text-muted-foreground" />;
    case 3:
      return <Award className="w-5 h-5 text-warning" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{position}</span>;
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-success" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

function getCompletionColor(rate: number): string {
  if (rate >= 100) return 'text-success';
  if (rate >= 75) return 'text-primary';
  if (rate >= 50) return 'text-warning';
  return 'text-destructive';
}

export function AgentRanking() {
  const [period, setPeriod] = useState('today');
  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch messages for the period
  const { data: messagesData } = useQuery({
    queryKey: ['ranking-messages', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('agent_id, sender')
        .eq('sender', 'agent')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contacts for the period
  const { data: contactsData } = useQuery({
    queryKey: ['ranking-contacts', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('assigned_to')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agent stats for streaks
  const { data: agentStats } = useQuery({
    queryKey: ['agent-stats-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_stats')
        .select('profile_id, current_streak');
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate rankings
  const rankings = useMemo((): AgentGoalData[] => {
    if (!profiles) return [];

    const agentData = profiles.map((profile) => {
      const messagesSent = messagesData?.filter(m => m.agent_id === profile.id).length || 0;
      const contactsHandled = contactsData?.filter(c => c.assigned_to === profile.id).length || 0;
      const streak = agentStats?.find(s => s.profile_id === profile.id)?.current_streak || 0;

      // Calculate goals (simplified - in production would use goals_configurations)
      const messageGoal = period === 'today' ? 50 : period === 'week' ? 250 : 1000;
      const contactGoal = period === 'today' ? 10 : period === 'week' ? 50 : 200;

      const messageProgress = Math.min((messagesSent / messageGoal) * 100, 100);
      const contactProgress = Math.min((contactsHandled / contactGoal) * 100, 100);
      const avgProgress = (messageProgress + contactProgress) / 2;

      const goalsCompleted = (messagesSent >= messageGoal ? 1 : 0) + (contactsHandled >= contactGoal ? 1 : 0);

      // Determine trend (simplified - in production would compare with previous period)
      const trend: 'up' | 'down' | 'stable' = 
        avgProgress >= 75 ? 'up' : avgProgress >= 50 ? 'stable' : 'down';

      return {
        profile_id: profile.id,
        profile_name: profile.name,
        avatar_url: profile.avatar_url,
        goals_completed: goalsCompleted,
        total_goals: 2,
        completion_rate: avgProgress,
        messages_sent: messagesSent,
        contacts_handled: contactsHandled,
        streak,
        trend,
      };
    });

    // Sort by completion rate, then by messages sent
    return agentData.sort((a, b) => {
      if (b.completion_rate !== a.completion_rate) {
        return b.completion_rate - a.completion_rate;
      }
      return b.messages_sent - a.messages_sent;
    });
  }, [profiles, messagesData, contactsData, agentStats, period]);

  const isLoading = !profiles;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Ranking de Metas
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum agente encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((agent, index) => {
              const position = index + 1;
              const isTopThree = position <= 3;

              return (
                <motion.div
                  key={agent.profile_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    isTopThree && 'bg-primary/5 border border-primary/10',
                    position === 1 && 'bg-warning/10 border-yellow-500/20',
                    !isTopThree && 'hover:bg-muted/50'
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {getRankIcon(position)}
                  </div>

                  {/* Avatar */}
                  <Avatar className={cn(
                    'h-10 w-10 border-2',
                    position === 1 && 'border-yellow-500',
                    position === 2 && 'border-border',
                    position === 3 && 'border-warning',
                    !isTopThree && 'border-border'
                  )}>
                    <AvatarImage src={agent.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {agent.profile_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{agent.profile_name}</span>
                      {agent.streak >= 3 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Flame className="w-3 h-3 text-warning" />
                          {agent.streak}
                        </Badge>
                      )}
                      {agent.completion_rate >= 100 && (
                        <Star className="w-4 h-4 text-warning fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{agent.messages_sent} msgs</span>
                      <span>•</span>
                      <span>{agent.contacts_handled} contatos</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={getCompletionColor(agent.completion_rate)}>
                          {Math.round(agent.completion_rate)}%
                        </span>
                      </div>
                      <Progress 
                        value={agent.completion_rate} 
                        className="h-1.5"
                      />
                    </div>
                    
                    {/* Trend */}
                    <div className="w-6 flex justify-center">
                      {getTrendIcon(agent.trend)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
