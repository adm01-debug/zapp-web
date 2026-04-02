import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useVoipEngine, type ActiveCallState, type WhatsAppConnection } from '@/hooks/useVoipEngine';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

interface VoipContextValue {
  // Connection
  isReady: boolean;
  connections: WhatsAppConnection[];
  selectedConnectionId: string | null;
  setSelectedConnectionId: (id: string | null) => void;
  fetchConnections: () => Promise<WhatsAppConnection[]>;

  // Calls
  activeCall: ActiveCallState | null;
  incomingOffer: {
    id: string;
    dbCallId: string;
    peerPhone: string;
    peerName: string | null;
    peerAvatar: string | null;
    connectionId: string | null;
  } | null;
  audioLevel: number;

  // Actions
  makeCall: (phone: string, contactId?: string, contactName?: string, contactAvatar?: string) => Promise<void>;
  answerIncoming: () => Promise<void>;
  rejectIncoming: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  getCallDuration: () => number;
}

const VoipContext = createContext<VoipContextValue | null>(null);

export function VoipProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const voip = useVoipEngine();

  // Auto-initialize when user is authenticated
  useEffect(() => {
    if (!user || !profile?.id) return;

    voip.initialize(profile.id);
    voip.fetchConnections();

    return () => {
      voip.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.id]);

  // Show toast on incoming call
  useEffect(() => {
    if (voip.incomingOffer) {
      const name = voip.incomingOffer.peerName || voip.incomingOffer.peerPhone;
      toast({
        title: 'Chamada recebida',
        description: `${name} est\u00e1 ligando...`,
      });
    }
  }, [voip.incomingOffer]);

  const makeCall = useCallback(async (
    phone: string,
    contactId?: string,
    contactName?: string,
    contactAvatar?: string,
  ) => {
    const success = await voip.startCall(phone, contactId, contactName, contactAvatar);
    if (!success) {
      toast({
        title: 'Erro na chamada',
        description: 'N\u00e3o foi poss\u00edvel iniciar a chamada. Verifique a conex\u00e3o WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    logAudit({
      action: 'call_started',
      entityType: 'call',
      details: { direction: 'outbound', phone },
    });
  }, [voip]);

  const answerIncoming = useCallback(async () => {
    if (!voip.incomingOffer) return;

    const success = await voip.acceptCall();
    if (!success) {
      toast({
        title: 'Erro ao atender',
        description: 'N\u00e3o foi poss\u00edvel atender a chamada.',
        variant: 'destructive',
      });
      return;
    }

    logAudit({
      action: 'call_started',
      entityType: 'call',
      details: { direction: 'inbound', phone: voip.incomingOffer.peerPhone },
    });
  }, [voip]);

  const rejectIncoming = useCallback(async () => {
    await voip.rejectCall();
  }, [voip]);

  const hangUp = useCallback(async () => {
    const duration = voip.getCallDuration();
    await voip.endActiveCall();

    logAudit({
      action: 'call_ended',
      entityType: 'call',
      details: { duration },
    });
  }, [voip]);

  const toggleMute = useCallback(() => {
    voip.toggleMute();
  }, [voip]);

  const value: VoipContextValue = {
    isReady: voip.isReady,
    connections: voip.connections,
    selectedConnectionId: voip.selectedConnectionId,
    setSelectedConnectionId: voip.setSelectedConnectionId,
    fetchConnections: voip.fetchConnections,
    activeCall: voip.activeCall,
    incomingOffer: voip.incomingOffer,
    audioLevel: voip.audioLevel,
    makeCall,
    answerIncoming,
    rejectIncoming,
    hangUp,
    toggleMute,
    getCallDuration: voip.getCallDuration,
  };

  return (
    <VoipContext.Provider value={value}>
      {children}
    </VoipContext.Provider>
  );
}

export function useVoipContext() {
  const context = useContext(VoipContext);
  if (!context) {
    throw new Error('useVoipContext must be used within a VoipProvider');
  }
  return context;
}
