import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { useNotificationSettings } from './useNotificationSettings';
import { getLogger } from '@/lib/logger';

const log = getLogger('PushBridge');

/**
 * Bridge between Supabase Realtime message events and browser Push Notifications.
 * When the app is in background (document.hidden), shows a push notification
 * for each incoming contact message.
 */
export function useRealtimePushBridge() {
  const { showNotification, isSubscribed, permission } = usePushNotifications();
  const { settings: notifSettings, isQuietHours } = useNotificationSettings();
  const activeConversationRef = useRef<string | null>(null);

  // Allow external code to set which conversation is currently active
  const setActiveConversation = (contactId: string | null) => {
    activeConversationRef.current = contactId;
  };

  useEffect(() => {
    // Respect app notification settings — also check isSubscribed so toggling off actually stops notifications
    if (permission !== 'granted' || !isSubscribed || !notifSettings.browserNotifications || isQuietHours()) return;

    const channel = supabase
      .channel('push-bridge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'sender=eq.contact' },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            contact_id: string;
            content: string;
            message_type: string;
            created_at: string;
          };

          // Don't notify if user is viewing this conversation
          if (!document.hidden && activeConversationRef.current === msg.contact_id) {
            return;
          }

          // Fetch contact name
          let contactName = 'Novo contato';
          try {
            const { data } = await supabase
              .from('contacts')
              .select('name')
              .eq('id', msg.contact_id)
              .single();
            if (data) contactName = data.name;
          } catch {
            // ignore
          }

          const body = msg.message_type === 'text'
            ? msg.content.slice(0, 100)
            : msg.message_type === 'audio'
              ? '🎤 Mensagem de áudio'
              : msg.message_type === 'image'
                ? '📷 Imagem'
                : msg.message_type === 'video'
                  ? '🎥 Vídeo'
                  : msg.message_type === 'document'
                    ? '📎 Documento'
                    : msg.content.slice(0, 100);

          await showNotification({
            title: contactName,
            body,
            tag: `msg-${msg.contact_id}`,
            data: {
              conversationId: msg.contact_id,
              messageId: msg.id,
            },
            requireInteraction: false,
          });

          log.debug('Push notification sent for message:', msg.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permission, showNotification, notifSettings.browserNotifications, isQuietHours]);

  return { setActiveConversation };
}
