import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/utils/notificationSound';
import { getLogger } from '@/lib/logger';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

const log = getLogger('RealtimeMessages');
const SEEDED_CONTACT_LIMIT = 500;
const RECENT_MESSAGES_LIMIT = 1000;
const CONTACT_FETCH_CHUNK_SIZE = 200;

export interface NewMessageNotification {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string | null;
  message: string;
  timestamp: Date;
}

export interface RealtimeMessage {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  content: string;
  sender: string;
  message_type: string;
  media_url: string | null;
  is_read: boolean | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  whatsapp_connection_id: string | null;
  transcription: string | null;
  transcription_status: string | null;
}

export interface ConversationContact {
  id: string;
  name: string;
  surname: string | null;
  nickname: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  tags: string[] | null;
  company: string | null;
  job_title: string | null;
  assigned_to: string | null;
  queue_id: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_connection_id: string | null;
  contact_type: string | null;
  group_category: string | null;
  ai_sentiment: string | null;
}

export interface ConversationWithMessages {
  contact: ConversationContact;
  messages: RealtimeMessage[];
  unreadCount: number;
  lastMessage: RealtimeMessage | null;
}

function normalizeMessage(message: RealtimeMessage): RealtimeMessage {
  return {
    ...message,
    status: message.status ?? 'sent',
    status_updated_at: message.status_updated_at ?? null,
  };
}

function sortMessagesByCreatedAt(messages: RealtimeMessage[]): RealtimeMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function buildConversation(
  contact: ConversationContact,
  messages: RealtimeMessage[]
): ConversationWithMessages {
  const sortedMessages = sortMessagesByCreatedAt(messages);
  const unreadCount = sortedMessages.filter(
    (message) => !message.is_read && message.sender === 'contact'
  ).length;
  const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;

  return {
    contact,
    messages: sortedMessages,
    unreadCount,
    lastMessage,
  };
}

function dedupeContacts(contacts: ConversationContact[]): ConversationContact[] {
  const contactsMap = new Map<string, ConversationContact>();

  contacts.forEach((contact) => {
    contactsMap.set(contact.id, contact);
  });

  return Array.from(contactsMap.values());
}

