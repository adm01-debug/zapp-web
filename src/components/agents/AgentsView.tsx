import { useState } from 'react';
import { Agent } from '@/types/chat';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { mockAgents, mockQueues } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  MessageSquare,
  Settings,
  UserX,
  Edit,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [search, setSearch] = useState('');

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.email.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const awayCount = agents.filter((a) => a.status === 'away').length;
  const offlineCount = agents.filter((a) => a.status === 'offline').length;
  const totalActiveChats = agents.reduce((sum, a) => sum + a.activeChats, 0);

  const statsData = [
    { label: 'Online', value: onlineCount, color: 'bg-status-online' },
    { label: 'Ausente', value: awayCount, color: 'bg-status-away' },
    { label: 'Offline', value: offlineCount, color: 'bg-status-offline' },
    { label: 'Chats Ativos', value: totalActiveChats, icon: MessageSquare },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <FloatingParticles />
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atendentes</h1>
          <p className="text-muted-foreground">
            Gerencie sua equipe de atendimento
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atendente
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {stat.color ? (
                    <div className={cn('w-3 h-3 rounded-full', stat.color)} />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search and Filter */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atendentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/20 border-border/30 focus:border-primary/50"
          />
        </div>
        <Button variant="outline" className="border-border/30 hover:border-primary/30 hover:bg-primary/10">
          <Filter className="w-4 h-4 mr-2" />
          Filtrar
        </Button>
      </motion.div>

      {/* Agents Grid */}
      <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const agentQueues = mockQueues.filter((q) =>
            q.agents.includes(agent.id)
          );
          const capacityPercent = (agent.activeChats / agent.maxChats) * 100;

          return (
            <StaggeredItem key={agent.id}>
              <Card className="cursor-pointer border border-border/30 bg-card hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12 ring-2 ring-border/30">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {agent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card',
                            agent.status === 'online' && 'bg-status-online',
                            agent.status === 'away' && 'bg-status-away',
                            agent.status === 'offline' && 'bg-status-offline'
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {agent.role === 'admin' ? 'Administrador' : 
                           agent.role === 'supervisor' ? 'Supervisor' : 'Atendente'}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-muted/30">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border/30">
                        <DropdownMenuItem className="hover:bg-primary/10">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-primary/10">
                          <Settings className="w-4 h-4 mr-2" />
                          Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive hover:bg-destructive/10">
                          <UserX className="w-4 h-4 mr-2" />
                          Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Capacidade</span>
                      <span className="font-medium text-foreground">
                        {agent.activeChats}/{agent.maxChats} chats
                      </span>
                    </div>
                    <Progress
                      value={capacityPercent}
                      className={cn(
                        'h-2',
                        capacityPercent > 80 && '[&>div]:bg-destructive',
                        capacityPercent > 50 && capacityPercent <= 80 && '[&>div]:bg-status-pending'
                      )}
                    />
                  </div>

                  {/* Queues */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Filas</p>
                    <div className="flex flex-wrap gap-1">
                      {agentQueues.map((queue) => (
                        <Badge
                          key={queue.id}
                          variant="outline"
                          className="text-xs border-border/30"
                          style={{ borderColor: queue.color, color: queue.color }}
                        >
                          {queue.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggeredItem>
          );
        })}
      </StaggeredList>
    </div>
  );
}
