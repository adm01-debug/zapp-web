import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface DashboardFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  queueId?: string | null;
  agentId?: string | null;
}

export interface DashboardStats {
  openConversations: number;
  pendingConversations: number;
  resolvedToday: number;
  totalConversations: number;
  onlineAgents: number;
  totalAgents: number;
  avgResponseTime: number | null;
  queuesStats: QueueStats[];
  recentActivity: RecentActivity[];
}

export interface QueueStats {
  id: string;
  name: string;
  color: string;
  waitingCount: number;
  onlineAgents: number;
  totalAgents: number;
}

export interface RecentActivity {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string | null;
  lastMessage: string;
  timestamp: string;
  status: string;
  unreadCount: number;
}

const getDefaultFilters = (): DashboardFilters => ({
  dateRange: {
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  },
  queueId: null,
  agentId: null,
});

export const useDashboardData = (filters: DashboardFilters = getDefaultFilters()) => {
  const { dateRange, queueId, agentId } = { ...getDefaultFilters(), ...filters };
  // Fetch agents stats
  const agentsQuery = useQuery({
    queryKey: ['dashboard-agents', agentId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, is_active, role')
        .or('role.eq.agent,role.eq.supervisor');
      
      if (agentId) {
        query = query.eq('id', agentId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const onlineAgents = data?.filter(a => a.is_active).length || 0;
      const totalAgents = data?.length || 0;
      
      return { agents: data || [], onlineAgents, totalAgents };
    },
    refetchInterval: 30000,
  });

  // Fetch contacts with conversation status
  const contactsQuery = useQuery({
    queryKey: ['dashboard-contacts', queueId, agentId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone,
          avatar_url,
          queue_id,
          assigned_to,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false });
      
      // Apply queue filter
      if (queueId) {
        query = query.eq('queue_id', queueId);
      }
      
      // Apply agent filter
      if (agentId) {
        query = query.eq('assigned_to', agentId);
      }
      
      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte('updated_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('updated_at', dateRange.to.toISOString());
      }
      
      const { data: contacts, error } = await query;
      
      if (error) throw error;
      
      return contacts || [];
    },
    refetchInterval: 15000,
  });

  // Fetch messages for recent activity and stats
  const messagesQuery = useQuery({
    queryKey: ['dashboard-messages', dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), agentId],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select(`
          id,
          contact_id,
          content,
          sender,
          created_at,
          is_read,
          agent_id,
          contacts (
            id,
            name,
            phone,
            avatar_url,
            queue_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      
      // Apply agent filter
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const { data: messages, error } = await query;
      
      if (error) throw error;
      
      // If queue filter is active, filter messages by contact queue
      if (queueId && messages) {
        return messages.filter((msg: Record<string, unknown>) => (msg.contacts as Record<string, unknown> | null)?.queue_id === queueId);
      }
      
      return messages || [];
    },
    refetchInterval: 10000,
  });

  // Fetch queues
  const queuesQuery = useQuery({
    queryKey: ['dashboard-queues'],
    queryFn: async () => {
      const { data: queues, error } = await supabase
        .from('queues')
        .select(`
          id,
          name,
          color,
          queue_members (
            profile_id,
            is_active,
            profiles (
              id,
              is_active
            )
          )
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return queues || [];
    },
    refetchInterval: 30000,
  });

  // Fetch contacts per queue for waiting count
  const contactsPerQueueQuery = useQuery({
    queryKey: ['dashboard-contacts-per-queue'],
    queryFn: async () => {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, queue_id, assigned_to');
      
      if (error) throw error;
      
      // Count unassigned contacts per queue
      const queueCounts: Record<string, number> = {};
      contacts?.forEach(contact => {
        if (contact.queue_id && !contact.assigned_to) {
          queueCounts[contact.queue_id] = (queueCounts[contact.queue_id] || 0) + 1;
        }
      });
      
      return queueCounts;
    },
    refetchInterval: 15000,
  });

  // Fetch SLA data for response times
  const slaQuery = useQuery({
    queryKey: ['dashboard-sla'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_sla')
        .select('first_message_at, first_response_at')
        .not('first_response_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Calculate average response time
      if (!data || data.length === 0) return { avgResponseTime: null };
      
      const responseTimes = data.map(sla => {
        const messageTime = new Date(sla.first_message_at).getTime();
        const responseTime = new Date(sla.first_response_at!).getTime();
        return (responseTime - messageTime) / 1000; // in seconds
      });
      
      const avgSeconds = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      return { avgResponseTime: Math.round(avgSeconds) };
    },
    refetchInterval: 60000,
  });

  // Compute dashboard stats
  const stats: DashboardStats | null = (() => {
    if (!contactsQuery.data || !agentsQuery.data || !queuesQuery.data) return null;

    const contacts = contactsQuery.data;
    const messages = messagesQuery.data || [];
    const queues = queuesQuery.data;
    const queueCounts = contactsPerQueueQuery.data || {};

    // Count conversations by status (using messages and assignment)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openConversations = contacts.filter(c => c.assigned_to).length;
    const pendingConversations = contacts.filter(c => !c.assigned_to && c.queue_id).length;
    
    // Count resolved today (contacts updated today with no unread messages)
    const resolvedToday = contacts.filter(c => {
      const updatedAt = new Date(c.updated_at);
      return updatedAt >= today && !c.assigned_to;
    }).length;

    // Queue stats
    const queuesStats: QueueStats[] = queues.map(queue => {
      const members = queue.queue_members || [];
      const onlineMembers = members.filter((m: { is_active?: boolean; profiles?: { is_active?: boolean } }) => 
        m.is_active && m.profiles?.is_active
      ).length;

      return {
        id: queue.id,
        name: queue.name,
        color: queue.color,
        waitingCount: queueCounts[queue.id] || 0,
        onlineAgents: onlineMembers,
        totalAgents: members.length,
      };
    });

    // Recent activity from messages
    const contactMessages = new Map<string, Record<string, unknown>>();
    messages.forEach((msg: Record<string, unknown>) => {
      if (!contactMessages.has(msg.contact_id)) {
        contactMessages.set(msg.contact_id, msg);
      }
    });

    const recentActivity: RecentActivity[] = Array.from(contactMessages.values())
      .slice(0, 10)
      .map((msg: Record<string, unknown>) => ({
        id: msg.id,
        contactName: msg.contacts?.name || 'Desconhecido',
        contactPhone: msg.contacts?.phone || '',
        contactAvatar: msg.contacts?.avatar_url,
        lastMessage: msg.content,
        timestamp: msg.created_at,
        status: msg.is_read ? 'read' : 'unread',
        unreadCount: msg.is_read ? 0 : 1,
      }));

    return {
      openConversations,
      pendingConversations,
      resolvedToday,
      totalConversations: contacts.length,
      onlineAgents: agentsQuery.data.onlineAgents,
      totalAgents: agentsQuery.data.totalAgents,
      avgResponseTime: slaQuery.data?.avgResponseTime || null,
      queuesStats,
      recentActivity,
    };
  })();

  return {
    stats,
    isLoading: agentsQuery.isLoading || contactsQuery.isLoading || queuesQuery.isLoading,
    error: agentsQuery.error || contactsQuery.error || queuesQuery.error,
    refetch: () => {
      agentsQuery.refetch();
      contactsQuery.refetch();
      messagesQuery.refetch();
      queuesQuery.refetch();
      contactsPerQueueQuery.refetch();
      slaQuery.refetch();
    },
  };
};

// Format seconds to readable time
export const formatResponseTime = (seconds: number | null): string => {
  if (seconds === null) return 'N/A';
  
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}min ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}min`;
};
