import { useState } from 'react';
import { Agent } from '@/types/chat';
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
    <div className="p-6 space-y-6 overflow-y-auto h-full">
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
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Atendente
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -4, boxShadow: '0 8px 30px hsl(var(--primary) / 0.1)' }}
          >
            <Card className="cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {stat.color ? (
                    <motion.div 
                      className={cn('w-3 h-3 rounded-full', stat.color)}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <motion.p 
                      className="text-2xl font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {stat.value}
                    </motion.p>
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
            className="pl-9"
          />
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </motion.div>
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
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 8px 30px hsl(var(--primary) / 0.15)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {agent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={cn(
                              'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card',
                              agent.status === 'online' && 'bg-status-online',
                              agent.status === 'away' && 'bg-status-away',
                              agent.status === 'offline' && 'bg-status-offline'
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {agent.role === 'admin' ? 'Administrador' : 
                             agent.role === 'supervisor' ? 'Supervisor' : 'Atendente'}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Configurações
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
                        <span className="font-medium">
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
                            className="text-xs"
                            style={{ borderColor: queue.color, color: queue.color }}
                          >
                            {queue.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggeredItem>
          );
        })}
      </StaggeredList>
    </div>
  );
}
