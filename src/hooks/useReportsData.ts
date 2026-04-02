import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgents } from '@/hooks/useAgents';
import { useTags } from '@/hooks/useTags';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export interface DailyData {
  date: string;
  enviadas: number;
  recebidas: number;
  total: number;
}

export interface AgentData {
  name: string;
  mensagens: number;
}

export interface SenderData {
  name: string;
  value: number;
}

export interface ContactTypeData {
  name: string;
  value: number;
}

export interface ContactTagData {
  name: string;
  contatos: number;
}

export interface DailyContactData {
  date: string;
  novos: number;
}

export interface ComparisonData {
  name: string;
  atual: number;
  anterior: number;
}

export interface ReportStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  totalContacts: number;
  activeAgents: number;
  avgMessagesPerDay: number;
  prevTotalMessages: number;
  prevSentMessages: number;
  prevReceivedMessages: number;
  prevTotalContacts: number;
  prevActiveAgents: number;
  prevAvgMessagesPerDay: number;
  messagesTrend?: number;
  sentTrend?: number;
  contactsTrend?: number;
  agentsTrend?: number;
}

function processMessages(
  messages: Array<{ id: string; created_at: string; sender: string; agent_id: string | null; contact_id: string; is_read: boolean }>,
  interval: { start: Date; end: Date },
  agents: Array<{ id: string; name: string }>,
) {
  const days = eachDayOfInterval(interval);

  const daily: DailyData[] = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayMessages = messages.filter(m =>
      format(parseISO(m.created_at), 'yyyy-MM-dd') === dayStr
    );
    const sent = dayMessages.filter(m => m.sender === 'agent').length;
    const received = dayMessages.filter(m => m.sender === 'contact').length;
    return { date: format(day, 'dd/MM', { locale: ptBR }), enviadas: sent, recebidas: received, total: sent + received };
  });

  const agentCounts: Record<string, number> = {};
  messages.forEach(m => {
    if (m.agent_id) agentCounts[m.agent_id] = (agentCounts[m.agent_id] || 0) + 1;
  });
  const byAgent: AgentData[] = Object.entries(agentCounts)
    .map(([agentId, count]) => ({
      name: agents.find(a => a.id === agentId)?.name || 'Desconhecido',
      mensagens: count,
    }))
    .sort((a, b) => b.mensagens - a.mensagens)
    .slice(0, 10);

  const sent = messages.filter(m => m.sender === 'agent').length;
  const received = messages.filter(m => m.sender === 'contact').length;
  const bySender: SenderData[] = [
    { name: 'Enviadas', value: sent },
    { name: 'Recebidas', value: received },
  ];

  return { daily, byAgent, bySender };
}

