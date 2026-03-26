import { useState, useRef, useCallback, useEffect } from 'react';
import { UserAgent, Registerer, Inviter, SessionState, Web } from 'sip.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SipStatus = 'disconnected' | 'connecting' | 'registered' | 'error';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active' | 'on-hold' | 'ended';

interface SipConfig {
  server: string;
  user: string;
  password: string;
}

export function useSipClient() {
  const [sipStatus, setSipStatus] = useState<SipStatus>('disconnected');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');

  const uaRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Inviter | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Create or get audio element for remote stream
  const getRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) {
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

      const wsServer = `wss://${config.server}:8089/ws`;
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
      };

      await ua.start();

      const registerer = new Registerer(ua);
      registerer.stateChange.addListener((state) => {
        switch (state) {
          case 'Registered':
            setSipStatus('registered');
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
      console.error('SIP connection error:', err);
      setSipStatus('error');
      toast.error(`Erro ao conectar VoIP: ${err.message || 'Falha na conexão'}`);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (registererRef.current) {
        await registererRef.current.unregister();
      }
      if (uaRef.current) {
        await uaRef.current.stop();
      }
      setSipStatus('disconnected');
    } catch (err) {
      console.error('SIP disconnect error:', err);
    }
  }, []);

  const makeCall = useCallback(async (number: string) => {
    if (!uaRef.current || sipStatus !== 'registered') {
      toast.error('VoIP não conectado. Conecte-se primeiro.');
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

      const inviter = new Inviter(uaRef.current, target, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
      });

      inviter.stateChange.addListener((state) => {
        switch (state) {
          case SessionState.Establishing:
            setCallStatus('ringing');
            break;
          case SessionState.Established:
            setCallStatus('active');
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
            setCallStatus('ended');
            stopTimer();
            setIsMuted(false);
            setTimeout(() => setCallStatus('idle'), 2000);
            // Log call to database
            logCall(number);
            break;
        }
      });

      await inviter.invite();
      sessionRef.current = inviter;
    } catch (err: any) {
      console.error('Call error:', err);
      setCallStatus('idle');
      toast.error(`Erro ao ligar: ${err.message || 'Falha na chamada'}`);
    }
  }, [sipStatus, startTimer, stopTimer, getRemoteAudio]);

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

  const logCall = useCallback(async (number: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('calls').insert({
        direction: 'outbound',
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: callDuration,
        agent_id: user?.id || null,
        notes: `Chamada para ${number}`,
      });
    } catch (err) {
      console.error('Error logging call:', err);
    }
  }, [callDuration]);

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
