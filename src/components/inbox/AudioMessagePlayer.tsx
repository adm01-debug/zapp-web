import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { Play, Pause, Loader2, FileText, Volume2, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AudioMessagePlayerProps {
  audioUrl: string;
  messageId: string;
  isSent: boolean;
  existingTranscription?: string | null;
  transcriptionStatus?: string | null;
}

export function AudioMessagePlayer({
  audioUrl,
  messageId,
  isSent,
  existingTranscription,
  transcriptionStatus: initialStatus,
}: AudioMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(existingTranscription || null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>(initialStatus || 'pending');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(!!existingTranscription);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Realtime subscription for transcription updates
  useEffect(() => {
    const channel = supabase
      .channel(`transcription-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${messageId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.transcription_status) {
            setTranscriptionStatus(newData.transcription_status);
          }
          if (newData.transcription) {
            setTranscription(newData.transcription);
            setShowTranscription(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (isTranscribing || transcriptionStatus === 'processing') return;
    
    setIsTranscribing(true);
    setTranscriptionStatus('processing');
    setShowTranscription(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-transcribe-audio', {
        body: { audioUrl, messageId },
      });

      if (error) throw error;

      if (data?.transcription) {
        setTranscription(data.transcription);
        setTranscriptionStatus('completed');
        
        // Update message in database with transcription
        await (supabase as any)
          .from('messages')
          .update({ 
            transcription: data.transcription,
            transcription_status: 'completed'
          })
          .eq('id', messageId);
      }
    } catch (error) {
      log.error('Transcription error:', error);
      setTranscriptionStatus('failed');
      toast({
        title: 'Erro na transcrição',
        description: 'Não foi possível transcrever o áudio.',
        variant: 'destructive',
      });
      setTranscription(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const isProcessing = transcriptionStatus === 'processing' || isTranscribing;

  // Get status indicator
  const getStatusIndicator = () => {
    switch (transcriptionStatus) {
      case 'processing':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium',
              isSent ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-3 h-3" />
            </motion.div>
            <span>Transcrevendo...</span>
          </motion.div>
        );
      case 'completed':
        if (transcription) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium',
                isSent ? 'bg-green-500/20 text-green-200' : 'bg-green-500/10 text-green-600'
              )}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Transcrito</span>
            </motion.div>
          );
        }
        return null;
      case 'failed':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium cursor-pointer',
              isSent ? 'bg-red-500/20 text-red-200' : 'bg-red-500/10 text-red-600'
            )}
            onClick={handleTranscribe}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Falhou - Tentar novamente</span>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Audio Player */}
      <div className={cn(
        'flex items-center gap-3 p-2 rounded-lg min-w-[200px]',
        isSent ? 'bg-primary-foreground/10' : 'bg-muted/50'
      )}>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-10 h-10 rounded-full',
              isSent 
                ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' 
                : 'bg-primary/10 hover:bg-primary/20 text-primary'
            )}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
        </motion.div>

        <div className="flex-1 space-y-1">
          {/* Waveform visualization (simplified as progress bar) */}
          <div 
            className="relative h-8 cursor-pointer"
            onClick={handleSeek}
          >
            <div className="absolute inset-y-0 left-0 right-0 flex items-center gap-[2px]">
              {Array.from({ length: 30 }).map((_, i) => {
                const height = Math.random() * 60 + 20;
                const isActive = (i / 30) * 100 <= progress;
                return (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0.5 }}
                    animate={{ 
                      scaleY: isPlaying && isActive ? [0.6, 1, 0.6] : 1,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isPlaying && isActive ? Infinity : 0,
                      delay: i * 0.02,
                    }}
                    className={cn(
                      'flex-1 rounded-full transition-colors',
                      isActive
                        ? isSent ? 'bg-primary-foreground' : 'bg-primary'
                        : isSent ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'
                    )}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Time display */}
          <div className={cn(
            'flex justify-between text-[10px]',
            isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            <span>{formatTime(currentTime)}</span>
            <span>{duration ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Transcription toggle button */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-8 h-8 relative',
              showTranscription && transcription
                ? isSent ? 'text-primary-foreground' : 'text-primary'
                : isSent ? 'text-primary-foreground/50' : 'text-muted-foreground'
            )}
            onClick={() => {
              if (!transcription && !isProcessing) {
                handleTranscribe();
              } else {
                setShowTranscription(!showTranscription);
              }
            }}
            disabled={isProcessing}
            title={transcription ? 'Mostrar/ocultar transcrição' : 'Transcrever áudio'}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {transcription && !showTranscription && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full',
                  isSent ? 'bg-green-400' : 'bg-green-500'
                )}
              />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Status Indicator - Only show when processing or failed */}
      <AnimatePresence>
        {(transcriptionStatus === 'processing' || transcriptionStatus === 'failed') && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            {getStatusIndicator()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcription Display */}
      <AnimatePresence>
        {showTranscription && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-lg p-3 text-xs border',
              isSent 
                ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground/90' 
                : 'bg-muted/50 border-border/30 text-foreground/80'
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
                <div className="flex-1">
                  <p className="font-medium">Transcrevendo áudio...</p>
                  <p className="text-[10px] opacity-60 mt-0.5">A IA está convertendo o áudio em texto</p>
                </div>
                <motion.div 
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSent ? 'bg-primary-foreground/50' : 'bg-primary/50'
                      )}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              </div>
            ) : transcription ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] opacity-60 mb-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Transcrição</span>
                  <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
                </div>
                <p className="leading-relaxed italic">"{transcription}"</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="opacity-60">Transcrição não disponível</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleTranscribe}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
