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
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { mockAgents, mockQueues, mockConversations } from '@/data/mockData';
import { cn } from '@/lib/utils';

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
      gradient: 'from-primary to-primary-glow',
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '2min 34s',
      change: '-8%',
      changeType: 'positive' as const,
      icon: Clock,
      gradient: 'from-info to-blue-400',
    },
    {
      title: 'Atendentes Online',
      value: `${onlineAgents}/${totalAgents}`,
      change: '+2',
      changeType: 'positive' as const,
      icon: Users,
      gradient: 'from-success to-emerald-400',
    },
    {
      title: 'Resolvidas Hoje',
      value: resolvedToday,
      change: '+24%',
      changeType: 'positive' as const,
      icon: CheckCircle2,
      gradient: 'from-coins to-yellow-400',
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-primary-glow/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="flex items-center gap-3 mb-1">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)' }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Visão geral do atendimento em tempo real
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className="card-interactive relative overflow-hidden border-border/50 hover:border-primary/30 h-full">
                {/* Gradient accent top */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                  stat.gradient
                )} />
                
                {/* Hover glow */}
                <motion.div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(300px circle at 50% 0%, hsl(var(--primary) / 0.08), transparent 70%)`
                  }}
                />

                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-medium">
                        {stat.title}
                      </p>
                      <motion.p 
                        className="text-3xl font-display font-bold text-foreground"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: 'spring' }}
                      >
                        {stat.value}
                      </motion.p>
                      <motion.div 
                        className="flex items-center gap-1.5 mt-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.4 }}
                      >
                        <div className={cn(
                          "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                          stat.changeType === 'positive'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        )}>
                          {stat.changeType === 'positive' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {stat.change}
                        </div>
                        <span className="text-xs text-muted-foreground">vs ontem</span>
                      </motion.div>
                    </div>
                    <motion.div 
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                        stat.gradient
                      )}
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Queues Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="card-elevated border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="font-display text-lg">Status das Filas</CardTitle>
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

        {/* Active Agents */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="card-elevated border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-success" />
                </div>
                <CardTitle className="font-display text-lg">Atendentes Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <StaggeredList className="space-y-2">
                {mockAgents
                  .filter((a) => a.status !== 'offline')
                  .map((agent) => (
                    <StaggeredItem key={agent.id}>
                      <motion.div
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer group"
                        whileHover={{ x: 4, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
                              <AvatarImage src={agent.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {agent.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <motion.span
                              animate={{ 
                                scale: agent.status === 'online' ? [1, 1.2, 1] : 1,
                                boxShadow: agent.status === 'online' 
                                  ? ['0 0 0 0 hsl(var(--success) / 0.4)', '0 0 0 4px hsl(var(--success) / 0)', '0 0 0 0 hsl(var(--success) / 0.4)']
                                  : 'none'
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                                agent.status === 'online' ? 'bg-success' : 'bg-warning'
                              )}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {agent.role === 'supervisor' ? 'Supervisor' : 'Atendente'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            {agent.activeChats}/{agent.maxChats}
                          </p>
                          <p className="text-xs text-muted-foreground">chats</p>
                        </div>
                      </motion.div>
                    </StaggeredItem>
                  ))}
              </StaggeredList>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="card-elevated border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="font-display text-lg">Atividade Recente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <StaggeredList className="space-y-2">
              {mockConversations.slice(0, 5).map((conv, index) => (
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
    </div>
  );
}
