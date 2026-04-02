import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  PhoneIncoming,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWavoipContext } from '@/contexts/WavoipContext';

interface CallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id?: string;
    name: string;
    phone: string;
    avatar?: string;
  };
  direction: 'inbound' | 'outbound';
  whatsappConnectionId?: string;
  onAnswer?: () => void;
  onEnd: () => void;
}

export function CallDialog({
  open,
  onOpenChange,
  contact,
  direction,
  onAnswer,
  onEnd,
}: CallDialogProps) {
  const {
    activeCall,
    isConnected,
    makeCall,
    answerIncoming,
    rejectIncoming,
    hangUp,
    toggleMute,
  } = useWavoipContext();

  const [duration, setDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [localStatus, setLocalStatus] = useState<'idle' | 'calling' | 'active' | 'ended'>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitiatedRef = useRef(false);

  // Initiate call when dialog opens
  useEffect(() => {
    if (open && !hasInitiatedRef.current && direction === 'outbound') {
      hasInitiatedRef.current = true;
      setLocalStatus('calling');
      makeCall(contact.phone, contact.id, contact.name);
    }
    if (open && direction === 'inbound') {
      setLocalStatus('calling');
    }
  }, [open, direction, contact, makeCall]);

  // Track active call status
  useEffect(() => {
    if (activeCall?.status === 'ACTIVE') {
      setLocalStatus('active');
    } else if (activeCall?.status === 'ENDED' || activeCall?.status === 'REJECTED' || activeCall?.status === 'NOT_ANSWERED') {
      setLocalStatus('ended');
    }
  }, [activeCall?.status]);

  // Timer for call duration
  useEffect(() => {
    if (localStatus === 'active') {
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [localStatus]);

  // Auto-close when call ends
  useEffect(() => {
    if (localStatus === 'ended') {
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStatus]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDuration(0);
      setLocalStatus('idle');
      hasInitiatedRef.current = false;
    }
  }, [open]);

  const handleAnswer = async () => {
    await answerIncoming();
    onAnswer?.();
  };

  const handleReject = async () => {
    await rejectIncoming();
    handleClose();
  };

  const handleEnd = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    await hangUp();
    setLocalStatus('ended');
  };

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onEnd();
    onOpenChange(false);
  };

  const handleToggleMute = async () => {
    await toggleMute();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Wavoip desconectado';
    if (localStatus === 'ended') {
      if (activeCall?.status === 'REJECTED') return 'Chamada rejeitada';
      if (activeCall?.status === 'NOT_ANSWERED') return 'Não atendida';
      return `Chamada encerrada - ${formatDuration(duration)}`;
    }
    if (localStatus === 'active') return null; // Show timer instead
    if (direction === 'inbound') return 'Chamada recebida...';
    return 'Chamando...';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-card to-background border-0">
        <div className="p-8 flex flex-col items-center">
          {/* Connection status */}
          <div className="absolute top-3 right-3">
            <Badge variant={isConnected ? 'outline' : 'destructive'} className="gap-1 text-xs">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'VoIP' : 'Offline'}
            </Badge>
          </div>

          {/* Contact Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <Avatar className="w-24 h-24 border-4 border-whatsapp/20">
              <AvatarImage src={contact.avatar || activeCall?.peerAvatar || undefined} />
              <AvatarFallback className="text-2xl bg-whatsapp/10 text-whatsapp">
                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Ringing animation */}
            <AnimatePresence>
              {localStatus === 'calling' && (
                <>
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-whatsapp"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 rounded-full border-2 border-whatsapp"
                  />
                </>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Contact Info */}
          <h3 className="mt-6 text-xl font-semibold text-foreground">{contact.name}</h3>
          <p className="text-muted-foreground">{contact.phone}</p>

          {/* Call quality / Peer muted indicator */}
          {activeCall?.isPeerMuted && localStatus === 'active' && (
            <Badge variant="secondary" className="mt-2 gap-1 text-xs">
              <MicOff className="w-3 h-3" />
              Outro lado em mudo
            </Badge>
          )}

          {/* Status */}
          <motion.div
            key={localStatus}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            {localStatus === 'active' ? (
              <p className="text-whatsapp font-mono text-lg">{formatDuration(duration)}</p>
            ) : (
              <p className={cn(
                'text-muted-foreground',
                localStatus === 'ended' && 'text-destructive'
              )}>
                {getStatusText()}
              </p>
            )}
          </motion.div>

          {/* Controls */}
          <div className="mt-8 flex items-center gap-4">
            {/* Mute button - only in active call */}
            {localStatus === 'active' && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'w-12 h-12 rounded-full',
                    activeCall?.isMuted && 'bg-destructive/10 border-destructive text-destructive'
                  )}
                  onClick={handleToggleMute}
                  aria-label={activeCall?.isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
                >
                  {activeCall?.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </motion.div>
            )}

            {/* Speaker button - only in active call */}
            {localStatus === 'active' && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'w-12 h-12 rounded-full',
                    !isSpeakerOn && 'bg-muted'
                  )}
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  aria-label={isSpeakerOn ? 'Desativar alto-falante' : 'Ativar alto-falante'}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </motion.div>
            )}

            {/* Answer button - inbound ringing */}
            {localStatus === 'calling' && direction === 'inbound' && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  className="w-14 h-14 rounded-full bg-whatsapp hover:bg-whatsapp-dark"
                  onClick={handleAnswer}
                  aria-label="Atender chamada"
                >
                  <PhoneIncoming className="w-6 h-6" />
                </Button>
              </motion.div>
            )}

            {/* End/Reject button */}
            {localStatus !== 'ended' && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90"
                  onClick={localStatus === 'calling' && direction === 'inbound' ? handleReject : handleEnd}
                  aria-label={localStatus === 'calling' && direction === 'inbound' ? 'Rejeitar chamada' : 'Encerrar chamada'}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Info text */}
          <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
            {localStatus === 'calling' && direction === 'outbound'
              ? 'Aguardando resposta do contato...'
              : localStatus === 'active'
              ? 'Chamada VoIP em andamento via Wavoip'
              : localStatus === 'ended'
              ? 'A janela fechará automaticamente'
              : null
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
