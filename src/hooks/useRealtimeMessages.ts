import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/utils/notificationSounds';
import { getLogger } from '@/lib/logger';

const log = getLogger('RealtimeMessages');

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
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | null;
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
  created_at: string;
  updated_at: string;
  whatsapp_connection_id: string | null;
}

export interface ConversationWithMessages {
  contact: ConversationContact;
  messages: RealtimeMessage[];
  unreadCount: number;
  lastMessage: RealtimeMessage | null;
}

export function useRealtimeMessages() {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessageNotification, setNewMessageNotification] = useState<NewMessageNotification | null>(null);
  const selectedContactIdRef = useRef<string | null>(null);
  const soundEnabledRef = useRef(true);

  // Fetch initial data
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch contacts with their messages
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Fetch recent messages (last 50 per contact, up to 5000 total)
      // Note: Supabase default row limit is 1000. Fetch in batches if needed.
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (messagesError) throw messagesError;

      // Group messages by contact
      const conversationsMap = new Map<string, ConversationWithMessages>();

      contacts?.forEach((contact) => {
        const contactMessages = (messages?.filter((m) => m.contact_id === contact.id) || []).map((m) => ({
          ...m,
          status: (m.status as RealtimeMessage['status']) || 'sent',
          status_updated_at: m.status_updated_at || null,
        }));
        // Sort ascending (oldest first) for display since we fetched desc
        contactMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const unreadCount = contactMessages.filter((m) => !m.is_read && m.sender === 'contact').length;
        const lastMessage = contactMessages.length > 0 ? contactMessages[contactMessages.length - 1] : null;

        conversationsMap.set(contact.id, {
          contact,
          messages: contactMessages,
          unreadCount,
          lastMessage,
        });
      });

      // Sort by last message timestamp
      const sortedConversations = Array.from(conversationsMap.values()).sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.contact.created_at;
        const bTime = b.lastMessage?.created_at || b.contact.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(sortedConversations);
    } catch (err) {
      log.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new message
  const handleNewMessage = useCallback((payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
    const newMessage = payload.new as RealtimeMessage;
    
    setConversations((prev) => {
      const updated = [...prev];
      const conversationIndex = updated.findIndex((c) => c.contact.id === newMessage.contact_id);

      if (conversationIndex >= 0) {
        const conversation = { ...updated[conversationIndex] };
        conversation.messages = [...conversation.messages, newMessage];
        conversation.lastMessage = newMessage;
        
        if (newMessage.sender === 'contact' && !newMessage.is_read) {
          conversation.unreadCount += 1;
          
          // Show notification only if not viewing this conversation
          if (selectedContactIdRef.current !== newMessage.contact_id) {
            // Play sound
            if (soundEnabledRef.current) {
              playNotificationSound('message');
            }
            
            // Show browser notification
            showBrowserNotification(
              `Nova mensagem de ${conversation.contact.name}`,
              newMessage.content,
              conversation.contact.avatar_url || undefined
            );
            
            // Set in-app notification
            setNewMessageNotification({
              id: newMessage.id,
              contactId: conversation.contact.id,
              contactName: conversation.contact.name,
              contactAvatar: conversation.contact.avatar_url,
              message: newMessage.content,
              timestamp: new Date(),
            });
          }
        }

        // Move to top
        updated.splice(conversationIndex, 1);
        updated.unshift(conversation);
      }

      return updated;
    });
  }, []);

  // Handle message update (e.g., read status)
  const handleMessageUpdate = useCallback((payload: RealtimePostgresChangesPayload<RealtimeMessage>) => {
    const updatedMessage = payload.new as RealtimeMessage;

    setConversations((prev) => {
      return prev.map((conversation) => {
        if (conversation.contact.id !== updatedMessage.contact_id) {
          return conversation;
        }

        const updatedMessages = conversation.messages.map((m) =>
          m.id === updatedMessage.id ? updatedMessage : m
        );

        const unreadCount = updatedMessages.filter(
          (m) => !m.is_read && m.sender === 'contact'
        ).length;

        return {
          ...conversation,
          messages: updatedMessages,
          unreadCount,
          lastMessage: updatedMessages[updatedMessages.length - 1] || null,
        };
      });
    });
  }, []);

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
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          log.warn('Realtime channel error, attempting reconnect...', { status });
          setTimeout(() => {
            supabase.removeChannel(channel);
            channel.subscribe();
          }, 5000);
        }
      });

    return () => {
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      }).catch(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchConversations, handleNewMessage, handleMessageUpdate]);

  // Send a message (saves to DB + sends via Evolution API)
  const sendMessage = async (
    contactId: string,
    content: string,
    messageType: string = 'text',
    mediaUrl?: string
  ) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profileError) {
      log.error('Error fetching agent profile:', profileError);
    }

    // 1. Insert message into DB (optimistic)
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

    // 2. Get contact phone + connection instance for Evolution API
    try {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('phone, whatsapp_connection_id')
        .eq('id', contactId)
        .single();

      if (contactError) {
        log.error('Error fetching contact for message send:', contactError);
      }

      if (contact?.whatsapp_connection_id) {
        const { data: connection, error: connectionError } = await supabase
          .from('whatsapp_connections')
          .select('instance_id, status')
          .eq('id', contact.whatsapp_connection_id)
          .single();

        if (connectionError) {
          log.error('Error fetching WhatsApp connection:', connectionError);
        }

        if (connection?.instance_id && connection.status === 'connected') {
          const phone = contact.phone.replace(/\D/g, '');
          let evolutionAction = 'send-text';
          let evolutionBody: Record<string, unknown> = {
            instanceName: connection.instance_id,
            number: phone,
            text: content,
          };

          // Handle different message types
          if (messageType === 'image' && mediaUrl) {
            evolutionAction = 'send-media';
            evolutionBody = {
              instanceName: connection.instance_id,
              number: phone,
              mediatype: 'image',
              media: mediaUrl,
              caption: content !== '[Imagem]' ? content : undefined,
            };
          } else if (messageType === 'audio' && mediaUrl) {
            evolutionAction = 'send-audio';
            evolutionBody = {
              instanceName: connection.instance_id,
              number: phone,
              mediaUrl,
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

          // Call Evolution API via edge function
          const { data: apiResult, error: apiError } = await supabase.functions.invoke(
            `evolution-api/${evolutionAction}`,
            { body: evolutionBody }
          );

          if (apiError) {
            log.error('Evolution API send error:', apiError);
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ status: 'failed' })
              .eq('id', data.id);
          } else {
            // Update message with external_id and status
            const externalId = apiResult?.key?.id || apiResult?.messageId || null;
            await supabase
              .from('messages')
              .update({
                status: 'sent',
                external_id: externalId,
              })
              .eq('id', data.id);
          }
        } else {
          log.warn('WhatsApp connection not active, message saved locally only');
          // Mark as sent (local only, no WhatsApp delivery)
          await supabase
            .from('messages')
            .update({ status: 'sent' })
            .eq('id', data.id);
        }
      } else {
        // No connection - mark as sent locally
        await supabase
          .from('messages')
          .update({ status: 'sent' })
          .eq('id', data.id);
      }
    } catch (evolutionError) {
      log.error('Error sending via Evolution API:', evolutionError);
      // Don't throw - message is already saved in DB
      await supabase
        .from('messages')
        .update({ status: 'failed' })
        .eq('id', data.id);
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

    // Update local state
    setConversations((prev) =>
      prev.map((c) =>
        c.contact.id === contactId
          ? {
              ...c,
              unreadCount: 0,
              messages: c.messages.map((m) => ({ ...m, is_read: true })),
            }
          : c
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
