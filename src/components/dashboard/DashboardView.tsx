import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
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
      color: 'text-status-open',
      bgColor: 'bg-status-open/10',
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '2min 34s',
      change: '-8%',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'text-status-waiting',
      bgColor: 'bg-status-waiting/10',
    },
    {
      title: 'Atendentes Online',
      value: `${onlineAgents}/${totalAgents}`,
      change: '+2',
      changeType: 'positive' as const,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Resolvidas Hoje',
      value: resolvedToday,
      change: '+24%',
      changeType: 'positive' as const,
      icon: CheckCircle2,
      color: 'text-status-resolved',
      bgColor: 'bg-status-resolved/10',
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do atendimento em tempo real
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4 text-status-open" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-destructive" />
                      )}
                      <span
                        className={cn(
                          'text-sm font-medium',
                          stat.changeType === 'positive'
                            ? 'text-status-open'
                            : 'text-destructive'
                        )}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-muted-foreground">vs ontem</span>
                    </div>
                  </div>
                  <div className={cn('p-3 rounded-xl', stat.bgColor)}>
                    <Icon className={cn('w-6 h-6', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queues Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Status das Filas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockQueues.map((queue) => {
              const queueAgents = mockAgents.filter((a) =>
                queue.agents.includes(a.id)
              );
              const onlineQueueAgents = queueAgents.filter(
                (a) => a.status === 'online'
              ).length;

              return (
                <div key={queue.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: queue.color }}
                      />
                      <span className="font-medium">{queue.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {queue.waitingCount} aguardando
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {onlineQueueAgents}/{queueAgents.length} atendentes online
                    </span>
                  </div>
                  <Progress
                    value={(queue.waitingCount / 10) * 100}
                    className="h-2"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendentes Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAgents
              .filter((a) => a.status !== 'offline')
              .map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={agent.avatar} />
                        <AvatarFallback>{agent.name[0]}</AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
                          agent.status === 'online'
                            ? 'bg-status-online'
                            : 'bg-status-away'
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {agent.role === 'supervisor' ? 'Supervisor' : 'Atendente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {agent.activeChats}/{agent.maxChats}
                    </p>
                    <p className="text-xs text-muted-foreground">chats</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockConversations.slice(0, 5).map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={conv.contact.avatar} />
                    <AvatarFallback>
                      {conv.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{conv.contact.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {conv.lastMessage?.content}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    conv.status === 'open' && 'border-status-open text-status-open',
                    conv.status === 'pending' && 'border-status-pending text-status-pending',
                    conv.status === 'resolved' && 'border-status-resolved text-status-resolved',
                    conv.status === 'waiting' && 'border-status-waiting text-status-waiting'
                  )}
                >
                  {conv.status === 'open' ? 'Aberto' : 
                   conv.status === 'pending' ? 'Pendente' :
                   conv.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
