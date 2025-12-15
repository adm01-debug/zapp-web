import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Flame,
  Trophy,
  Target,
  Zap,
} from 'lucide-react';
import { mockAgents, mockQueues, mockConversations } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { AnimatedBadge, StatCardWithGamification, LevelProgress } from './GamificationEffects';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { DemoAchievements } from '@/components/gamification/DemoAchievements';
import { FloatingParticles } from './FloatingParticles';

export function DashboardView() {
  const totalConversations = mockConversations.length;
  const openConversations = mockConversations.filter((c) => c.status === 'open').length;
  const pendingConversations = mockConversations.filter((c) => c.status === 'pending').length;
  const resolvedToday = mockConversations.filter((c) => c.status === 'resolved').length;

  const onlineAgents = mockAgents.filter((a) => a.status === 'online').length;
  const totalAgents = mockAgents.length;

  const stats = [
    {
      title: 'Conversas Abertas',
      value: openConversations,
      change: '+12%',
      changeType: 'positive' as const,
      icon: MessageSquare,
      gradient: 'from-primary to-amber-500',
      iconBg: 'bg-primary/15',
      streak: 5,
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '2min 34s',
      change: '-8%',
      changeType: 'positive' as const,
      icon: Clock,
      gradient: 'from-info to-cyan-400',
      iconBg: 'bg-info/15',
      achievement: { label: 'Resposta Rápida!', unlocked: true },
    },
    {
      title: 'Atendentes Online',
      value: `${onlineAgents}/${totalAgents}`,
      change: '+2',
      changeType: 'positive' as const,
      icon: Users,
      gradient: 'from-success to-emerald-400',
      iconBg: 'bg-success/15',
    },
    {
      title: 'Resolvidas Hoje',
      value: resolvedToday,
      change: '+24%',
      changeType: 'positive' as const,
      icon: CheckCircle2,
      gradient: 'from-coins to-amber-400',
      iconBg: 'bg-coins/15',
      achievement: { label: 'Meta Batida!', unlocked: true },
      streak: 3,
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      {/* Floating Particles Background */}
      <FloatingParticles />

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>

      {/* Header with Level Progress */}
      <motion.div
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden glow-gradient-pulse"
              style={{ background: 'var(--gradient-primary)' }}
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <TrendingUp className="w-6 h-6 text-primary-foreground relative z-10" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="font-display text-2xl font-bold text-foreground neon-underline"
              >
                Dashboard
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-muted-foreground text-sm"
              >
                Visão geral do atendimento em tempo real
              </motion.p>
            </div>
          </div>

          {/* Gamification badges */}
          <div className="flex flex-wrap items-center gap-3">
            <AnimatedBadge value="1.250" label="XP" variant="xp" size="md" />
            <AnimatedBadge value="89" variant="coins" size="md" />
            <AnimatedBadge value="7" variant="streak" size="md" />
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-4">
          <LevelProgress currentXP={1250} requiredXP={2000} level={12} />
        </div>
      </motion.div>

      {/* Stats Grid with Gamification */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {stats.map((stat, index) => (
          <StatCardWithGamification
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            gradient={stat.gradient}
            iconBg={stat.iconBg}
            achievement={stat.achievement}
            streak={stat.streak}
            index={index}
          />
        ))}
      </div>

      {/* Daily Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="card-glow-gradient border-secondary/20 overflow-hidden bg-card">
          <CardHeader className="border-b border-secondary/20 bg-secondary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center glow-purple-pulse-slow"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Target className="w-5 h-5 text-secondary" />
                </motion.div>
                <CardTitle className="font-display text-lg text-foreground">Desafios do Dia</CardTitle>
              </div>
              <AnimatedBadge value="2/4" variant="achievement" size="sm" />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'Responder 10 mensagens', progress: 80, xp: 50, completed: false },
                { title: 'Resolver 5 conversas', progress: 100, xp: 100, completed: true },
                { title: 'Tempo médio < 3min', progress: 100, xp: 75, completed: true },
                { title: 'Sem pendências às 18h', progress: 45, xp: 150, completed: false },
              ].map((challenge, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300",
                    challenge.completed 
                      ? "bg-success/10 border-success/30" 
                      : "bg-muted/30 border-border/30 hover:border-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{challenge.title}</p>
                    {challenge.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        challenge.completed ? "bg-success" : "bg-primary"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${challenge.progress}%` }}
                      transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                    />
                    {!challenge.completed && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{challenge.progress}%</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-xp" />
                      <span className="text-xs font-semibold text-xp">+{challenge.xp} XP</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Queues Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-secondary/20 overflow-hidden bg-card hover:border-secondary/40 transition-all duration-300">
            <CardHeader className="border-b border-secondary/20 bg-secondary/5">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center glow-purple-pulse-slow"
                  whileHover={{ scale: 1.1 }}
                >
                  <Sparkles className="w-5 h-5 text-secondary" />
                </motion.div>
                <CardTitle className="font-display text-lg text-foreground">Status das Filas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <StaggeredList className="space-y-5">
                {mockQueues.map((queue) => {
                  const queueAgents = mockAgents.filter((a) =>
                    queue.agents.includes(a.id)
                  );
                  const onlineQueueAgents = queueAgents.filter(
                    (a) => a.status === 'online'
                  ).length;
                  const progressPercent = Math.min((queue.waitingCount / 10) * 100, 100);

                  return (
                    <StaggeredItem key={queue.id}>
                      <motion.div 
                        className="p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/20 transition-all duration-300 group"
                        whileHover={{ x: 4, scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="w-4 h-4 rounded-full ring-4 ring-offset-2 ring-offset-background ring-primary/20"
                              style={{ backgroundColor: queue.color }}
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span className="font-semibold text-foreground">{queue.name}</span>
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-primary/10 text-primary border-0 font-semibold"
                            >
                              {queue.waitingCount} aguardando
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">
                              {onlineQueueAgents}/{queueAgents.length}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <Progress
                            value={progressPercent}
                            className="h-2.5 bg-muted"
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full opacity-30"
                            style={{
                              background: `linear-gradient(90deg, ${queue.color}, transparent)`,
                              width: `${progressPercent}%`
                            }}
                            animate={{ opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>
                      </motion.div>
                    </StaggeredItem>
                  );
                })}
              </StaggeredList>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard Component */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Leaderboard />
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="border-secondary/20 overflow-hidden bg-card hover:border-secondary/40 transition-all duration-300">
          <CardHeader className="border-b border-secondary/20 bg-secondary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center glow-purple-pulse-slow">
                <MessageSquare className="w-5 h-5 text-secondary" />
              </div>
              <CardTitle className="font-display text-lg text-foreground">Atividade Recente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <StaggeredList className="space-y-2">
              {mockConversations.slice(0, 5).map((conv) => (
                <StaggeredItem key={conv.id}>
                  <motion.div
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer group"
                    whileHover={{ x: 4, scale: 1.005 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                        <AvatarImage src={conv.contact.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {conv.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{conv.contact.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {conv.lastMessage?.content}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'capitalize shrink-0 font-semibold border-0',
                        conv.status === 'open' && 'bg-success/10 text-success',
                        conv.status === 'pending' && 'bg-warning/10 text-warning',
                        conv.status === 'resolved' && 'bg-muted text-muted-foreground',
                        conv.status === 'waiting' && 'bg-info/10 text-info'
                      )}
                    >
                      {conv.status === 'open' ? 'Aberto' : 
                       conv.status === 'pending' ? 'Pendente' :
                       conv.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
                    </Badge>
                  </motion.div>
                </StaggeredItem>
              ))}
            </StaggeredList>
          </CardContent>
        </Card>
      </motion.div>

      {/* Demo Achievements Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <DemoAchievements />
      </motion.div>
    </div>
  );
}
