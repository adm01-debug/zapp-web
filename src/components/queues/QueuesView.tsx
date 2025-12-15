import { useState } from 'react';
import { Queue } from '@/types/chat';
import { mockQueues, mockAgents } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Clock,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function QueuesView() {
  const [queues, setQueues] = useState<Queue[]>(mockQueues);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filas de Atendimento</h1>
          <p className="text-muted-foreground">
            Organize e distribua os atendimentos por departamento
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Fila
        </Button>
      </div>

      {/* Queues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => {
          const queueAgents = mockAgents.filter((a) =>
            queue.agents.includes(a.id)
          );
          const onlineAgents = queueAgents.filter((a) => a.status === 'online');

          return (
            <Card key={queue.id} className="relative overflow-hidden">
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: queue.color }}
              />
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${queue.color}20` }}
                    >
                      <MessageSquare
                        className="w-5 h-5"
                        style={{ color: queue.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{queue.name}</CardTitle>
                      {queue.description && (
                        <p className="text-sm text-muted-foreground">
                          {queue.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
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
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Aguardando</span>
                    </div>
                    <span className="text-xl font-bold">{queue.waitingCount}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Online</span>
                    </div>
                    <span className="text-xl font-bold">
                      {onlineAgents.length}/{queueAgents.length}
                    </span>
                  </div>
                </div>

                {/* Agents */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Atendentes
                  </p>
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {queueAgents.slice(0, 4).map((agent) => (
                        <div key={agent.id} className="relative">
                          <Avatar className="w-8 h-8 border-2 border-card">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback className="text-xs">
                              {agent.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card',
                              agent.status === 'online' && 'bg-status-online',
                              agent.status === 'away' && 'bg-status-away',
                              agent.status === 'offline' && 'bg-status-offline'
                            )}
                          />
                        </div>
                      ))}
                    </div>
                    {queueAgents.length > 4 && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        +{queueAgents.length - 4} mais
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto w-8 h-8"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Average wait time */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Tempo médio de espera
                  </span>
                  <Badge variant="secondary">~3 min</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add Queue Card */}
        <Card className="border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <p className="font-medium">Adicionar Nova Fila</p>
            <p className="text-sm">Clique para criar</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
