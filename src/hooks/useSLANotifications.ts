import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SLABreachPayload {
  id: string;
  contact_id: string;
  first_response_breached: boolean;
  resolution_breached: boolean;
  first_message_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
}

export const useSLANotifications = () => {
  const { user } = useAuth();
  const notifiedBreaches = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    console.log('[SLA Notifications] Setting up realtime subscription');

    const channel = supabase
      .channel('sla-breaches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_sla',
        },
        async (payload) => {
          const newRecord = payload.new as SLABreachPayload;
          const oldRecord = payload.old as Partial<SLABreachPayload>;

          console.log('[SLA Notifications] Received update:', { newRecord, oldRecord });

          // Check for new first response breach
          if (newRecord.first_response_breached && !oldRecord.first_response_breached) {
            const breachKey = `fr-${newRecord.id}`;
            if (!notifiedBreaches.current.has(breachKey)) {
              notifiedBreaches.current.add(breachKey);
              
              // Fetch contact info
              const { data: contact } = await supabase
                .from('contacts')
                .select('name, phone')
                .eq('id', newRecord.contact_id)
                .maybeSingle();

              toast({
                title: '⚠️ SLA de Primeira Resposta Violado',
                description: contact 
                  ? `O contato ${contact.name || contact.phone} não recebeu resposta no prazo.`
                  : 'Um contato não recebeu resposta dentro do prazo de SLA.',
                variant: 'destructive',
              });
            }
          }

          // Check for new resolution breach
          if (newRecord.resolution_breached && !oldRecord.resolution_breached) {
            const breachKey = `res-${newRecord.id}`;
            if (!notifiedBreaches.current.has(breachKey)) {
              notifiedBreaches.current.add(breachKey);
              
              // Fetch contact info
              const { data: contact } = await supabase
                .from('contacts')
                .select('name, phone')
                .eq('id', newRecord.contact_id)
                .maybeSingle();

              toast({
                title: '🚨 SLA de Resolução Violado',
                description: contact 
                  ? `O atendimento do contato ${contact.name || contact.phone} excedeu o tempo de resolução.`
                  : 'Um atendimento excedeu o tempo de resolução de SLA.',
                variant: 'destructive',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_sla',
        },
        async (payload) => {
          const newRecord = payload.new as SLABreachPayload;
          
          console.log('[SLA Notifications] New SLA record:', newRecord);

          // Check if already breached on insert
          if (newRecord.first_response_breached) {
            const breachKey = `fr-${newRecord.id}`;
            if (!notifiedBreaches.current.has(breachKey)) {
              notifiedBreaches.current.add(breachKey);
              
              const { data: contact } = await supabase
                .from('contacts')
                .select('name, phone')
                .eq('id', newRecord.contact_id)
                .maybeSingle();

              toast({
                title: '⚠️ SLA de Primeira Resposta Violado',
                description: contact 
                  ? `O contato ${contact.name || contact.phone} não recebeu resposta no prazo.`
                  : 'Um contato não recebeu resposta dentro do prazo de SLA.',
                variant: 'destructive',
              });
            }
          }

          if (newRecord.resolution_breached) {
            const breachKey = `res-${newRecord.id}`;
            if (!notifiedBreaches.current.has(breachKey)) {
              notifiedBreaches.current.add(breachKey);
              
              const { data: contact } = await supabase
                .from('contacts')
                .select('name, phone')
                .eq('id', newRecord.contact_id)
                .maybeSingle();

              toast({
                title: '🚨 SLA de Resolução Violado',
                description: contact 
                  ? `O atendimento do contato ${contact.name || contact.phone} excedeu o tempo de resolução.`
                  : 'Um atendimento excedeu o tempo de resolução de SLA.',
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[SLA Notifications] Subscription status:', status);
      });

    return () => {
      console.log('[SLA Notifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);
};
