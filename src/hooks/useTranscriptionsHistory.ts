import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';

export interface TranscriptionRecord {
  id: string;
  content: string;
  transcription: string;
  media_url: string | null;
  created_at: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_avatar: string | null;
}

export interface GroupedTranscriptions {
  [contactId: string]: {
    contact: { id: string; name: string; phone: string; avatar: string | null };
    transcriptions: TranscriptionRecord[];
  };
}

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function useTranscriptionsHistory() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const fetchTranscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`id, content, media_url, created_at, contact_id, contacts!inner(name, phone, avatar_url)`)
        .not('content', 'is', null)
        .like('content', '%[Transcrição]%')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const records: TranscriptionRecord[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        transcription: msg.content.replace(/\[Transcrição\]\s*/i, '').trim(),
        media_url: msg.media_url,
        created_at: msg.created_at,
        contact_id: msg.contact_id,
        contact_name: msg.contacts?.name || 'Desconhecido',
        contact_phone: msg.contacts?.phone || '',
        contact_avatar: msg.contacts?.avatar_url || null,
      }));

      setTranscriptions(records);
      if (records.length > 0) {
        const uniqueContacts = [...new Set(records.map(r => r.contact_id))];
        setExpandedContacts(new Set(uniqueContacts.slice(0, 3)));
      }
    } catch (err) {
      log.error('Error fetching transcriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTranscriptions = useMemo(() => {
    let filtered = transcriptions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.transcription.toLowerCase().includes(q) || t.contact_name.toLowerCase().includes(q) || t.contact_phone.includes(q));
    }
    if (dateFilter !== 'all') {
      filtered = filtered.filter(t => {
        const d = new Date(t.created_at);
        switch (dateFilter) {
          case 'today': return isToday(d);
          case 'week': return isThisWeek(d);
          case 'month': return isThisMonth(d);
          default: return true;
        }
      });
    }
    return filtered;
  }, [transcriptions, searchQuery, dateFilter]);

  const grouped = useMemo(() => {
    const g: GroupedTranscriptions = {};
    filteredTranscriptions.forEach(t => {
      if (!g[t.contact_id]) {
        g[t.contact_id] = { contact: { id: t.contact_id, name: t.contact_name, phone: t.contact_phone, avatar: t.contact_avatar }, transcriptions: [] };
      }
      g[t.contact_id].transcriptions.push(t);
    });
    return g;
  }, [filteredTranscriptions]);

  const toggleContact = (contactId: string) => {
    setExpandedContacts(prev => {
      const next = new Set(prev);
      next.has(contactId) ? next.delete(contactId) : next.add(contactId);
      return next;
    });
  };

  const totalCount = transcriptions.length;
  const filteredCount = filteredTranscriptions.length;
  const contactCount = Object.keys(grouped).length;

  return {
    loading, searchQuery, setSearchQuery, dateFilter, setDateFilter,
    expandedContacts, toggleContact, playingAudio, setPlayingAudio,
    grouped, totalCount, filteredCount, contactCount,
    refetch: fetchTranscriptions,
  };
}
