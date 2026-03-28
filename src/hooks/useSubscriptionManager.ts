import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('SubscriptionManager');

interface SubscriptionConfig {
  channelName: string;
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Manages multiple Supabase realtime subscriptions efficiently.
 * - Deduplicates channels by name
 * - Handles reconnection with exponential backoff
 * - Cleans up all subscriptions on unmount
 * - Limits max concurrent channels
 */
export function useSubscriptionManager(maxChannels = 10) {
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const subscribe = useCallback((config: SubscriptionConfig) => {
    const { channelName, table, schema = 'public', event = '*', filter, callback } = config;

    // Don't create duplicate channels
    if (channelsRef.current.has(channelName)) {
      log.debug(`Channel ${channelName} already exists, skipping`);
      return;
    }

    // Enforce max channels limit
    if (channelsRef.current.size >= maxChannels) {
      log.warn(`Max channels (${maxChannels}) reached. Removing oldest channel.`);
      const oldestKey = channelsRef.current.keys().next().value;
      if (oldestKey) {
        unsubscribe(oldestKey);
      }
    }

    const channelConfig: Record<string, string> = {
      event,
      schema,
      table,
    };
    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, callback)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          log.debug(`Channel ${channelName} subscribed`);
        } else if (status === 'CHANNEL_ERROR') {
          log.warn(`Channel ${channelName} error, scheduling reconnect`);
          scheduleReconnect(channelName, config);
        } else if (status === 'TIMED_OUT') {
          log.warn(`Channel ${channelName} timed out, scheduling reconnect`);
          scheduleReconnect(channelName, config);
        }
      });

    channelsRef.current.set(channelName, channel);
  }, []);

  const unsubscribe = useCallback((channelName: string) => {
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    }

    const timer = reconnectTimersRef.current.get(channelName);
    if (timer) {
      clearTimeout(timer);
      reconnectTimersRef.current.delete(channelName);
    }
  }, []);

  const scheduleReconnect = useCallback((channelName: string, config: SubscriptionConfig, attempt = 0) => {
    // Clear existing timer
    const existingTimer = reconnectTimersRef.current.get(channelName);
    if (existingTimer) clearTimeout(existingTimer);

    // Max 5 reconnect attempts
    if (attempt >= 5) {
      log.error(`Channel ${channelName} failed after ${attempt} reconnect attempts`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    const timer = setTimeout(() => {
      // Remove old channel first
      const oldChannel = channelsRef.current.get(channelName);
      if (oldChannel) {
        supabase.removeChannel(oldChannel);
        channelsRef.current.delete(channelName);
      }
      // Re-subscribe
      subscribe(config);
    }, delay);

    reconnectTimersRef.current.set(channelName, timer);
  }, [subscribe]);

  const unsubscribeAll = useCallback(() => {
    for (const [name] of channelsRef.current) {
      unsubscribe(name);
    }
  }, [unsubscribe]);

  const getActiveCount = useCallback(() => {
    return channelsRef.current.size;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const [, channel] of channelsRef.current) {
        supabase.removeChannel(channel);
      }
      channelsRef.current.clear();
      for (const [, timer] of reconnectTimersRef.current) {
        clearTimeout(timer);
      }
      reconnectTimersRef.current.clear();
    };
  }, []);

  return { subscribe, unsubscribe, unsubscribeAll, getActiveCount };
}
