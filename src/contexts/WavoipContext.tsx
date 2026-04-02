import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useWavoip, type ActiveCallState, type WavoipDevice } from '@/hooks/useWavoip';
import { useCalls } from '@/hooks/useCalls';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

interface WavoipContextValue {
  // Connection
  isConnected: boolean;
  devices: WavoipDevice[];
  connectWithTokens: (tokens: string[]) => void;
  disconnect: () => void;

  // Calls
  activeCall: ActiveCallState | null;
  incomingOffer: {
    id: string;
    peerPhone: string;
    peerName: string | null;
    peerAvatar: string | null;
  } | null;

  // Actions
  makeCall: (phone: string, contactId?: string, contactName?: string) => Promise<void>;
  answerIncoming: () => Promise<void>;
  rejectIncoming: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => Promise<void>;

  // Token management
  fetchTokens: () => Promise<string[]>;
  saveTokens: (tokens: string[]) => Promise<boolean>;
}

const WavoipContext = createContext<WavoipContextValue | null>(null);

export function WavoipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const wavoip = useWavoip();
  const calls = useCalls();
  const dbCallIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number>(0);

  // Auto-connect on mount if tokens exist
  useEffect(() => {
    if (!user) return;

    wavoip.fetchTokens().then((tokens) => {
      if (tokens.length > 0) {
        wavoip.connect(tokens);
        log.info('[WavoipProvider] Auto-connected with', tokens.length, 'token(s)');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Show toast on incoming call
  useEffect(() => {
    if (wavoip.incomingOffer) {
      const name = wavoip.incomingOffer.peerName || wavoip.incomingOffer.peerPhone;
      toast({
        title: 'Chamada recebida',
        description: `${name} está ligando...`,
      });
    }
  }, [wavoip.incomingOffer]);

  const connectWithTokens = useCallback((tokens: string[]) => {
    wavoip.connect(tokens);
  }, [wavoip]);

  const makeCall = useCallback(async (phone: string, contactId?: string, contactName?: string) => {
    // Record in DB
    const dbId = await calls.startCall({
      contactId,
      contactPhone: phone,
      contactName: contactName || phone,
      direction: 'outbound',
    });
    dbCallIdRef.current = dbId;
    callStartTimeRef.current = Date.now();

    // Start VoIP call
    const success = await wavoip.startCall(phone);
    if (!success) {
      toast({
        title: 'Erro na chamada',
        description: 'Não foi possível iniciar a chamada. Verifique a conexão Wavoip.',
        variant: 'destructive',
      });
      if (dbId) {
        await calls.endCall(dbId, 0);
      }
      return;
    }

    logAudit({
      action: 'call_started',
      entityType: 'call',
      entityId: dbId || undefined,
      details: { direction: 'outbound', phone },
    });
  }, [calls, wavoip]);

  const answerIncoming = useCallback(async () => {
    const offer = wavoip.incomingOffer;
    if (!offer) return;

    // Record in DB
    const dbId = await calls.startCall({
      contactPhone: offer.peerPhone,
      contactName: offer.peerName || offer.peerPhone,
      direction: 'inbound',
    });
    dbCallIdRef.current = dbId;
    callStartTimeRef.current = Date.now();

    if (dbId) {
      await calls.answerCall(dbId);
    }

    const success = await wavoip.acceptCall();
    if (!success) {
      toast({
        title: 'Erro ao atender',
        description: 'Não foi possível atender a chamada.',
        variant: 'destructive',
      });
    }

    logAudit({
      action: 'call_started',
      entityType: 'call',
      entityId: dbId || undefined,
      details: { direction: 'inbound', phone: offer.peerPhone },
    });
  }, [wavoip, calls]);

  const rejectIncoming = useCallback(async () => {
    const offer = wavoip.incomingOffer;
    await wavoip.rejectCall();

    if (offer) {
      const dbId = await calls.startCall({
        contactPhone: offer.peerPhone,
        contactName: offer.peerName || offer.peerPhone,
        direction: 'inbound',
      });
      if (dbId) {
        await calls.missCall(dbId);
      }
    }
  }, [wavoip, calls]);

  const hangUp = useCallback(async () => {
    const durationSecs = Math.floor((Date.now() - callStartTimeRef.current) / 1000);

    await wavoip.endActiveCall();

    if (dbCallIdRef.current) {
      await calls.endCall(dbCallIdRef.current, durationSecs);
      logAudit({
        action: 'call_ended',
        entityType: 'call',
        entityId: dbCallIdRef.current,
        details: { duration: durationSecs },
      });
      dbCallIdRef.current = null;
    }
  }, [wavoip, calls]);

  const toggleMute = useCallback(async () => {
    await wavoip.toggleMute();
  }, [wavoip]);

  // Track when active call ends externally (peer hung up)
  useEffect(() => {
    if (!wavoip.activeCall && dbCallIdRef.current) {
      const durationSecs = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      calls.endCall(dbCallIdRef.current, durationSecs);
      dbCallIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wavoip.activeCall]);

  const value: WavoipContextValue = {
    isConnected: wavoip.isConnected,
    devices: wavoip.devices,
    connectWithTokens,
    disconnect: wavoip.disconnect,
    activeCall: wavoip.activeCall,
    incomingOffer: wavoip.incomingOffer,
    makeCall,
    answerIncoming,
    rejectIncoming,
    hangUp,
    toggleMute,
    fetchTokens: wavoip.fetchTokens,
    saveTokens: wavoip.saveTokens,
  };

  return (
    <WavoipContext.Provider value={value}>
      {children}
    </WavoipContext.Provider>
  );
}

export function useWavoipContext() {
  const context = useContext(WavoipContext);
  if (!context) {
    throw new Error('useWavoipContext must be used within a WavoipProvider');
  }
  return context;
}
