import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  status_updated_at: string;
}

export const useMessageStatus = (contactId?: string) => {
  const [statusUpdates, setStatusUpdates] = useState<Map<string, MessageStatusUpdate>>(new Map());

  useEffect(() => {
    if (!contactId) return;

    console.log('Setting up realtime status subscription for contact:', contactId);

    const channel = supabase
      .channel(`message-status-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          console.log('Message status update received:', payload);
          const newData = payload.new as MessageStatusUpdate;
          
          if (newData.status) {
            setStatusUpdates((prev) => {
              const updated = new Map(prev);
              updated.set(newData.id, {
                id: newData.id,
                status: newData.status,
                status_updated_at: newData.status_updated_at,
              });
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Status subscription status:', status);
      });

    return () => {
      console.log('Cleaning up status subscription');
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  const getMessageStatus = useCallback(
    (messageId: string): 'sent' | 'delivered' | 'read' | 'failed' | undefined => {
      return statusUpdates.get(messageId)?.status;
    },
    [statusUpdates]
  );

  const updateLocalStatus = useCallback(
    (messageId: string, status: 'sent' | 'delivered' | 'read' | 'failed') => {
      setStatusUpdates((prev) => {
        const updated = new Map(prev);
        updated.set(messageId, {
          id: messageId,
          status,
          status_updated_at: new Date().toISOString(),
        });
        return updated;
      });
    },
    []
  );

  return {
    statusUpdates,
    getMessageStatus,
    updateLocalStatus,
  };
};