export function useReportsData() {
  const [period, setPeriod] = useState('30');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const { agents } = useAgents();
  const { tags } = useTags();

  const dateRange = useMemo(() => {
    const days = parseInt(period);
    return { from: startOfDay(subDays(new Date(), days)), to: endOfDay(new Date()) };
  }, [period]);

  const previousDateRange = useMemo(() => {
    const days = parseInt(period);
    return { from: startOfDay(subDays(new Date(), days * 2)), to: endOfDay(subDays(new Date(), days + 1)) };
  }, [period]);

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['reports-messages', period, selectedAgent],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('id, created_at, sender, agent_id, contact_id, is_read')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (selectedAgent !== 'all') query = query.eq('agent_id', selectedAgent);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: previousMessagesData, isLoading: loadingPreviousMessages } = useQuery({
    queryKey: ['reports-messages-previous', period, selectedAgent],
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('id, created_at, sender, agent_id, contact_id, is_read')
        .gte('created_at', previousDateRange.from.toISOString())
        .lte('created_at', previousDateRange.to.toISOString());
      if (selectedAgent !== 'all') query = query.eq('agent_id', selectedAgent);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: compareEnabled,
  });

  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['reports-contacts', period, selectedAgent, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, created_at, assigned_to, tags, contact_type')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      if (selectedAgent !== 'all') query = query.eq('assigned_to', selectedAgent);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: previousContactsData, isLoading: loadingPreviousContacts } = useQuery({
    queryKey: ['reports-contacts-previous', period, selectedAgent, selectedTag],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, created_at, assigned_to, tags, contact_type')
        .gte('created_at', previousDateRange.from.toISOString())
        .lte('created_at', previousDateRange.to.toISOString());
      if (selectedAgent !== 'all') query = query.eq('assigned_to', selectedAgent);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: compareEnabled,
  });

  const chartData = useMemo(() => {
    if (!messagesData) return { daily: [] as DailyData[], byAgent: [] as AgentData[], bySender: [] as SenderData[] };
    return processMessages(messagesData, { start: dateRange.from, end: dateRange.to }, agents);
  }, [messagesData, dateRange, agents]);

  const previousChartData = useMemo(() => {
    if (!previousMessagesData || !compareEnabled) {
      return { daily: [] as DailyData[], byAgent: [] as AgentData[], bySender: [] as SenderData[], totals: { sent: 0, received: 0, total: 0 } };
    }
    const result = processMessages(previousMessagesData, { start: previousDateRange.from, end: previousDateRange.to }, agents);
    // Override daily labels for previous period
    const daily = result.daily.map((d, i) => ({ ...d, date: `Dia ${i + 1}` }));
    const sent = previousMessagesData.filter(m => m.sender === 'agent').length;
    const received = previousMessagesData.filter(m => m.sender === 'contact').length;
    return { ...result, daily, totals: { sent, received, total: sent + received } };
  }, [previousMessagesData, previousDateRange, agents, compareEnabled]);

  const comparisonSummary = useMemo((): ComparisonData[] => {
    if (!compareEnabled) return [];
    return [
      { name: 'Total Mensagens', atual: messagesData?.length || 0, anterior: previousMessagesData?.length || 0 },
      { name: 'Enviadas', atual: messagesData?.filter(m => m.sender === 'agent').length || 0, anterior: previousMessagesData?.filter(m => m.sender === 'agent').length || 0 },
      { name: 'Recebidas', atual: messagesData?.filter(m => m.sender === 'contact').length || 0, anterior: previousMessagesData?.filter(m => m.sender === 'contact').length || 0 },
      { name: 'Novos Contatos', atual: contactsData?.length || 0, anterior: previousContactsData?.length || 0 },
    ];
  }, [messagesData, contactsData, previousMessagesData, previousContactsData, compareEnabled]);

  const contactsChartData = useMemo(() => {
    if (!contactsData) return { byType: [] as ContactTypeData[], byTag: [] as ContactTagData[], daily: [] as DailyContactData[] };

    const typeCounts: Record<string, number> = {};
    contactsData.forEach(c => {
      const type = c.contact_type || 'outros';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const byType: ContactTypeData[] = Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));

    const tagCounts: Record<string, number> = {};
    contactsData.forEach(c => {
      (c.tags || []).forEach((tag: string) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });
    const byTag: ContactTagData[] = Object.entries(tagCounts)
      .map(([tag, count]) => ({ name: tag, contatos: count }))
      .sort((a, b) => b.contatos - a.contatos)
      .slice(0, 10);

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const daily: DailyContactData[] = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = contactsData.filter(c => format(parseISO(c.created_at), 'yyyy-MM-dd') === dayStr).length;
      return { date: format(day, 'dd/MM', { locale: ptBR }), novos: count };
    });

    return { byType, byTag, daily };
  }, [contactsData, dateRange]);

  const stats = useMemo((): ReportStats => {
    const totalMessages = messagesData?.length || 0;
    const sentMessages = messagesData?.filter(m => m.sender === 'agent').length || 0;
    const receivedMessages = messagesData?.filter(m => m.sender === 'contact').length || 0;
    const totalContacts = contactsData?.length || 0;
    const activeAgents = new Set(messagesData?.map(m => m.agent_id).filter(Boolean)).size;

    const prevTotalMessages = previousMessagesData?.length || 0;
    const prevSentMessages = previousMessagesData?.filter(m => m.sender === 'agent').length || 0;
    const prevReceivedMessages = previousMessagesData?.filter(m => m.sender === 'contact').length || 0;
    const prevTotalContacts = previousContactsData?.length || 0;
    const prevActiveAgents = new Set(previousMessagesData?.map(m => m.agent_id).filter(Boolean)).size;

    const calculateTrend = (current: number, previous: number) => {
      if (!compareEnabled || previous === 0) return undefined;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalMessages, sentMessages, receivedMessages, totalContacts, activeAgents,
      avgMessagesPerDay: Math.round(totalMessages / parseInt(period)),
      prevTotalMessages, prevSentMessages, prevReceivedMessages, prevTotalContacts, prevActiveAgents,
      prevAvgMessagesPerDay: Math.round(prevTotalMessages / parseInt(period)),
      messagesTrend: calculateTrend(totalMessages, prevTotalMessages),
      sentTrend: calculateTrend(sentMessages, prevSentMessages),
      contactsTrend: calculateTrend(totalContacts, prevTotalContacts),
      agentsTrend: calculateTrend(activeAgents, prevActiveAgents),
    };
  }, [messagesData, contactsData, previousMessagesData, previousContactsData, period, compareEnabled]);

  const isLoading = loadingMessages || loadingContacts || (compareEnabled && (loadingPreviousMessages || loadingPreviousContacts));

  return {
    // Filters
    period, setPeriod,
    selectedAgent, setSelectedAgent,
    selectedTag, setSelectedTag,
    compareEnabled, setCompareEnabled,
    agents, tags,
    // Dates
    dateRange, previousDateRange,
    // Data
    chartData, previousChartData, comparisonSummary,
    contactsChartData, stats, isLoading,
  };
}