function getUniqueMessageContactIds(messages: RealtimeMessage[]): string[] {
  return Array.from(
    new Set(messages.map((message) => message.contact_id).filter((contactId): contactId is string => Boolean(contactId)))
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildConversations(
  contacts: ConversationContact[],
  messages: RealtimeMessage[]
): ConversationWithMessages[] {
  const messagesByContact = new Map<string, RealtimeMessage[]>();

  messages.forEach((message) => {
    if (!message.contact_id) return;

    const existing = messagesByContact.get(message.contact_id) ?? [];
    existing.push(message);
    messagesByContact.set(message.contact_id, existing);
  });

  return dedupeContacts(contacts)
    .map((contact) => buildConversation(contact, messagesByContact.get(contact.id) ?? []))
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.contact.created_at;
      const bTime = b.lastMessage?.created_at || b.contact.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

export function useRealtimeMessages() {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessageNotification, setNewMessageNotification] = useState<NewMessageNotification | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<ConversationWithMessages[]>([]);
  const { settings: notifSettings, isQuietHours } = useNotificationSettings();
  const soundEnabledRef = useRef(true);

  const commitConversations = useCallback(
    (
      updater:
        | ConversationWithMessages[]
        | ((prev: ConversationWithMessages[]) => ConversationWithMessages[])
    ) => {
      setConversations((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: ConversationWithMessages[]) => ConversationWithMessages[])(prev)
            : updater;

        conversationsRef.current = next;
        return next;
      });
    },
    []
  );

  const fetchContactsByIds = useCallback(async (contactIds: string[]) => {
    const uniqueIds = Array.from(new Set(contactIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return [] as ConversationContact[];
    }

    const fetchedContacts: ConversationContact[] = [];

    for (const idsChunk of chunkArray(uniqueIds, CONTACT_FETCH_CHUNK_SIZE)) {
      const { data, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', idsChunk);

      if (contactsError) throw contactsError;
      fetchedContacts.push(...((data ?? []) as ConversationContact[]));
    }

    return dedupeContacts(fetchedContacts);
  }, []);

  const notifyAboutIncomingMessage = useCallback(
    (contact: ConversationContact, message: RealtimeMessage) => {
      if (message.sender !== 'contact' || message.is_read || selectedContactIdRef.current === message.contact_id) {
        return;
      }

      // Respect global notification toggle — skip everything if disabled
      const notificationsActive = notifSettings.soundEnabled || notifSettings.browserNotifications;
      if (!notificationsActive && isQuietHours()) {
        return;
      }

      if (soundEnabledRef.current) {
        playNotificationSound('message');
      }

      if (notifSettings.browserNotifications && !isQuietHours()) {
        showBrowserNotification(
          `Nova mensagem de ${contact.name}`,
          message.content,
          contact.avatar_url || undefined
        );
      }

      // Only show in-app notification toast if notifications are enabled
      if (notificationsActive && !isQuietHours()) {
        setNewMessageNotification({
          id: message.id,
          contactId: contact.id,
          contactName: contact.name,
          contactAvatar: contact.avatar_url,
          message: message.content,
          timestamp: new Date(),
        });
      }
    },
    [notifSettings.soundEnabled, notifSettings.browserNotifications, isQuietHours]
  );

  const hydrateConversationForMessage = useCallback(
    async (message: RealtimeMessage) => {
      if (!message.contact_id) return;

      try {
        const [contact] = await fetchContactsByIds([message.contact_id]);

        if (!contact) {
          log.warn('Incoming message received for unknown contact', { contactId: message.contact_id });
          return;
        }

        commitConversations((prev) => {
          const conversationIndex = prev.findIndex((conversation) => conversation.contact.id === contact.id);

          if (conversationIndex >= 0) {
            const existingConversation = prev[conversationIndex];

            if (existingConversation.messages.some((existingMessage) => existingMessage.id === message.id)) {
              return prev;
            }

            const updatedConversation = buildConversation(contact, [
              ...existingConversation.messages,
              message,
            ]);
            const updated = [...prev];
            updated.splice(conversationIndex, 1);
            updated.unshift(updatedConversation);
            return updated;
          }

          return [buildConversation(contact, [message]), ...prev];
        });

        notifyAboutIncomingMessage(contact, message);
      } catch (hydrateError) {
        log.error('Error hydrating conversation for incoming message:', hydrateError);
      }
    },
    [commitConversations, fetchContactsByIds, notifyAboutIncomingMessage]
  );

  // Sync soundEnabledRef with global notification settings
  useEffect(() => {
    soundEnabledRef.current = notifSettings.soundEnabled && !isQuietHours();
  }, [notifSettings.soundEnabled, isQuietHours]);

  // Fetch initial data
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: seededContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(SEEDED_CONTACT_LIMIT);

      if (contactsError) throw contactsError;

      const { data: recentMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(RECENT_MESSAGES_LIMIT);

      if (messagesError) throw messagesError;

      const normalizedMessages = ((recentMessages ?? []) as RealtimeMessage[]).map(normalizeMessage);
      const seededContactRows = (seededContacts ?? []) as ConversationContact[];
      const seededContactIds = new Set(seededContactRows.map((contact) => contact.id));
      const missingContactIds = getUniqueMessageContactIds(normalizedMessages).filter(
        (contactId) => !seededContactIds.has(contactId)
      );
      const messageContacts = await fetchContactsByIds(missingContactIds);

      commitConversations(buildConversations([...seededContactRows, ...messageContacts], normalizedMessages));
    } catch (err) {
      log.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [commitConversations, fetchContactsByIds]);

  // Handle new message
  const handleNewMessage = useCallback(
    (payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
      const newMessage = normalizeMessage(payload.new as RealtimeMessage);

      if (!newMessage.contact_id) return;

      const existingConversation = conversationsRef.current.find(
        (conversation) => conversation.contact.id === newMessage.contact_id
      );

      if (!existingConversation) {
        void hydrateConversationForMessage(newMessage);
        return;
      }

      commitConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (conversation) => conversation.contact.id === newMessage.contact_id
        );

        if (conversationIndex < 0) return prev;

        const conversation = prev[conversationIndex];

        if (conversation.messages.some((message) => message.id === newMessage.id)) {
          return prev;
        }

        const updatedConversation = buildConversation(conversation.contact, [
          ...conversation.messages,
          newMessage,
        ]);
        const updated = [...prev];
        updated.splice(conversationIndex, 1);
        updated.unshift(updatedConversation);
        return updated;
      });

      notifyAboutIncomingMessage(existingConversation.contact, newMessage);
    },
    [commitConversations, hydrateConversationForMessage, notifyAboutIncomingMessage]
  );

  // Handle message update (e.g., read status)
  const handleMessageUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
      const updatedMessage = normalizeMessage(payload.new as RealtimeMessage);

      if (!updatedMessage.contact_id) return;

      const existingConversation = conversationsRef.current.find(
        (conversation) => conversation.contact.id === updatedMessage.contact_id
      );

      if (!existingConversation) {
        void hydrateConversationForMessage(updatedMessage);
        return;
      }

      commitConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (conversation) => conversation.contact.id === updatedMessage.contact_id
        );

        if (conversationIndex < 0) return prev;

        const conversation = prev[conversationIndex];
        const messageIndex = conversation.messages.findIndex(
          (message) => message.id === updatedMessage.id
        );

        if (messageIndex < 0) return prev;

        const updatedMessages = [...conversation.messages];
        updatedMessages[messageIndex] = updatedMessage;

        const updatedConversation = buildConversation(conversation.contact, updatedMessages);
        const updated = [...prev];
        updated[conversationIndex] = updatedConversation;
        return updated;
      });
    },
    [commitConversations, hydrateConversationForMessage]
  );

  // Subscribe to realtime updates
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        handleMessageUpdate
      )
      .subscribe((status) => {
        log.debug('Subscription status', { status });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, handleNewMessage, handleMessageUpdate]);

  // Send a message (saves to DB + sends via Evolution API)
  const sendMessage = async (
    contactId: string,
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    mediaPayload?: string
  ) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        contact_id: contactId,
        agent_id: profile?.id,
        content,
        sender: 'agent',
        message_type: messageType,
        media_url: mediaUrl || null,
        is_read: true,
        status: 'sending',
      })
      .select()
      .single();

    if (error) {
      log.error('Error saving message to DB:', error);
      throw error;
    }

    try {
      const { data: contact } = await supabase
        .from('contacts')
        .select('phone, whatsapp_connection_id')
        .eq('id', contactId)
        .single();

      let resolvedConnectionId = contact?.whatsapp_connection_id ?? null;
      let connection: { instance_id: string | null; status: string | null } | null = null;

      if (resolvedConnectionId) {
        const { data: linkedConnection } = await supabase
          .from('whatsapp_connections')
          .select('instance_id, status')
          .eq('id', resolvedConnectionId)
          .single();

        connection = linkedConnection;
      }

      if (!connection?.instance_id || connection.status !== 'connected') {
        const { data: fallbackConnection } = await supabase
          .from('whatsapp_connections')
          .select('id, instance_id, status')
          .eq('status', 'connected')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackConnection?.instance_id) {
          resolvedConnectionId = fallbackConnection.id;
          connection = {
            instance_id: fallbackConnection.instance_id,
            status: fallbackConnection.status,
          };
        }
      }

      if (connection?.instance_id && connection.status === 'connected') {
        const phone = contact?.phone?.replace(/\D/g, '');

        if (!phone) {
          throw new Error('Contato sem número de telefone válido');
        }

        let evolutionAction = 'send-text';
        let evolutionBody: Record<string, unknown> = {
          instanceName: connection.instance_id,
          number: phone,
          text: content,
        };

        if (messageType === 'image' && mediaUrl) {
          evolutionAction = 'send-media';
          evolutionBody = {
            instanceName: connection.instance_id,
            number: phone,
            mediatype: 'image',
            media: mediaUrl,
            caption: content !== '[Imagem]' ? content : undefined,
          };
        } else if (messageType === 'audio' && (mediaPayload || mediaUrl)) {
          evolutionAction = 'send-audio';
          evolutionBody = {
            instanceName: connection.instance_id,
            number: phone,
            audio: mediaUrl || mediaPayload,
            encoding: !mediaUrl && Boolean(mediaPayload),
          };
        } else if (messageType === 'video' && mediaUrl) {
          evolutionAction = 'send-media';
          evolutionBody = {
            instanceName: connection.instance_id,
            number: phone,
            mediatype: 'video',
            media: mediaUrl,
            caption: content !== '[Vídeo]' ? content : undefined,
          };
        } else if (messageType === 'document' && mediaUrl) {
          evolutionAction = 'send-media';
          evolutionBody = {
            instanceName: connection.instance_id,
            number: phone,
            mediatype: 'document',
            media: mediaUrl,
            fileName: content,
          };
        } else if (messageType === 'location') {
          try {
            const loc = JSON.parse(content);
            evolutionAction = 'send-location';
            evolutionBody = {
              instanceName: connection.instance_id,
              number: phone,
              latitude: loc.latitude,
              longitude: loc.longitude,
              name: loc.name || '',
              address: loc.address || '',
            };
          } catch {
            log.warn('Invalid location content, sending as text');
          }
        }

        const { data: apiResult, error: apiError } = await supabase.functions.invoke(
          `evolution-api/${evolutionAction}`,
          { body: evolutionBody }
        );

        if (apiError || apiResult?.error) {
          log.error('Evolution API send error:', apiError || apiResult);
          await supabase
            .from('messages')
            .update({ status: 'failed', whatsapp_connection_id: resolvedConnectionId })
            .eq('id', data.id);

          throw new Error(apiResult?.message || 'Falha ao enviar mensagem');
        }

        const externalId = apiResult?.key?.id || apiResult?.messageId || null;
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            external_id: externalId,
            whatsapp_connection_id: resolvedConnectionId,
          })
          .eq('id', data.id);
      } else {
        log.warn('WhatsApp connection not active, message marked as failed');
        await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('id', data.id);

        throw new Error('Nenhuma conexão WhatsApp ativa disponível');
      }
    } catch (evolutionError) {
      log.error('Error sending via Evolution API:', evolutionError);
      await supabase
        .from('messages')
        .update({ status: 'failed' })
        .eq('id', data.id);
      throw evolutionError;
    }

    return data;
  };

  // Mark messages as read
  const markAsRead = async (contactId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('contact_id', contactId)
      .eq('sender', 'contact')
      .eq('is_read', false);

    if (error) {
      log.error('Error marking messages as read:', error);
    }

    commitConversations((prev) =>
      prev.map((conversation) =>
        conversation.contact.id === contactId
          ? buildConversation(
              conversation.contact,
              conversation.messages.map((message) => ({ ...message, is_read: true }))
            )
          : conversation
      )
    );
  };

  // Dismiss notification
  const dismissNotification = useCallback(() => {
    setNewMessageNotification(null);
  }, []);

  // Set selected contact (to prevent notifications for viewed conversation)
  const setSelectedContact = useCallback((contactId: string | null) => {
    selectedContactIdRef.current = contactId;
  }, []);

  // Toggle sound
  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return {
    conversations,
    loading,
    error,
    sendMessage,
    markAsRead,
    refetch: fetchConversations,
    newMessageNotification,
    dismissNotification,
    setSelectedContact,
    setSoundEnabled,
  };
}
