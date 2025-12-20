import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/utils/notificationSound';

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

      // Fetch all messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Group messages by contact
      const conversationsMap = new Map<string, ConversationWithMessages>();

      contacts?.forEach((contact) => {
        const contactMessages = (messages?.filter((m) => m.contact_id === contact.id) || []).map((m) => ({
          ...m,
          status: (m as unknown as { status?: string }).status as RealtimeMessage['status'] || 'sent',
          status_updated_at: (m as unknown as { status_updated_at?: string }).status_updated_at || null,
        }));
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
      console.error('Error fetching conversations:', err);
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
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, handleNewMessage, handleMessageUpdate]);

  // Send a message
  const sendMessage = async (
    contactId: string,
    content: string,
    messageType: string = 'text',
    mediaUrl?: string
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
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
      console.error('Error marking messages as read:', error);
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
