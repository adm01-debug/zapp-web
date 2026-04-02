import { useState, useCallback, useRef, useEffect } from 'react';
import { Wavoip, type CallOffer, type CallOutgoing, type CallActive, type CallStatus, type Device, type DeviceStatus } from '@wavoip/wavoip-api';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface WavoipDevice {
  token: string;
  status: DeviceStatus | null;
  phone: string | null;
}

export interface ActiveCallState {
  id: string;
  direction: 'inbound' | 'outbound';
  peerPhone: string;
  peerName: string | null;
  peerAvatar: string | null;
  status: CallStatus;
  isMuted: boolean;
  isPeerMuted: boolean;
  startedAt: number;
}

export function useWavoip() {
  const instanceRef = useRef<Wavoip | null>(null);
  const activeCallRef = useRef<CallActive | CallOutgoing | null>(null);
  const callOfferRef = useRef<CallOffer | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<WavoipDevice[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<{
    id: string;
    peerPhone: string;
    peerName: string | null;
    peerAvatar: string | null;
  } | null>(null);

  // Initialize Wavoip with tokens
  const connect = useCallback((tokens: string[]) => {
    if (instanceRef.current) {
      log.info('[Wavoip] Already connected, skipping');
      return;
    }

    if (tokens.length === 0) {
      log.warn('[Wavoip] No tokens provided');
      return;
    }

    try {
      const wavoip = new Wavoip({ tokens, platform: 'zapp-web' });
      instanceRef.current = wavoip;
      setIsConnected(true);

      // Track device statuses
      const updateDevices = () => {
        const devs = wavoip.getDevices().map((d: Device) => ({
          token: d.token,
          status: d.status,
          phone: d.contact?.official?.phone || d.contact?.unofficial?.phone || null,
        }));
        setDevices(devs);
      };

      // Listen for device status changes
      wavoip.getDevices().forEach((device: Device) => {
        device.onStatus(() => updateDevices());
        device.onContact(() => updateDevices());
      });
      updateDevices();

      // Listen for incoming calls
      wavoip.onOffer((offer: CallOffer) => {
        log.info('[Wavoip] Incoming call from', offer.peer.phone);
        callOfferRef.current = offer;

        setIncomingOffer({
          id: offer.id,
          peerPhone: offer.peer.phone,
          peerName: offer.peer.displayName,
          peerAvatar: offer.peer.profilePicture,
        });

        // Handle if call ends before being answered
        offer.onEnd(() => {
          setIncomingOffer(null);
          callOfferRef.current = null;
        });

        offer.onAcceptedElsewhere(() => {
          setIncomingOffer(null);
          callOfferRef.current = null;
        });

        offer.onRejectedElsewhere(() => {
          setIncomingOffer(null);
          callOfferRef.current = null;
        });

        offer.onUnanswered(() => {
          setIncomingOffer(null);
          callOfferRef.current = null;
        });
      });

      log.info('[Wavoip] Connected with', tokens.length, 'device(s)');
    } catch (err) {
      log.error('[Wavoip] Connection error:', err);
      setIsConnected(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    instanceRef.current = null;
    activeCallRef.current = null;
    callOfferRef.current = null;
    setIsConnected(false);
    setDevices([]);
    setActiveCall(null);
    setIncomingOffer(null);
  }, []);

  // Helper to bind active call events
  const bindActiveCallEvents = useCallback((call: CallActive, direction: 'inbound' | 'outbound') => {
    activeCallRef.current = call;

    setActiveCall({
      id: call.id,
      direction,
      peerPhone: call.peer.phone,
      peerName: call.peer.displayName,
      peerAvatar: call.peer.profilePicture,
      status: call.status,
      isMuted: call.muted,
      isPeerMuted: call.peer.muted,
      startedAt: Date.now(),
    });

    call.onStatus((status: CallStatus) => {
      setActiveCall(prev => prev ? { ...prev, status } : null);
    });

    call.onPeerMute(() => {
      setActiveCall(prev => prev ? { ...prev, isPeerMuted: true } : null);
    });

    call.onPeerUnmute(() => {
      setActiveCall(prev => prev ? { ...prev, isPeerMuted: false } : null);
    });

    call.onEnd(() => {
      activeCallRef.current = null;
      setActiveCall(null);
    });

    call.onError((err: string) => {
      log.error('[Wavoip] Call error:', err);
    });
  }, []);

  // Accept incoming call
  const acceptCall = useCallback(async (): Promise<boolean> => {
    const offer = callOfferRef.current;
    if (!offer) {
      log.warn('[Wavoip] No incoming call to accept');
      return false;
    }

    const { call, err } = await offer.accept();
    if (err || !call) {
      log.error('[Wavoip] Accept error:', err);
      return false;
    }

    callOfferRef.current = null;
    setIncomingOffer(null);
    bindActiveCallEvents(call, 'inbound');
    return true;
  }, [bindActiveCallEvents]);

  // Reject incoming call
  const rejectCall = useCallback(async (): Promise<boolean> => {
    const offer = callOfferRef.current;
    if (!offer) return false;

    const { err } = await offer.reject();
    if (err) {
      log.error('[Wavoip] Reject error:', err);
      return false;
    }

    callOfferRef.current = null;
    setIncomingOffer(null);
    return true;
  }, []);

  // Start outgoing call
  const startCall = useCallback(async (phoneNumber: string, fromTokens?: string[]): Promise<boolean> => {
    if (!instanceRef.current) {
      log.error('[Wavoip] Not connected');
      return false;
    }

    const result = await instanceRef.current.startCall({
      to: phoneNumber,
      fromTokens,
    });

    if (result.err || !result.call) {
      log.error('[Wavoip] Start call error:', result.err);
      return false;
    }

    const outgoing = result.call;
    activeCallRef.current = outgoing;

    setActiveCall({
      id: outgoing.id,
      direction: 'outbound',
      peerPhone: outgoing.peer.phone,
      peerName: outgoing.peer.displayName,
      peerAvatar: outgoing.peer.profilePicture,
      status: 'CALLING',
      isMuted: false,
      isPeerMuted: false,
      startedAt: Date.now(),
    });

    outgoing.onPeerAccept((activeCall: CallActive) => {
      bindActiveCallEvents(activeCall, 'outbound');
    });

    outgoing.onPeerReject(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'REJECTED' } : null);
      setTimeout(() => {
        activeCallRef.current = null;
        setActiveCall(null);
      }, 2000);
    });

    outgoing.onUnanswered(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'NOT_ANSWERED' } : null);
      setTimeout(() => {
        activeCallRef.current = null;
        setActiveCall(null);
      }, 2000);
    });

    outgoing.onEnd(() => {
      activeCallRef.current = null;
      setActiveCall(null);
    });

    outgoing.onStatus((status: CallStatus) => {
      setActiveCall(prev => prev ? { ...prev, status } : null);
    });

    return true;
  }, [bindActiveCallEvents]);

  // Mute/Unmute
  const toggleMute = useCallback(async (): Promise<boolean> => {
    const call = activeCallRef.current;
    if (!call) return false;

    if (activeCall?.isMuted) {
      const { err } = await call.unmute();
      if (err) return false;
      setActiveCall(prev => prev ? { ...prev, isMuted: false } : null);
    } else {
      const { err } = await call.mute();
      if (err) return false;
      setActiveCall(prev => prev ? { ...prev, isMuted: true } : null);
    }
    return true;
  }, [activeCall?.isMuted]);

  // End active call
  const endActiveCall = useCallback(async (): Promise<boolean> => {
    const call = activeCallRef.current;
    if (!call) return false;

    const { err } = await call.end();
    if (err) {
      log.error('[Wavoip] End call error:', err);
      return false;
    }

    activeCallRef.current = null;
    setActiveCall(null);
    return true;
  }, []);

  // Fetch stored Wavoip tokens from organization settings
  const fetchTokens = useCallback(async (): Promise<string[]> => {
    try {
      const { data } = await supabase
        .from('organization_settings')
        .select('value')
        .eq('key', 'wavoip_tokens')
        .maybeSingle();

      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  // Save tokens to organization settings
  const saveTokens = useCallback(async (tokens: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          key: 'wavoip_tokens',
          value: JSON.stringify(tokens),
        }, { onConflict: 'key' });

      return !error;
    } catch {
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection
    isConnected,
    connect,
    disconnect,
    devices,

    // Incoming calls
    incomingOffer,
    acceptCall,
    rejectCall,

    // Outgoing calls
    startCall,

    // Active call
    activeCall,
    toggleMute,
    endActiveCall,

    // Token management
    fetchTokens,
    saveTokens,
  };
}
