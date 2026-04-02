/**
 * CallSignaling — Sinalização de chamadas via Supabase Realtime
 *
 * Usa Supabase Realtime para:
 * 1. Escutar INSERTs/UPDATEs na tabela `calls` (chamadas recebidas + atualizações)
 * 2. Broadcasts em canal dedicado para sinalização em tempo real
 *
 * Isso substitui o WebSocket do Wavoip com nossa própria infraestrutura.
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

export interface CallSignalEvent {
  type: 'incoming' | 'status_update' | 'answered' | 'ended' | 'missed' | 'rejected' | 'busy';
  callId: string;
  contactId: string | null;
  contactPhone: string | null;
  connectionId: string | null;
  direction: string;
  status: string;
  isVideo: boolean;
  timestamp: string;
}

export interface CallSignalingConfig {
  agentId: string;
  onIncomingCall: (event: CallSignalEvent) => void;
  onCallStatusUpdate: (event: CallSignalEvent) => void;
}

export class CallSignaling {
  private config: CallSignalingConfig;
  private callsChannel: RealtimeChannel | null = null;
  private isListening = false;

  constructor(config: CallSignalingConfig) {
    this.config = config;
  }

  /** Start listening for call events via Supabase Realtime */
  startListening(): void {
    if (this.isListening) return;

    // Listen to INSERT/UPDATE on calls table for real-time call events
    this.callsChannel = supabase
      .channel('voip-calls-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `direction=eq.inbound`,
        },
        (payload) => {
          this.handleCallInsert(payload.new as Record<string, unknown>);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
        },
        (payload) => {
          this.handleCallUpdate(payload.new as Record<string, unknown>);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isListening = true;
          log.info('[CallSignaling] Listening for call events');
        }
      });
  }

  /** Stop listening for call events */
  stopListening(): void {
    if (this.callsChannel) {
      supabase.removeChannel(this.callsChannel);
      this.callsChannel = null;
    }
    this.isListening = false;
    log.info('[CallSignaling] Stopped listening');
  }

  /** Send a call action via Edge Function → Evolution API */
  async sendCallAction(action: 'offer' | 'accept' | 'reject' | 'end', params: {
    instanceName: string;
    number?: string;
    isVideo?: boolean;
    callDuration?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('voip-call', {
        body: {
          action,
          ...params,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ...(data || {}) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  }

  // =========================================
  // INTERNAL EVENT HANDLERS
  // =========================================

  private handleCallInsert(row: Record<string, unknown>): void {
    const event: CallSignalEvent = {
      type: 'incoming',
      callId: row.id as string,
      contactId: row.contact_id as string | null,
      contactPhone: null, // Will be resolved by the consumer
      connectionId: row.whatsapp_connection_id as string | null,
      direction: row.direction as string,
      status: row.status as string,
      isVideo: (row.notes as string)?.includes('vídeo') || false,
      timestamp: row.created_at as string,
    };

    if (row.direction === 'inbound' && row.status === 'ringing') {
      this.config.onIncomingCall(event);
    }
  }

  private handleCallUpdate(row: Record<string, unknown>): void {
    const status = row.status as string;
    const typeMap: Record<string, CallSignalEvent['type']> = {
      'answered': 'answered',
      'ended': 'ended',
      'missed': 'missed',
      'busy': 'busy',
      'failed': 'rejected',
    };

    const event: CallSignalEvent = {
      type: typeMap[status] || 'status_update',
      callId: row.id as string,
      contactId: row.contact_id as string | null,
      contactPhone: null,
      connectionId: row.whatsapp_connection_id as string | null,
      direction: row.direction as string,
      status,
      isVideo: (row.notes as string)?.includes('vídeo') || false,
      timestamp: row.updated_at as string || new Date().toISOString(),
    };

    this.config.onCallStatusUpdate(event);
  }

  /** Check if currently listening */
  getIsListening(): boolean {
    return this.isListening;
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.stopListening();
  }
}
