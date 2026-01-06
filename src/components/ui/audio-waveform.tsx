import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AudioWaveformProps {
  audioUrl: string;
  duration?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onDownload?: () => void;
  currentTime?: number;
  className?: string;
  compact?: boolean;
  waveformData?: number[];
  color?: 'primary' | 'secondary' | 'muted';
  showVolume?: boolean;
}

// Generate mock waveform data if not provided
function generateWaveformData(length: number = 50): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    // Create a realistic-looking waveform pattern
    const base = Math.sin(i * 0.3) * 0.3 + 0.5;
    const noise = Math.random() * 0.3;
    data.push(Math.min(1, Math.max(0.1, base + noise)));
  }
  return data;
}

// Format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioWaveform({
  audioUrl,
  duration = 0,
  isPlaying = false,
  onPlayPause,
  onSeek,
  onDownload,
  currentTime = 0,
  className,
  compact = false,
  waveformData,
  color = 'primary',
  showVolume = false,
}: AudioWaveformProps) {
  const [internalPlaying, setInternalPlaying] = React.useState(isPlaying);
  const [internalTime, setInternalTime] = React.useState(currentTime);
  const [internalDuration, setInternalDuration] = React.useState(duration);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  
  const waveform = React.useMemo(
    () => waveformData || generateWaveformData(compact ? 30 : 50),
    [waveformData, compact]
  );

  const progress = internalDuration > 0 ? (internalTime / internalDuration) * 100 : 0;

  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    muted: 'bg-muted-foreground',
  };

  // Audio element handlers
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setInternalTime(audio.currentTime);
    const handleLoadedMetadata = () => setInternalDuration(audio.duration);
    const handleEnded = () => setInternalPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  React.useEffect(() => {
    setInternalPlaying(isPlaying);
  }, [isPlaying]);

  React.useEffect(() => {
    if (audioRef.current) {
      if (internalPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [internalPlaying]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    if (onPlayPause) {
      onPlayPause();
    } else {
      setInternalPlaying(!internalPlaying);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * internalDuration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    if (onSeek) {
      onSeek(newTime);
    } else {
      setInternalTime(newTime);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl',
        compact ? 'p-2' : 'p-3',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        className={cn(
          'flex-shrink-0 rounded-full',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          `bg-${color}/10 hover:bg-${color}/20`
        )}
      >
        {internalPlaying ? (
          <Pause className={cn('text-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        ) : (
          <Play className={cn('text-foreground ml-0.5', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        )}
      </Button>

      {/* Waveform visualization */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className={cn(
            'relative flex items-center cursor-pointer',
            compact ? 'h-6' : 'h-8'
          )}
          onClick={handleWaveformClick}
        >
          {/* Waveform bars */}
          <div className="absolute inset-0 flex items-center justify-between gap-px">
            {waveform.map((height, idx) => {
              const barProgress = (idx / waveform.length) * 100;
              const isPlayed = barProgress <= progress;
              
              return (
                <motion.div
                  key={idx}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: idx * 0.01, duration: 0.2 }}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-150',
                    isPlayed ? colorClasses[color] : 'bg-muted-foreground/30'
                  )}
                  style={{
                    height: `${height * 100}%`,
                    minHeight: '4px',
                  }}
                />
              );
            })}
          </div>

          {/* Progress indicator */}
          <motion.div
            className={cn(
              'absolute top-0 h-full rounded-full opacity-30',
              colorClasses[color]
            )}
            style={{ width: `${progress}%` }}
          />

          {/* Hover indicator */}
          {isHovering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-foreground/5 rounded"
            />
          )}
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{formatTime(internalTime)}</span>
          <span className="font-mono">{formatTime(internalDuration)}</span>
        </div>
      </div>

      {/* Volume control */}
      {showVolume && !compact && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={([v]) => {
              setVolume(v / 100);
              if (v > 0) setIsMuted(false);
            }}
            max={100}
            step={1}
            className="w-20"
          />
        </div>
      )}

      {/* Download button */}
      {onDownload && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Baixar áudio</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Compact inline waveform for message bubbles
interface InlineWaveformProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
  className?: string;
}

export function InlineWaveform({
  audioUrl,
  duration = 0,
  isOwn = false,
  className,
}: InlineWaveformProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  return (
    <AudioWaveform
      audioUrl={audioUrl}
      duration={duration}
      isPlaying={isPlaying}
      onPlayPause={() => setIsPlaying(!isPlaying)}
      compact
      color={isOwn ? 'primary' : 'muted'}
      className={cn(
        'min-w-[200px]',
        isOwn ? 'bg-primary/10' : 'bg-muted/50',
        className
      )}
    />
  );
}

// Voice recording indicator with live waveform
interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  duration: number;
  className?: string;
}

export function VoiceRecordingIndicator({
  isRecording,
  duration,
  className,
}: VoiceRecordingIndicatorProps) {
  const [levels, setLevels] = React.useState<number[]>(Array(20).fill(0.1));

  React.useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setLevels(prev => {
        const newLevels = [...prev.slice(1)];
        newLevels.push(Math.random() * 0.8 + 0.2);
        return newLevels;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-full bg-destructive/10',
        className
      )}
    >
      {/* Recording dot */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-3 h-3 rounded-full bg-destructive"
      />

      {/* Live waveform */}
      <div className="flex items-center gap-0.5 h-6">
        {levels.map((level, idx) => (
          <motion.div
            key={idx}
            animate={{ height: `${level * 100}%` }}
            transition={{ duration: 0.1 }}
            className="w-1 bg-destructive rounded-full"
            style={{ minHeight: '4px' }}
          />
        ))}
      </div>

      {/* Duration */}
      <span className="font-mono text-sm text-destructive font-medium min-w-[50px]">
        {formatTime(duration)}
      </span>
    </motion.div>
  );
}
