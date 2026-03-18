import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, X, Send, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { VoiceChanger } from './VoiceChanger';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceChanged, setVoiceChanged] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const {
    isRecording,
    duration,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useAudioRecorder({
    onRecordingComplete: (blob) => setAudioBlob(blob),
  });

  useEffect(() => {
    startRecording();
    return () => cancelRecording();
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  const handleVoiceChanged = (newBlob: Blob) => {
    setAudioBlob(newBlob);
    setVoiceChanged(true);
    // Update audio element for playback
    if (audioRef.current) {
      const url = URL.createObjectURL(newBlob);
      audioRef.current.src = url;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
    >
      {/* Cancel button */}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={handleCancel}
        >
          <X className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Recording indicator or playback */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-destructive"
            />
            <div className="flex-1 flex items-center gap-2">
              <div className="h-8 flex-1 flex items-center gap-0.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [4, Math.random() * 24 + 4, 4],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.02,
                    }}
                    className="w-1 bg-whatsapp rounded-full"
                  />
                ))}
              </div>
              <span className="text-sm font-mono text-muted-foreground w-12">
                {formatDuration(duration)}
              </span>
            </div>
          </>
        ) : audioUrl ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="text-whatsapp"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn(
                "h-full w-full",
                voiceChanged ? "bg-primary" : "bg-whatsapp"
              )} />
            </div>
            <span className="text-sm font-mono text-muted-foreground w-12">
              {formatDuration(duration)}
            </span>
          </>
        ) : null}
      </div>

      {/* Voice changer + Stop/Send */}
      {isRecording ? (
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            size="icon"
            className="bg-destructive hover:bg-destructive/90"
            onClick={stopRecording}
          >
            <Square className="w-4 h-4" />
          </Button>
        </motion.div>
      ) : audioBlob ? (
        <div className="flex items-center gap-1">
          {/* Voice Changer button */}
          <VoiceChanger
            audioBlob={audioBlob}
            onVoiceChanged={handleVoiceChanged}
          />
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              className={cn(
                voiceChanged ? "bg-primary hover:bg-primary/90" : "bg-whatsapp hover:bg-whatsapp-dark"
              )}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}
