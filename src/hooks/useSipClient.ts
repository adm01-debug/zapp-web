import { useState, useRef, useCallback, useEffect } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('SipClient');
import { UserAgent, Registerer, Inviter, SessionState, Web } from 'sip.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SipStatus = 'disconnected' | 'connecting' | 'registered' | 'error';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active' | 'on-hold' | 'ended';

interface SipConfig {
  server: string;
  user: string;
  password: string;
  wsPort?: number;
}

export function useSipClient() {
  const [sipStatus, setSipStatus] = useState<SipStatus>('disconnected');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const callStatusRef = useRef<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');

  const uaRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Inviter | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<string | null>(null);
  const profileIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Create or get audio element for remote stream
  const getRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) {
      // Clean up any orphaned elements first
      const existing = document.getElementById('sip-remote-audio');
      if (existing) existing.remove();
      
      const audio = document.createElement('audio');
      audio.id = 'sip-remote-audio';
      audio.autoplay = true;
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  }, []);

  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const connect = useCallback(async (config: SipConfig) => {
    try {
      setSipStatus('connecting');

      const wsPort = config.wsPort || 8089;
      const wsServer = `wss://${config.server}:${wsPort}/ws`;
      const uri = UserAgent.makeURI(`sip:${config.user}@${config.server}`);
      if (!uri) {
        throw new Error('URI SIP inválida');
      }

      const transportOptions = {
        server: wsServer,
        traceSip: false,
      };

      const ua = new UserAgent({
        uri,
        transportOptions,
        authorizationPassword: config.password,
        authorizationUsername: config.user,
        logLevel: 'warn',
        displayName: config.user,
      });

      ua.transport.onDisconnect = () => {
        setSipStatus('disconnected');
        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          toast.info(`Conexão perdida. Reconectando em ${delay / 1000}s... (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setTimeout(() => {
            connect(config);
          }, delay);
        } else {
          toast.error('Não foi possível reconectar ao servidor VoIP. Tente conectar manualmente.');
          reconnectAttemptsRef.current = 0;
        }
      };

      await ua.start();

      const registerer = new Registerer(ua);
      registerer.stateChange.addListener((state) => {
        switch (state) {
          case 'Registered':
            setSipStatus('registered');
            reconnectAttemptsRef.current = 0;
            toast.success('VoIP conectado!');
            break;
          case 'Unregistered':
            setSipStatus('disconnected');
            break;
          case 'Terminated':
            setSipStatus('disconnected');
            break;
        }
      });

      await registerer.register();

      uaRef.current = ua;
      registererRef.current = registerer;
    } catch (err: any) {
      log.error('SIP connection error:', err);
      setSipStatus('error');
      toast.error(`Erro ao conectar VoIP: ${err.message || 'Falha na conexão'}`);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
      if (registererRef.current) {
        await registererRef.current.unregister();
      }
      if (uaRef.current) {
        // Remove the onDisconnect handler to prevent reconnect
        uaRef.current.transport.onDisconnect = () => {};
        await uaRef.current.stop();
      }
      setSipStatus('disconnected');
      reconnectAttemptsRef.current = 0;
    } catch (err) {
      log.error('SIP disconnect error:', err);
    }
  }, []);

  // Match phone number to a contact in the database
  const findContactByPhone = useCallback(async (phone: string): Promise<string | null> => {
    try {
      // Normalize phone: remove spaces, dashes, parentheses
      const normalized = phone.replace(/[\s\-\(\)]/g, '');
      
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .or(`phone.eq.${normalized},phone.eq.+${normalized},phone.ilike.%${normalized.slice(-8)}%`)
        .limit(1)
        .maybeSingle();
      
      return data?.id || null;
    } catch {
      return null;
    }
  }, []);

  // Get current user's profile ID
  const getProfileId = useCallback(async (): Promise<string | null> => {
    if (profileIdRef.current) return profileIdRef.current;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.id) {
        profileIdRef.current = data.id;
      }
      return data?.id || null;
    } catch {
      return null;
    }
  }, []);

  const logCall = useCallback(async (number: string, status: string) => {
    try {
      const agentId = await getProfileId();
      const contactId = await findContactByPhone(number);
      const startedAt = callStartTimeRef.current || new Date().toISOString();
      const endedAt = new Date().toISOString();
      const actualDuration = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
      );
      await supabase.from('calls').insert({
        direction: 'outbound',
        status,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: actualDuration,
        agent_id: agentId,
        contact_id: contactId,
        notes: `Chamada para ${number}`,
      });
      callStartTimeRef.current = null;
    } catch (err) {
      log.error('Error logging call:', err);
    }
  }, [getProfileId, findContactByPhone]);

  const makeCall = useCallback(async (number: string) => {
    if (!uaRef.current || sipStatus !== 'registered') {
      toast.error('VoIP não conectado. Conecte-se primeiro.');
      return;
    }

    // Basic rate limiting: prevent rapid calls
    if (callStatusRef.current !== 'idle') {
      toast.error('Já existe uma chamada em andamento.');
      return;
    }

    try {
      const server = uaRef.current.configuration.uri.host;
      const target = UserAgent.makeURI(`sip:${number}@${server}`);
      if (!target) {
        toast.error('Número inválido');
        return;
      }

      setCurrentNumber(number);
      setCallStatus('calling');
      callStatusRef.current = 'calling';
      callStartTimeRef.current = new Date().toISOString(); // Capture start time NOW

      const inviter = new Inviter(uaRef.current, target, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
      });

      inviter.stateChange.addListener((state) => {
        switch (state) {
          case SessionState.Establishing:
            setCallStatus('ringing');
            callStatusRef.current = 'ringing';
            break;
          case SessionState.Established:
            setCallStatus('active');
            callStatusRef.current = 'active';
            startTimer();
            // Attach remote audio
            const remoteStream = new MediaStream();
            const audio = getRemoteAudio();
            const sdh = inviter.sessionDescriptionHandler as Web.SessionDescriptionHandler;
            if (sdh && sdh.peerConnection) {
              sdh.peerConnection.getReceivers().forEach((receiver) => {
                if (receiver.track) {
                  remoteStream.addTrack(receiver.track);
                }
              });
              audio.srcObject = remoteStream;
            }
            break;
          case SessionState.Terminated:
            stopTimer();
            const prevStatus = callStatusRef.current;
            const wasActive = prevStatus === 'active';
            const wasCalling = prevStatus === 'calling' || prevStatus === 'ringing';
            
            setCallStatus('ended');
            callStatusRef.current = 'ended';
            setIsMuted(false);
            
            // Determine proper call status for logging
            const logStatus = wasActive ? 'ended' : wasCalling ? 'missed' : 'ended';
            
            // Log call with correct data
            logCall(number, logStatus);
            
            setTimeout(() => {
              setCallStatus('idle');
              callStatusRef.current = 'idle';
            }, 2000);
            break;
        }
      });

      await inviter.invite();
      sessionRef.current = inviter;
    } catch (err: any) {
      console.error('Call error:', err);
      // Log failed call attempt
      logCall(number, 'missed');
      setCallStatus('idle');
      callStatusRef.current = 'idle';
      toast.error(`Erro ao ligar: ${err.message || 'Falha na chamada'}`);
    }
  }, [sipStatus, startTimer, stopTimer, getRemoteAudio, logCall]);

  const hangUp = useCallback(() => {
    if (sessionRef.current) {
      try {
        if (sessionRef.current.state === SessionState.Established) {
          sessionRef.current.bye();
        } else {
          sessionRef.current.cancel();
        }
      } catch (err) {
        console.error('Hangup error:', err);
      }
      sessionRef.current = null;
    }
    stopTimer();
    setCallStatus('idle');
    callStatusRef.current = 'idle';
    setIsMuted(false);
  }, [stopTimer]);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    const sdh = sessionRef.current.sessionDescriptionHandler as Web.SessionDescriptionHandler;
    if (sdh && sdh.peerConnection) {
      sdh.peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = isMuted; // toggle
        }
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const sendDTMF = useCallback((digit: string) => {
    if (!sessionRef.current || sessionRef.current.state !== SessionState.Established) return;
    try {
      const sdh = sessionRef.current.sessionDescriptionHandler as Web.SessionDescriptionHandler;
      if (sdh && sdh.peerConnection) {
        const sender = sdh.peerConnection.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          (sender as any).dtmf?.insertDTMF(digit, 100, 70);
        }
      }
    } catch (err) {
      console.error('DTMF error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (remoteAudioRef.current) {
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      }
    };
  }, [stopTimer]);

  return {
    sipStatus,
    callStatus,
    callDuration,
    isMuted,
    currentNumber,
    connect,
    disconnect,
    makeCall,
    hangUp,
    toggleMute,
    sendDTMF,
  };
}
