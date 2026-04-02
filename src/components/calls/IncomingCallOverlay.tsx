import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react';
import { useWavoipContext } from '@/contexts/WavoipContext';

export function IncomingCallOverlay() {
  const { incomingOffer, answerIncoming, rejectIncoming, activeCall } = useWavoipContext();

  // Don't show overlay if there's already an active call or no offer
  if (!incomingOffer || activeCall) return null;

  const name = incomingOffer.peerName || incomingOffer.peerPhone;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-4 right-4 z-[9999] w-80"
        role="alert"
        aria-label="Chamada recebida"
      >
        <div className="bg-card border border-border/50 rounded-xl shadow-2xl p-4 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            {/* Avatar with ringing animation */}
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-whatsapp/30">
                <AvatarImage src={incomingOffer.peerAvatar || undefined} />
                <AvatarFallback className="bg-whatsapp/10 text-whatsapp text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-whatsapp"
              />
            </div>

            {/* Call info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <PhoneIncoming className="w-3.5 h-3.5 text-whatsapp" />
                <span className="text-xs text-whatsapp font-medium">Chamada recebida</span>
              </div>
              <p className="font-semibold text-sm truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{incomingOffer.peerPhone}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={rejectIncoming}
              aria-label="Rejeitar chamada"
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-whatsapp hover:bg-whatsapp-dark"
              onClick={answerIncoming}
              aria-label="Atender chamada"
            >
              <Phone className="w-4 h-4 mr-1" />
              Atender
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
