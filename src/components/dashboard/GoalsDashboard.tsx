import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  Target,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Flame,
  Trophy,
  Zap,
  Calendar,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Goal {
  id: string;
  label: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  priority: 'high' | 'medium' | 'low';
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
];

// Default goal targets (could be made configurable)
const DEFAULT_GOALS = {
  messagesSent: { daily: 50, weekly: 250, monthly: 1000 },
  contactsHandled: { daily: 10, weekly: 50, monthly: 200 },
  responseTime: { daily: 5, weekly: 5, monthly: 5 }, // in minutes
  resolutionRate: { daily: 80, weekly: 80, monthly: 85 }, // percentage
};

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

function getGoalTarget(goalKey: keyof typeof DEFAULT_GOALS, period: string) {
  const goals = DEFAULT_GOALS[goalKey];
  switch (period) {
    case 'today':
      return goals.daily;
    case 'week':
      return goals.weekly;
    case 'month':
      return goals.monthly;
    default:
      return goals.daily;
  }
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'text-success';
  if (percentage >= 75) return 'text-primary';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}

function getProgressBgColor(percentage: number): string {
  if (percentage >= 100) return 'bg-success';
  if (percentage >= 75) return 'bg-primary';
  if (percentage >= 50) return 'bg-warning';
  return 'bg-destructive';
}

export function GoalsDashboard() {
  const [period, setPeriod] = useState('today');
  const { user } = useAuth();

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Fetch current user's profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch messages data
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['goals-messages', period, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender, created_at')
        .eq('agent_id', profile.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch contacts data
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['goals-contacts', period, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, created_at')
        .eq('assigned_to', profile.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch conversation analyses for resolution rate
  const { data: analysesData, isLoading: loadingAnalyses } = useQuery({
    queryKey: ['goals-analyses', period, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('conversation_analyses')
        .select('id, status, created_at')
        .eq('analyzed_by', profile.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Calculate goals
  const goals = useMemo((): Goal[] => {
    const messagesSent = messagesData?.filter(m => m.sender === 'agent').length || 0;
    const contactsHandled = contactsData?.length || 0;
    const totalAnalyses = analysesData?.length || 0;
    const resolvedAnalyses = analysesData?.filter(a => a.status === 'resolvido').length || 0;
    const resolutionRate = totalAnalyses > 0 ? Math.round((resolvedAnalyses / totalAnalyses) * 100) : 0;

    return [
      {
        id: 'messages-sent',
        label: 'Mensagens Enviadas',
        description: 'Total de mensagens enviadas no período',
        target: getGoalTarget('messagesSent', period),
        current: messagesSent,
        unit: 'mensagens',
        icon: MessageSquare,
        color: 'hsl(var(--primary))',
        priority: 'high',
      },
      {
        id: 'contacts-handled',
        label: 'Contatos Atendidos',
        description: 'Novos contatos atribuídos a você',
        target: getGoalTarget('contactsHandled', period),
        current: contactsHandled,
        unit: 'contatos',
        icon: Users,
        color: 'hsl(var(--chart-2))',
        priority: 'high',
      },
      {
        id: 'resolution-rate',
        label: 'Taxa de Resolução',
        description: 'Percentual de conversas resolvidas',
        target: getGoalTarget('resolutionRate', period),
        current: resolutionRate,
        unit: '%',
        icon: CheckCircle2,
        color: 'hsl(var(--chart-3))',
        priority: 'medium',
      },
    ];
  }, [messagesData, contactsData, analysesData, period]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const avgProgress = goals.reduce((acc, goal) => {
      const progress = Math.min((goal.current / goal.target) * 100, 100);
      return acc + progress;
    }, 0) / goals.length;
    return Math.round(avgProgress);
  }, [goals]);

  // Count completed goals
  const completedGoals = useMemo(() => {
    return goals.filter(g => g.current >= g.target).length;
  }, [goals]);

  const isLoading = loadingMessages || loadingContacts || loadingAnalyses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Dashboard de Metas
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe seu progresso em tempo real
          </p>
        </div>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
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

      {/* Overall Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Progresso Geral</h3>
                      <p className="text-sm text-muted-foreground">
                        {completedGoals} de {goals.length} metas concluídas
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className={cn('font-bold', getProgressColor(overallProgress))}>
                        {overallProgress}%
                      </span>
                    </div>
                    <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', getProgressBgColor(overallProgress))}
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {overallProgress >= 100 ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-success/20 rounded-lg">
                      <Flame className="w-5 h-5 text-success" />
                      <span className="font-medium text-success">Todas as metas alcançadas!</span>
                    </div>
                  ) : overallProgress >= 75 ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="font-medium text-primary">Quase lá!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">Continue assim!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Individual Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal, index) => {
          const percentage = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          const isCompleted = goal.current >= goal.target;
          const Icon = goal.icon;

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                'relative overflow-hidden transition-all hover:shadow-lg',
                isCompleted && 'border-success/50 bg-success/5'
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={{ color: goal.color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">{goal.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{goal.description}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Concluída
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2 mb-3">
                        <span className="text-3xl font-bold text-foreground">
                          {goal.current.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-sm mb-1">
                          / {goal.target.toLocaleString()} {goal.unit}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className={cn('font-medium', getProgressColor(percentage))}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full')}
                            style={{ backgroundColor: goal.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* Remaining indicator */}
                      {!isCompleted && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Faltam {(goal.target - goal.current).toLocaleString()} {goal.unit}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>

                {/* Decorative element */}
                <div 
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
                  style={{ backgroundColor: goal.color }}
                />
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Motivation Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {overallProgress >= 100 
                    ? '🎉 Parabéns! Você alcançou todas as metas!'
                    : overallProgress >= 75
                    ? '💪 Excelente progresso! Continue focado!'
                    : overallProgress >= 50
                    ? '🚀 Você está no caminho certo!'
                    : '✨ Cada passo conta! Vamos em frente!'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Período: {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} - {format(dateRange.to, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}