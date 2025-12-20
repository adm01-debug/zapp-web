import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  oderId: string;
  name: string;
  isTyping: boolean;
  lastTyped: string;
}

interface UseTypingPresenceProps {
  conversationId: string;
  currentUserId?: string;
  currentUserName?: string;
}

export function useTypingPresence({
  conversationId,
  currentUserId = 'agent',
  currentUserName = 'Agente'
}: UseTypingPresenceProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track current user typing
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current) return;

    try {
      await channelRef.current.track({
        oderId: currentUserId,
        name: currentUserName,
        isTyping,
        lastTyped: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking typing status:', error);
    }
  }, [currentUserId, currentUserName]);

  // Debounced typing indicator - call when user is typing
  const handleTypingStart = useCallback(() => {
    setTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing immediately
  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  useEffect(() => {
    if (!conversationId) return;

    // Create presence channel for this conversation
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: TypingUser[] = [];

      Object.entries(state).forEach(([key, presences]) => {
        if (key !== currentUserId && Array.isArray(presences)) {
          presences.forEach((presence: any) => {
            if (presence.isTyping) {
              users.push({
                oderId: presence.oderId || key,
                name: presence.name || 'Contato',
                isTyping: presence.isTyping,
                lastTyped: presence.lastTyped
              });
            }
          });
        }
      });

      setTypingUsers(users);
      setIsContactTyping(users.length > 0);
    });

    // Handle join event
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined typing channel:', key, newPresences);
    });

    // Handle leave event
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left typing channel:', key, leftPresences);
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to typing presence for conversation:', conversationId);
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  return {
    isContactTyping,
    typingUsers,
    handleTypingStart,
    handleTypingStop
  };
}
