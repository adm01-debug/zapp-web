import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Clock,
  MessageSquare,
  UserMinus,
  Loader2,
  BarChart3,
  Eye,
  Target,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueues, QueueWithMembers } from '@/hooks/useQueues';
import { useQueueGoals, QueueAlert } from '@/hooks/useQueueGoals';
import { CreateQueueDialog } from './CreateQueueDialog';
import { AddMemberDialog } from './AddMemberDialog';
import { QueueGoalsDialog } from './QueueGoalsDialog';
import { QueueAlertsDisplay } from './QueueAlertsDisplay';

export function QueuesView() {
  const navigate = useNavigate();
  const { queues, loading, createQueue, deleteQueue, addMember, removeMember } = useQueues();
  const { goals } = useQueueGoals();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueWithMembers | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<QueueWithMembers | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Calculate alerts based on current metrics vs goals
  const alerts = useMemo<QueueAlert[]>(() => {
    const allAlerts: QueueAlert[] = [];

    queues.forEach(queue => {
      const queueGoal = goals[queue.id];
      if (!queueGoal || !queueGoal.alerts_enabled) return;

      const activeMembers = queue.members.filter(m => m.is_active).length;
      const assignmentRate = queue.waiting_count + activeMembers > 0
        ? Math.round((activeMembers / (queue.waiting_count + activeMembers)) * 100)
        : 100;

      // Check waiting contacts
      if (queue.waiting_count > queueGoal.max_waiting_contacts) {
        const alertKey = `${queue.id}-waiting_contacts`;
        if (!dismissedAlerts.has(alertKey)) {
          allAlerts.push({
            type: 'waiting_contacts',
            queueId: queue.id,
            queueName: queue.name,
            queueColor: queue.color,
            message: `${queue.waiting_count} contatos aguardando atendimento`,
            severity: queue.waiting_count > queueGoal.max_waiting_contacts * 1.5 ? 'critical' : 'warning',
            currentValue: queue.waiting_count,
            threshold: queueGoal.max_waiting_contacts,
          });
        }
      }

      // Check assignment rate
      if (assignmentRate < queueGoal.min_assignment_rate && queue.waiting_count > 0) {
        const alertKey = `${queue.id}-assignment_rate`;
        if (!dismissedAlerts.has(alertKey)) {
          allAlerts.push({
            type: 'assignment_rate',
            queueId: queue.id,
            queueName: queue.name,
            queueColor: queue.color,
            message: `Taxa de atribuição abaixo do esperado`,
            severity: assignmentRate < queueGoal.min_assignment_rate * 0.5 ? 'critical' : 'warning',
            currentValue: assignmentRate,
            threshold: queueGoal.min_assignment_rate,
          });
        }
      }
    });

    return allAlerts;
  }, [queues, goals, dismissedAlerts]);

  const handleDismissAlert = (alert: QueueAlert) => {
    setDismissedAlerts(prev => new Set([...prev, `${alert.queueId}-${alert.type}`]));
  };

  const getQueueAlertCount = (queueId: string) => {
    return alerts.filter(a => a.queueId === queueId).length;
  };

  const handleCreateQueue = async (queue: { name: string; description: string; color: string }) => {
    await createQueue(queue);
  };

  const handleDeleteQueue = async () => {
    if (queueToDelete) {
      await deleteQueue(queueToDelete.id);
      setQueueToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleAddMemberClick = (queue: QueueWithMembers) => {
    setSelectedQueue(queue);
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async (profileId: string) => {
    if (selectedQueue) {
      await addMember(selectedQueue.id, profileId);
    }
  };

  const handleRemoveMember = async (queueId: string, profileId: string) => {
    await removeMember(queueId, profileId);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
        <AuroraBorealis />
        <FloatingParticles />
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-secondary/20 bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filas de Atendimento</h1>
          <p className="text-muted-foreground">
            Organize e distribua os atendimentos por departamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="border-border/30 hover:bg-muted/30"
            onClick={() => navigate('/sla')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Dashboard SLA
          </Button>
          <Button 
            variant="outline"
            className="border-border/30 hover:bg-muted/30"
            onClick={() => navigate('/queues/comparison')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Comparar Filas
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Fila
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas Ativos ({alerts.length})
          </h2>
          <QueueAlertsDisplay 
            alerts={alerts} 
            onDismiss={handleDismissAlert}
            onNavigate={(queueId) => navigate(`/queue/${queueId}`)}
          />
        </div>
      )}

      {/* Queues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => {
          const activeMembers = queue.members.filter(m => m.is_active && m.profile?.is_active);

          return (
            <Card 
              key={queue.id} 
              className="relative overflow-hidden border border-secondary/20 bg-card hover:border-secondary/40 transition-all hover:shadow-[0_0_20px_hsl(var(--secondary)/0.2)]"
            >
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
                      style={{ backgroundColor: `${queue.color}15` }}
                    >
                      <MessageSquare
                        className="w-5 h-5"
                        style={{ color: queue.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground">{queue.name}</CardTitle>
                      {queue.description && (
                        <p className="text-sm text-muted-foreground">
                          {queue.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-muted/30">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border/30">
                      <DropdownMenuItem 
                        className="hover:bg-primary/10"
                        onClick={() => navigate(`/queue/${queue.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-primary/10"
                        onClick={() => {
                          setSelectedQueue(queue);
                          setGoalsDialogOpen(true);
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Metas e Alertas
                        {getQueueAlertCount(queue.id) > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs px-1.5">
                            {getQueueAlertCount(queue.id)}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="hover:bg-primary/10">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setQueueToDelete(queue);
                          setDeleteDialogOpen(true);
                        }}
                      >
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
                  <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Aguardando</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{queue.waiting_count}</span>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Atendentes</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{activeMembers.length}</span>
                  </div>
                </div>

                {/* Agents */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Atendentes
                  </p>
                  <div className="flex items-center">
                    {activeMembers.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {activeMembers.slice(0, 4).map((member) => (
                            <div key={member.id} className="relative group">
                              <Avatar className="w-8 h-8 border-2 border-card ring-1 ring-border/30">
                                <AvatarImage src={member.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {member.profile?.name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <button
                                onClick={() => handleRemoveMember(queue.id, member.profile_id)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <UserMinus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {activeMembers.length > 4 && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            +{activeMembers.length - 4} mais
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhum atendente</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto w-8 h-8 hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleAddMemberClick(queue)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Max wait time */}
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <span className="text-sm text-muted-foreground">
                    Tempo máximo de espera
                  </span>
                  <Badge variant="secondary" className="bg-muted/30 text-foreground">
                    {queue.max_wait_time_minutes} min
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add Queue Card */}
        <Card 
          className="border border-dashed border-border/40 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors bg-transparent"
          onClick={() => setCreateDialogOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <p className="font-medium">Adicionar Nova Fila</p>
            <p className="text-sm">Clique para criar</p>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateQueueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateQueue}
      />

      {selectedQueue && (
        <AddMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          queueId={selectedQueue.id}
          existingMemberIds={selectedQueue.members.map(m => m.profile_id)}
          onAddMember={handleAddMember}
        />
      )}

      {selectedQueue && (
        <QueueGoalsDialog
          open={goalsDialogOpen}
          onOpenChange={setGoalsDialogOpen}
          queueId={selectedQueue.id}
          queueName={selectedQueue.name}
          queueColor={selectedQueue.color}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Fila</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a fila "{queueToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-muted-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQueue}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
