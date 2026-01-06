import { useCallback, useRef, useEffect, createContext, useContext, useState, ReactNode } from 'react';

// Sound effect types
export type SoundEffectType = 
  | 'send'
  | 'receive'
  | 'notification'
  | 'success'
  | 'error'
  | 'warning'
  | 'click'
  | 'hover'
  | 'toggle'
  | 'pop'
  | 'swoosh'
  | 'ding'
  | 'achievement'
  | 'levelUp'
  | 'goalReached'
  | 'typing';

interface SoundConfig {
  frequencies: number[];
  durations: number[];
  waveform: OscillatorType;
  gains: number[];
  delays: number[];
  filterFreq?: number;
  filterType?: BiquadFilterType;
}

// Premium sound configurations
const SOUND_CONFIGS: Record<SoundEffectType, SoundConfig> = {
  send: {
    frequencies: [523, 659, 784],
    durations: [0.08, 0.08, 0.12],
    waveform: 'sine',
    gains: [0.15, 0.18, 0.12],
    delays: [0, 0.04, 0.08],
  },
  receive: {
    frequencies: [784, 659],
    durations: [0.1, 0.15],
    waveform: 'sine',
    gains: [0.12, 0.18],
    delays: [0, 0.08],
  },
  notification: {
    frequencies: [880, 1047, 1319],
    durations: [0.1, 0.1, 0.15],
    waveform: 'sine',
    gains: [0.15, 0.2, 0.15],
    delays: [0, 0.1, 0.2],
  },
  success: {
    frequencies: [523, 659, 784, 1047],
    durations: [0.08, 0.08, 0.08, 0.2],
    waveform: 'sine',
    gains: [0.12, 0.15, 0.18, 0.15],
    delays: [0, 0.08, 0.16, 0.24],
  },
  error: {
    frequencies: [200, 180],
    durations: [0.15, 0.2],
    waveform: 'square',
    gains: [0.1, 0.08],
    delays: [0, 0.18],
    filterFreq: 800,
    filterType: 'lowpass',
  },
  warning: {
    frequencies: [440, 523, 440],
    durations: [0.1, 0.1, 0.15],
    waveform: 'triangle',
    gains: [0.12, 0.15, 0.1],
    delays: [0, 0.12, 0.24],
  },
  click: {
    frequencies: [1200],
    durations: [0.03],
    waveform: 'sine',
    gains: [0.08],
    delays: [0],
  },
  hover: {
    frequencies: [1600],
    durations: [0.02],
    waveform: 'sine',
    gains: [0.04],
    delays: [0],
  },
  toggle: {
    frequencies: [880, 1175],
    durations: [0.05, 0.08],
    waveform: 'sine',
    gains: [0.1, 0.08],
    delays: [0, 0.03],
  },
  pop: {
    frequencies: [300, 600],
    durations: [0.05, 0.08],
    waveform: 'sine',
    gains: [0.15, 0.1],
    delays: [0, 0.02],
  },
  swoosh: {
    frequencies: [200, 400, 800],
    durations: [0.08, 0.1, 0.12],
    waveform: 'sine',
    gains: [0.08, 0.1, 0.06],
    delays: [0, 0.03, 0.06],
    filterFreq: 2000,
    filterType: 'bandpass',
  },
  ding: {
    frequencies: [1319, 1568],
    durations: [0.15, 0.25],
    waveform: 'sine',
    gains: [0.2, 0.15],
    delays: [0, 0.05],
  },
  achievement: {
    frequencies: [523, 659, 784, 1047, 1319],
    durations: [0.1, 0.1, 0.1, 0.12, 0.3],
    waveform: 'sine',
    gains: [0.12, 0.15, 0.18, 0.2, 0.18],
    delays: [0, 0.1, 0.2, 0.3, 0.42],
  },
  levelUp: {
    frequencies: [392, 523, 659, 784, 1047, 1319],
    durations: [0.08, 0.08, 0.08, 0.1, 0.12, 0.35],
    waveform: 'sine',
    gains: [0.1, 0.12, 0.15, 0.18, 0.2, 0.22],
    delays: [0, 0.08, 0.16, 0.24, 0.34, 0.48],
  },
  goalReached: {
    frequencies: [659, 784, 988, 1319, 1568],
    durations: [0.12, 0.1, 0.1, 0.15, 0.4],
    waveform: 'sine',
    gains: [0.15, 0.18, 0.2, 0.22, 0.2],
    delays: [0, 0.12, 0.24, 0.38, 0.55],
  },
  typing: {
    frequencies: [800 + Math.random() * 400],
    durations: [0.02],
    waveform: 'sine',
    gains: [0.03],
    delays: [0],
  },
};

