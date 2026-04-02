import { useState, useCallback, useRef, useEffect } from 'react';
import { VoipEngine, type VoipCallState, type VoipCallStatus } from '@/lib/voip/VoipEngine';
import { CallSignaling, type CallSignalEvent } from '@/lib/voip/CallSignaling';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface ActiveCallState {
  id: string;
  dbCallId: string | null;
  direction: 'inbound' | 'outbound';
  peerPhone: string;
  peerName: string | null;
  peerAvatar: string | null;
  status: VoipCallStatus;
  isMuted: boolean;
  isPeerMuted: boolean;
  startedAt: number;
  answeredAt: number | null;
  connectionId: string | null;
}

export interface WhatsAppConnection {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
}

function mapCallState(state: VoipCallState): ActiveCallState {
  return {
    id: state.id,
    dbCallId: state.dbCallId,
    direction: state.direction,
    peerPhone: state.peer.phone,
    peerName: state.peer.name,
    peerAvatar: state.peer.avatar,
    status: state.status,
    isMuted: state.isMuted,
    isPeerMuted: state.isPeerMuted,
    startedAt: state.startedAt,
    answeredAt: state.answeredAt,
    connectionId: state.connectionId,
  };
}

export function useVoipEngine() {
  const engineRef = useRef<VoipEngine | null>(null);
  const signalingRef = useRef<CallSignaling | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<{
    id: string;
    dbCallId: string;
    peerPhone: string;
    peerName: string | null;
    peerAvatar: string | null;
    connectionId: string | null;
  } | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Initialize engine
  const initialize = useCallback((agentId: string) => {
    if (engineRef.current) return;

    const engine = new VoipEngine({
      onCallStateChange: (state) => {
        setActiveCall(state ? mapCallState(state) : null);
      },
      onIncomingCall: (call) => {
        setIncomingOffer({
          id: call.id,
          dbCallId: call.dbCallId || '',
          peerPhone: call.peer.phone,
          peerName: call.peer.name,
          peerAvatar: call.peer.avatar,
          connectionId: call.connectionId,
        });
      },
      onError: (error) => {
        log.error('[VoipEngine] Error:', error);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
    });

    const signaling = new CallSignaling({
      agentId,
      onIncomingCall: (event: CallSignalEvent) => {
        if (event.type === 'incoming') {
          engine.handleIncomingCall({
            callId: event.callId,
            dbCallId: event.callId,
            phone: event.contactPhone || 'Desconhecido',
            connectionId: event.connectionId || undefined,
            isVideo: event.isVideo,
          });
        }
      },
      onCallStatusUpdate: (event: CallSignalEvent) => {
        const statusMap: Record<string, VoipCallStatus> = {
          answered: 'active',
          ended: 'ended',
          missed: 'missed',
          rejected: 'rejected',
          busy: 'busy',
        };
        const mapped = statusMap[event.type];
        if (mapped) {
          engine.updateCallStatus(mapped);
        }
      },
    });

    signaling.startListening();
    engineRef.current = engine;
    signalingRef.current = signaling;
    setIsReady(true);

    log.info('[useVoipEngine] Initialized with agentId:', agentId);
  }, []);

  // Destroy engine
  const destroy = useCallback(() => {
    engineRef.current?.destroy();
    signalingRef.current?.destroy();
    engineRef.current = null;
    signalingRef.current = null;
    setIsReady(false);
    setActiveCall(null);
    setIncomingOffer(null);
    setAudioLevel(0);
  }, []);

  // Fetch WhatsApp connections available for calling
  const fetchConnections = useCallback(async (): Promise<WhatsAppConnection[]> => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('id, instance_name, phone_number, status')
        .eq('status', 'connected');

      if (error) throw error;
      const conns = (data || []) as WhatsAppConnection[];
      setConnections(conns);
      if (conns.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(conns[0].id);
      }
      return conns;
    } catch {
      return [];
    }
  }, [selectedConnectionId]);

  // Start outgoing call
  const startCall = useCallback(async (
    phone: string,
    contactId?: string,
    contactName?: string,
    contactAvatar?: string,
  ): Promise<boolean> => {
    const engine = engineRef.current;
    const signaling = signalingRef.current;
    if (!engine || !signaling) {
      log.error('[useVoipEngine] Not initialized');
      return false;
    }

    // Find the selected connection's instance name
    const connection = connections.find(c => c.id === selectedConnectionId);
    if (!connection) {
      log.error('[useVoipEngine] No WhatsApp connection selected');
      return false;
    }

    // Initiate call in engine (captures audio, sets ringing state)
    const call = await engine.initiateCall({
      phone,
      contactName,
      contactId,
      contactAvatar,
      connectionId: connection.id,
    });

    if (!call) return false;

    // Send offer via Edge Function → Evolution API
    const result = await signaling.sendCallAction('offer', {
      instanceName: connection.instance_name,
      number: phone,
      isVideo: false,
    });

    if (!result.success) {
      engine.updateCallStatus('failed');
      return false;
    }

    // Store the DB call ID from the edge function response
    const dbCallId = (result as Record<string, unknown>).callId as string;
    if (dbCallId) {
      engine.setDbCallId(dbCallId);
    }

    return true;
  }, [connections, selectedConnectionId]);

  // Accept incoming call
  const acceptCall = useCallback(async (): Promise<boolean> => {
    const engine = engineRef.current;
    const signaling = signalingRef.current;
    if (!engine || !signaling || !incomingOffer) return false;

    const success = await engine.acceptCall();
    if (!success) return false;

    // Notify backend
    await signaling.sendCallAction('accept', {
      instanceName: '', // Backend uses callId
    });

    setIncomingOffer(null);
    return true;
  }, [incomingOffer]);

  // Reject incoming call
  const rejectCall = useCallback(async (): Promise<boolean> => {
    const engine = engineRef.current;
    const signaling = signalingRef.current;
    if (!engine || !signaling || !incomingOffer) return false;

    engine.rejectCall();

    await signaling.sendCallAction('reject', {
      instanceName: '',
    });

    setIncomingOffer(null);
    return true;
  }, [incomingOffer]);

  // End active call
  const endActiveCall = useCallback(async (): Promise<boolean> => {
    const engine = engineRef.current;
    const signaling = signalingRef.current;
    if (!engine || !signaling) return false;

    const currentCall = engine.getCurrentCall();
    if (!currentCall) return false;

    const duration = engine.getCallDuration();
    engine.endCall();

    await signaling.sendCallAction('end', {
      instanceName: '',
    });

    return true;
  }, []);

  // Toggle mute
  const toggleMute = useCallback((): boolean => {
    const engine = engineRef.current;
    if (!engine) return false;

    const currentCall = engine.getCurrentCall();
    if (!currentCall) return false;

    engine.setMuted(!currentCall.isMuted);
    return true;
  }, []);

  // Get call duration
  const getCallDuration = useCallback((): number => {
    return engineRef.current?.getCallDuration() || 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    // State
    isReady,
    activeCall,
    incomingOffer,
    audioLevel,
    connections,
    selectedConnectionId,

    // Actions
    initialize,
    destroy,
    startCall,
    acceptCall,
    rejectCall,
    endActiveCall,
    toggleMute,
    getCallDuration,
    fetchConnections,
    setSelectedConnectionId,
  };
}
