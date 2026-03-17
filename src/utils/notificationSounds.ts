// Advanced notification sound system with customizable sounds
import { log } from '@/lib/logger';

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export type SoundType = 'beep' | 'chime' | 'bell' | 'alert' | 'soft';
export type NotificationType = 'message' | 'mention' | 'alert' | 'sla_breach' | 'sla_warning' | 'achievement' | 'goal_achieved';

interface SoundConfig {
  frequencies: number[];
  durations: number[];
  waveform: OscillatorType;
  gains: number[];
  delays: number[];
}

const SOUND_CONFIGS: Record<SoundType, Record<NotificationType, SoundConfig>> = {
  beep: {
    message: {
      frequencies: [880, 1100],
      durations: [0.1, 0.1],
      waveform: 'sine',
      gains: [0.3, 0.2],
      delays: [0, 0.1],
    },
    mention: {
      frequencies: [1200, 1400, 1200],
      durations: [0.1, 0.1, 0.15],
      waveform: 'sine',
      gains: [0.3, 0.35, 0.25],
      delays: [0, 0.12, 0.24],
    },
    alert: {
      frequencies: [440, 880, 440],
      durations: [0.2, 0.15, 0.25],
      waveform: 'square',
      gains: [0.4, 0.45, 0.35],
      delays: [0, 0.22, 0.4],
    },
    sla_breach: {
      frequencies: [440, 880, 440],
      durations: [0.2, 0.15, 0.25],
      waveform: 'square',
      gains: [0.4, 0.45, 0.35],
      delays: [0, 0.22, 0.4],
    },
    sla_warning: {
      frequencies: [660, 880],
      durations: [0.15, 0.2],
      waveform: 'triangle',
      gains: [0.3, 0.35],
      delays: [0, 0.18],
    },
    achievement: {
      frequencies: [523, 659, 784, 1047],
      durations: [0.12, 0.12, 0.12, 0.3],
      waveform: 'sine',
      gains: [0.25, 0.3, 0.35, 0.4],
      delays: [0, 0.15, 0.3, 0.45],
    },
    goal_achieved: {
      frequencies: [659, 784, 988, 1319],
      durations: [0.15, 0.12, 0.12, 0.35],
      waveform: 'sine',
      gains: [0.3, 0.35, 0.4, 0.45],
      delays: [0, 0.18, 0.36, 0.55],
    },
  },
  chime: {
    message: {
      frequencies: [1047, 1319],
      durations: [0.2, 0.25],
      waveform: 'sine',
      gains: [0.25, 0.2],
      delays: [0, 0.15],
    },
    mention: {
      frequencies: [784, 988, 1319],
      durations: [0.15, 0.15, 0.25],
      waveform: 'sine',
      gains: [0.2, 0.25, 0.3],
      delays: [0, 0.12, 0.24],
    },
    alert: {
      frequencies: [523, 392, 330],
      durations: [0.25, 0.25, 0.4],
      waveform: 'sine',
      gains: [0.35, 0.4, 0.35],
      delays: [0, 0.28, 0.56],
    },
    sla_breach: {
      frequencies: [523, 392, 330],
      durations: [0.25, 0.25, 0.4],
      waveform: 'sine',
      gains: [0.35, 0.4, 0.35],
      delays: [0, 0.28, 0.56],
    },
    sla_warning: {
      frequencies: [659, 523],
      durations: [0.2, 0.3],
      waveform: 'sine',
      gains: [0.3, 0.25],
      delays: [0, 0.22],
    },
    achievement: {
      frequencies: [523, 659, 784, 1047, 1319],
      durations: [0.1, 0.1, 0.1, 0.15, 0.35],
      waveform: 'sine',
      gains: [0.2, 0.25, 0.3, 0.35, 0.4],
      delays: [0, 0.1, 0.2, 0.3, 0.45],
    },
    goal_achieved: {
      frequencies: [659, 784, 988, 1319],
      durations: [0.15, 0.12, 0.12, 0.35],
      waveform: 'sine',
      gains: [0.3, 0.35, 0.4, 0.45],
      delays: [0, 0.18, 0.36, 0.55],
    },
  },
  bell: {
    message: {
      frequencies: [1175, 880],
      durations: [0.3, 0.2],
      waveform: 'sine',
      gains: [0.35, 0.2],
      delays: [0, 0.05],
    },
    mention: {
      frequencies: [1175, 1480, 1175],
      durations: [0.2, 0.15, 0.25],
      waveform: 'sine',
      gains: [0.3, 0.35, 0.25],
      delays: [0, 0.15, 0.32],
    },
    alert: {
      frequencies: [587, 440, 349],
      durations: [0.3, 0.3, 0.5],
      waveform: 'triangle',
      gains: [0.4, 0.45, 0.35],
      delays: [0, 0.35, 0.7],
    },
    sla_breach: {
      frequencies: [587, 440, 349],
      durations: [0.3, 0.3, 0.5],
      waveform: 'triangle',
      gains: [0.4, 0.45, 0.35],
      delays: [0, 0.35, 0.7],
    },
    sla_warning: {
      frequencies: [784, 587],
      durations: [0.25, 0.35],
      waveform: 'sine',
      gains: [0.35, 0.3],
      delays: [0, 0.28],
    },
    achievement: {
      frequencies: [587, 784, 988, 1175, 1480],
      durations: [0.12, 0.12, 0.12, 0.15, 0.4],
      waveform: 'sine',
      gains: [0.25, 0.3, 0.35, 0.4, 0.45],
      delays: [0, 0.12, 0.24, 0.36, 0.5],
    },
    goal_achieved: {
      frequencies: [587, 784, 988, 1175, 1480],
      durations: [0.12, 0.12, 0.12, 0.15, 0.4],
      waveform: 'sine',
      gains: [0.25, 0.3, 0.35, 0.4, 0.45],
      delays: [0, 0.12, 0.24, 0.36, 0.5],
    },
  },
  alert: {
    message: {
      frequencies: [800, 1000],
      durations: [0.08, 0.08],
      waveform: 'square',
      gains: [0.2, 0.15],
      delays: [0, 0.1],
    },
    mention: {
      frequencies: [1000, 1200, 1000],
      durations: [0.08, 0.08, 0.12],
      waveform: 'square',
      gains: [0.2, 0.25, 0.18],
      delays: [0, 0.1, 0.2],
    },
    alert: {
      frequencies: [400, 600, 400, 600],
      durations: [0.15, 0.15, 0.15, 0.2],
      waveform: 'square',
      gains: [0.35, 0.4, 0.35, 0.3],
      delays: [0, 0.18, 0.36, 0.54],
    },
    sla_breach: {
      frequencies: [400, 600, 400, 600],
      durations: [0.15, 0.15, 0.15, 0.2],
      waveform: 'square',
      gains: [0.35, 0.4, 0.35, 0.3],
      delays: [0, 0.18, 0.36, 0.54],
    },
    sla_warning: {
      frequencies: [600, 500],
      durations: [0.12, 0.15],
      waveform: 'square',
      gains: [0.3, 0.25],
      delays: [0, 0.15],
    },
    achievement: {
      frequencies: [600, 800, 1000, 1200],
      durations: [0.08, 0.08, 0.08, 0.2],
      waveform: 'square',
      gains: [0.2, 0.25, 0.3, 0.35],
      delays: [0, 0.1, 0.2, 0.3],
    },
    goal_achieved: {
      frequencies: [600, 800, 1000, 1200],
      durations: [0.08, 0.08, 0.08, 0.2],
      waveform: 'square',
      gains: [0.2, 0.25, 0.3, 0.35],
      delays: [0, 0.1, 0.2, 0.3],
    },
  },
  soft: {
    message: {
      frequencies: [440, 550],
      durations: [0.25, 0.3],
      waveform: 'sine',
      gains: [0.15, 0.12],
      delays: [0, 0.2],
    },
    mention: {
      frequencies: [550, 660, 550],
      durations: [0.2, 0.2, 0.25],
      waveform: 'sine',
      gains: [0.15, 0.18, 0.12],
      delays: [0, 0.22, 0.44],
    },
    alert: {
      frequencies: [330, 440, 330],
      durations: [0.3, 0.25, 0.35],
      waveform: 'sine',
      gains: [0.25, 0.3, 0.22],
      delays: [0, 0.32, 0.6],
    },
    sla_breach: {
      frequencies: [330, 440, 330],
      durations: [0.3, 0.25, 0.35],
      waveform: 'sine',
      gains: [0.25, 0.3, 0.22],
      delays: [0, 0.32, 0.6],
    },
    sla_warning: {
      frequencies: [440, 392],
      durations: [0.25, 0.3],
      waveform: 'sine',
      gains: [0.2, 0.18],
      delays: [0, 0.28],
    },
    achievement: {
      frequencies: [392, 440, 523, 659],
      durations: [0.15, 0.15, 0.18, 0.4],
      waveform: 'sine',
      gains: [0.15, 0.18, 0.22, 0.28],
      delays: [0, 0.18, 0.36, 0.55],
    },
    goal_achieved: {
      frequencies: [392, 440, 523, 659],
      durations: [0.15, 0.15, 0.18, 0.4],
      waveform: 'sine',
      gains: [0.15, 0.18, 0.22, 0.28],
      delays: [0, 0.18, 0.36, 0.55],
    },
  },
};

export const playNotificationSound = (
  notificationType: NotificationType,
  soundType: SoundType = 'chime',
  volume: number = 70
) => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const config = SOUND_CONFIGS[soundType][notificationType];
    const volumeMultiplier = volume / 100;

    config.frequencies.forEach((freq, index) => {
      const delay = config.delays[index];
      
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = config.waveform;
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

        const baseGain = config.gains[index] * volumeMultiplier;
        const duration = config.durations[index];

        // Smooth envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      }, delay * 1000);
    });
  } catch (error) {
    log.warn('Could not play notification sound:', error);
  }
};

// Test sound preview
export const previewSound = (soundType: SoundType, volume: number = 70) => {
  playNotificationSound('message', soundType, volume);
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    log.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Show browser notification
export const showBrowserNotification = (
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag || 'notification',
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};