interface SoundContextType {
  playSound: (type: SoundEffectType) => void;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  enabled: boolean;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [volume, setVolume] = useState(50);
  const [enabled, setEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundEffectType) => {
    if (!enabled || volume === 0) return;

    try {
      const ctx = getAudioContext();
      const config = SOUND_CONFIGS[type];
      const volumeMultiplier = volume / 100;

      config.frequencies.forEach((freq, index) => {
        const delay = config.delays[index];

        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Optional filter
          if (config.filterFreq && config.filterType) {
            const filter = ctx.createBiquadFilter();
            filter.type = config.filterType;
            filter.frequency.value = config.filterFreq;
            oscillator.connect(filter);
            filter.connect(gainNode);
          } else {
            oscillator.connect(gainNode);
          }

          gainNode.connect(ctx.destination);

          oscillator.type = config.waveform;
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

          const baseGain = config.gains[index] * volumeMultiplier;
          const duration = config.durations[index];

          // Smooth envelope
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);
        }, delay * 1000);
      });
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }, [enabled, volume, getAudioContext]);

  return (
    <SoundContext.Provider value={{ playSound, setVolume, setEnabled, volume, enabled }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundEffects() {
  const context = useContext(SoundContext);
  
  if (!context) {
    // Return a no-op version if not in provider
    return {
      playSound: () => {},
      setVolume: () => {},
      setEnabled: () => {},
      volume: 0,
      enabled: false,
    };
  }

  return context;
}

// Hook for button sounds
export function useButtonSound() {
  const { playSound, enabled } = useSoundEffects();
  
  const onClick = useCallback(() => {
    if (enabled) playSound('click');
  }, [playSound, enabled]);

  const onHover = useCallback(() => {
    if (enabled) playSound('hover');
  }, [playSound, enabled]);

  return { onClick, onHover };
}

// Hook for message sounds
export function useMessageSound() {
  const { playSound, enabled } = useSoundEffects();
  
  const onSend = useCallback(() => {
    if (enabled) playSound('send');
  }, [playSound, enabled]);

  const onReceive = useCallback(() => {
    if (enabled) playSound('receive');
  }, [playSound, enabled]);

  return { onSend, onReceive };
}

// Hook for achievement/gamification sounds
export function useAchievementSound() {
  const { playSound, enabled } = useSoundEffects();
  
  const onAchievement = useCallback(() => {
    if (enabled) playSound('achievement');
  }, [playSound, enabled]);

  const onLevelUp = useCallback(() => {
    if (enabled) playSound('levelUp');
  }, [playSound, enabled]);

  const onGoalReached = useCallback(() => {
    if (enabled) playSound('goalReached');
  }, [playSound, enabled]);

  return { onAchievement, onLevelUp, onGoalReached };
}

// Component to add sound to any element
interface WithSoundProps {
  children: ReactNode;
  sound?: SoundEffectType;
  onClickSound?: SoundEffectType;
  onHoverSound?: SoundEffectType;
}

export function WithSound({ 
  children, 
  sound = 'click', 
  onClickSound,
  onHoverSound = 'hover' 
}: WithSoundProps) {
  const { playSound } = useSoundEffects();

  return (
    <div
      onClick={() => playSound(onClickSound || sound)}
      onMouseEnter={() => playSound(onHoverSound)}
    >
      {children}
    </div>
  );
}
