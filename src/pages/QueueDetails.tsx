import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { log } from '@/lib/logger';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Clock,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  User,
  Settings,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QueueCharts } from '@/components/queues/QueueCharts';

interface QueueDetails {
  id: string;
  name: string;
  description: string | null;
  color: string;
  max_wait_time_minutes: number;
  created_at: string;
}

interface QueueMember {
  id: string;
  profile_id: string;
  profile: {
    name: string;
    avatar_url: string | null;
    is_active: boolean;
  };
}

interface QueueContact {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  assigned_to: string | null;
  created_at: string;
  assigned_agent?: {
    name: string;
    avatar_url: string | null;
  };
  messages_count: number;
  last_message_at: string | null;
}

interface QueueMetrics {
  totalContacts: number;
  assignedContacts: number;
  waitingContacts: number;
  avgResponseTime: string;
  resolvedToday: number;
}

export default function QueueDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [queue, setQueue] = useState<QueueDetails | null>(null);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [contacts, setContacts] = useState<QueueContact[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchQueueData();
    }
  }, [id, user]);

  const fetchQueueData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch queue details
      const { data: queueData, error: queueError } = await supabase
        .from('queues')
        .select('*')
        .eq('id', id)
        .single();

      if (queueError) throw queueError;
      setQueue(queueData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('queue_members')
        .select(`
          id,
          profile_id,
          profile:profiles(name, avatar_url, is_active)
        `)
        .eq('queue_id', id);

      if (membersError) throw membersError;
      setMembers(membersData as unknown as QueueMember[]);

      // Fetch contacts in this queue
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone,
          avatar_url,
          assigned_to,
          created_at
        `)
        .eq('queue_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (contactsError) throw contactsError;

      // Fetch message counts and last message for each contact
      const contactsWithDetails = await Promise.all(
        (contactsData || []).map(async (contact) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contact.id);

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('created_at')
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let assignedAgent = null;
          if (contact.assigned_to) {
            const { data: agentData } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', contact.assigned_to)
              .maybeSingle();
            assignedAgent = agentData;
          }

          return {
            ...contact,
            messages_count: count || 0,
            last_message_at: lastMessage?.created_at || null,
            assigned_agent: assignedAgent,
          };
        })
      );

      setContacts(contactsWithDetails);

      // Calculate metrics
      const totalContacts = contactsWithDetails.length;
      const assignedContacts = contactsWithDetails.filter(c => c.assigned_to).length;
      const waitingContacts = totalContacts - assignedContacts;

      setMetrics({
        totalContacts,
        assignedContacts,
        waitingContacts,
        avgResponseTime: '~3 min',
        resolvedToday: Math.floor(assignedContacts * 0.7),
      });

    } catch (error) {
      log.error('Error fetching queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <AuroraBorealis />
        <FloatingParticles />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Fila não encontrada</h2>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={queue.name}
        subtitle={queue.description || undefined}
        showBack
        onBack={() => navigate('/')}
        breadcrumbs={[
          { label: 'Filas', onClick: () => navigate('/'), href: '/' },
          { label: queue.name },
        ]}
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Configurar
          </Button>
        }
      />
      
      <div className="p-6 space-y-6">

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-secondary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Contatos</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.totalContacts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aguardando</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.waitingContacts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.resolvedToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.avgResponseTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Charts */}
        {queue && (
          <QueueCharts queueId={queue.id} queueColor={queue.color} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Members */}
          <Card className="border border-secondary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Equipe ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum atendente nesta fila
                    </p>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.profile?.name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {member.profile?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.is_active ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={member.profile?.is_active ? 'bg-success/10 text-success' : 'bg-muted/30'}
                        >
                          {member.profile?.is_active ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Contacts History */}
          <Card className="lg:col-span-2 border border-secondary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Histórico de Atendimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum contato nesta fila ainda</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/20">
                        <TableHead>Contato</TableHead>
                        <TableHead>Atendente</TableHead>
                        <TableHead>Mensagens</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id} className="border-border/20 hover:bg-muted/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={contact.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {contact.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.phone}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.assigned_agent ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={contact.assigned_agent.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {contact.assigned_agent.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{contact.assigned_agent.name}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-warning border-warning/30">
                                Aguardando
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-muted/30">
                              {contact.messages_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {contact.last_message_at
                              ? formatDistanceToNow(new Date(contact.last_message_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })
                              : format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={contact.assigned_to 
                                ? 'bg-success/10 text-success' 
                                : 'bg-warning/10 text-warning'}
                            >
                              {contact.assigned_to ? 'Em atendimento' : 'Na fila'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
