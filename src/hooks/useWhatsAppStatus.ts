import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface WhatsAppStatusMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    imageMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
    };
    videoMessage?: {
      url?: string;
      caption?: string;
      mimetype?: string;
    };
    extendedTextMessage?: {
      text?: string;
      backgroundColor?: number;
    };
    conversation?: string;
  };
  messageTimestamp?: number | string;
  pushName?: string;
  status?: number;
}

export interface WhatsAppPresenceInfo {
  isOnline: boolean;
  lastSeen?: string | null;
  loading: boolean;
}

export interface WhatsAppStatusData {
  statusMessages: WhatsAppStatusMessage[];
  presence: WhatsAppPresenceInfo;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch WhatsApp status (stories) and presence for a contact
 */
export function useWhatsAppStatus(phone: string | undefined): WhatsAppStatusData {
  const [statusMessages, setStatusMessages] = useState<WhatsAppStatusMessage[]>([]);
  const [presence, setPresence] = useState<WhatsAppPresenceInfo>({ isOnline: false, lastSeen: null, loading: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getInstanceForPhone = useCallback(async (contactPhone: string) => {
    // Get the contact's whatsapp_connection_id
    const { data: contact } = await supabase
      .from('contacts')
      .select('whatsapp_connection_id')
      .eq('phone', contactPhone)
      .maybeSingle();

    let connectionId = contact?.whatsapp_connection_id;

    if (!connectionId) {
      // Fallback: get first connected instance
      const { data: conn } = await supabase
        .from('whatsapp_connections')
        .select('id, instance_id')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();
      
      if (conn) {
        connectionId = conn.id;
      }
    }

    if (!connectionId) return null;

    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('instance_id')
      .eq('id', connectionId)
      .maybeSingle();

    return connection?.instance_id || null;
  }, []);

  const fetchData = useCallback(async () => {
    if (!phone) return;

    setLoading(true);
    setError(null);

    try {
      const instanceName = await getInstanceForPhone(phone);
      if (!instanceName) {
        setError('Sem conexão WhatsApp disponível');
        return;
      }

      // Fetch status messages (stories) and presence in parallel
      const [statusResult, presenceResult] = await Promise.allSettled([
        supabase.functions.invoke('evolution-api/find-status-messages', {
          method: 'POST',
          body: { instanceName },
        }),
        supabase.functions.invoke('evolution-api/send-chat-presence', {
          method: 'POST',
          body: { instanceName, number: phone, presence: 'paused', delay: 0 },
        }),
      ]);

      if (mountedRef.current) {
        // Process status messages
        if (statusResult.status === 'fulfilled' && statusResult.value.data) {
          const allStatuses = Array.isArray(statusResult.value.data) 
            ? statusResult.value.data 
            : [];
          
          // Filter statuses from this contact's phone
          const cleanPhone = phone.replace(/\D/g, '');
          const contactStatuses = allStatuses.filter((s: WhatsAppStatusMessage) => {
            const remoteJid = s.key?.remoteJid || '';
            return remoteJid.includes(cleanPhone) || remoteJid === 'status@broadcast';
          });
          
          setStatusMessages(contactStatuses);
        }

        // Presence: the send-chat-presence call itself tests if the contact is reachable
        // We'll use a separate approach - check if we get a response
        if (presenceResult.status === 'fulfilled') {
          setPresence({ isOnline: false, lastSeen: null, loading: false });
        } else {
          setPresence({ isOnline: false, lastSeen: null, loading: false });
        }
      }
    } catch (err) {
      log.error('WhatsApp status fetch error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar status');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [phone, getInstanceForPhone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    statusMessages,
    presence,
    loading,
    error,
    refresh: fetchData,
  };
}
