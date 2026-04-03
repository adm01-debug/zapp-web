import { useState } from 'react';
import { useWhatsAppStatus, type WhatsAppStatusMessage } from '@/hooks/useWhatsAppStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Image as ImageIcon, Video, Type, Clock, WifiOff, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeTime } from '@/lib/formatters';

interface WhatsAppStatusSectionProps {
  phone: string;
}

const getStatusIcon = (msg: WhatsAppStatusMessage) => {
  if (msg.message?.imageMessage) return <ImageIcon className="w-3.5 h-3.5 text-primary" />;
  if (msg.message?.videoMessage) return <Video className="w-3.5 h-3.5 text-accent-foreground" />;
  return <Type className="w-3.5 h-3.5 text-success" />;
};

const getStatusLabel = (msg: WhatsAppStatusMessage) => {
  if (msg.message?.imageMessage) return 'Foto';
  if (msg.message?.videoMessage) return 'Vídeo';
  if (msg.message?.extendedTextMessage?.text || msg.message?.conversation) return 'Texto';
  if (msg.status) return `Status ${msg.status}`;
  return 'Status';
};

const getStatusContent = (msg: WhatsAppStatusMessage) => {
  if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
  if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
  if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
  if (msg.message?.conversation) return msg.message.conversation;
  if (msg.message?.imageMessage) return 'Foto';
  if (msg.message?.videoMessage) return 'Vídeo';
  if (msg.status) return `Status: ${msg.status}`;
  return 'Status';
};

const getStatusTime = (msg: WhatsAppStatusMessage) => {
  const ts = msg.messageTimestamp;
  if (!ts) return null;
  const date = new Date(typeof ts === 'string' ? parseInt(ts, 10) * 1000 : ts * 1000);
  return formatRelativeTime(date);
};

const getMediaUrl = (msg: WhatsAppStatusMessage) => {
  return msg.message?.imageMessage?.url || msg.message?.videoMessage?.url || null;
};

const hasReadableContent = (content: string) => !['Foto', 'Vídeo', 'Status'].includes(content) && !content.startsWith('Status:');

export function WhatsAppStatusSection({ phone }: WhatsAppStatusSectionProps) {
  const { statusMessages, presence, loading, error, refresh } = useWhatsAppStatus(phone);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Carregando status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <WifiOff className="w-5 h-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="ghost" size="sm" onClick={refresh} className="h-7 text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="whatsapp-status-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              presence.loading ? 'bg-muted-foreground/30 animate-pulse' : presence.isOnline ? 'bg-success' : 'bg-muted-foreground/40',
            )}
          />
          <span className="text-xs text-muted-foreground">
            {presence.loading ? (
              'Verificando...'
            ) : presence.isOnline ? (
              <span className="text-success font-medium">Online agora</span>
            ) : presence.lastSeen ? (
              `Visto por último ${presence.lastSeen}`
            ) : (
              'Offline'
            )}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-primary/10" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {statusMessages.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-muted-foreground/30" />
          </div>
          <p className="text-xs text-muted-foreground/60">Nenhum status disponível</p>
          <p className="text-[10px] text-muted-foreground/40">Os status desaparecem após 24h</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
              {statusMessages.length} status
            </Badge>
          </div>

          <AnimatePresence initial={false}>
            {statusMessages.map((msg, index) => {
              const isSelected = selectedIndex === index;
              const content = getStatusContent(msg);
              const label = getStatusLabel(msg);
              const time = getStatusTime(msg);
              const mediaUrl = getMediaUrl(msg);
              const showBodyText = hasReadableContent(content);
              const isImageStatus = Boolean(msg.message?.imageMessage);
              const isVideoStatus = Boolean(msg.message?.videoMessage);

              return (
                <motion.div
                  key={msg.key?.id || msg.id || index}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-2"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(isSelected ? null : index)}
                    className={cn(
                      'w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg transition-all',
                      'hover:bg-muted/30 border border-transparent',
                      isSelected && 'bg-muted/30 border-primary/20',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                      {getStatusIcon(msg)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground">{label}</p>
                      </div>
                      <p className="text-xs text-foreground/80 line-clamp-2">{content}</p>
                      {time && <p className="text-[10px] text-muted-foreground mt-0.5">{time}</p>}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-10 rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                          {(isImageStatus || isVideoStatus) && mediaUrl ? (
                            <div className="overflow-hidden rounded-md border border-border/60 bg-background/60">
                              {isImageStatus ? (
                                <img
                                  src={mediaUrl}
                                  alt={`Prévia do status de ${phone}`}
                                  loading="lazy"
                                  className="w-full max-h-72 object-cover"
                                />
                              ) : (
                                <video src={mediaUrl} controls preload="metadata" className="w-full max-h-72" />
                              )}
                            </div>
                          ) : null}

                          {showBodyText ? (
                            <div className="rounded-md border border-border/60 bg-background/60 p-3">
                              <p className="text-xs text-foreground whitespace-pre-wrap break-words">{content}</p>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] text-muted-foreground">
                              {time ? `Publicado ${time}` : 'Status sem horário disponível'}
                            </div>
                            {mediaUrl ? (
                              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                <a href={mediaUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Abrir mídia
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
