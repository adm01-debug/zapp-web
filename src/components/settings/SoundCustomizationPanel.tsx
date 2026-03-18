import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Bell,
  MessageSquare,
  AlertTriangle,
  Trophy,
  Clock,
  Moon,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';

interface SoundOption {
  id: string;
  name: string;
  description: string;
}

const SOUND_CATEGORIES = {
  message: {
    label: 'Mensagens',
    icon: MessageSquare,
    description: 'Som para novas mensagens recebidas',
    sounds: [
      { id: 'default', name: 'Padrão', description: 'Som clássico de notificação' },
      { id: 'pop', name: 'Pop', description: 'Som leve e suave' },
      { id: 'chime', name: 'Chime', description: 'Som melodioso' },
      { id: 'ding', name: 'Ding', description: 'Som curto e direto' },
      { id: 'bubble', name: 'Bubble', description: 'Som de bolha' },
      { id: 'none', name: 'Silencioso', description: 'Sem som' },
    ],
  },
  mention: {
    label: 'Menções',
    icon: Bell,
    description: 'Som quando você é mencionado',
    sounds: [
      { id: 'default', name: 'Padrão', description: 'Som de menção' },
      { id: 'alert', name: 'Alerta', description: 'Som de atenção' },
      { id: 'bell', name: 'Sino', description: 'Som de sino' },
      { id: 'ping', name: 'Ping', description: 'Som agudo' },
      { id: 'none', name: 'Silencioso', description: 'Sem som' },
    ],
  },
  sla: {
    label: 'SLA',
    icon: AlertTriangle,
    description: 'Alertas de SLA próximo de vencer',
    sounds: [
      { id: 'default', name: 'Padrão', description: 'Alerta urgente' },
      { id: 'urgent', name: 'Urgente', description: 'Som de alta prioridade' },
      { id: 'warning', name: 'Aviso', description: 'Som de aviso' },
      { id: 'alarm', name: 'Alarme', description: 'Som intenso' },
      { id: 'none', name: 'Silencioso', description: 'Sem som' },
    ],
  },
  goal: {
    label: 'Metas',
    icon: Trophy,
    description: 'Celebração ao atingir metas',
    sounds: [
      { id: 'default', name: 'Padrão', description: 'Som de conquista' },
      { id: 'fanfare', name: 'Fanfarra', description: 'Som festivo' },
      { id: 'achievement', name: 'Achievement', description: 'Som de conquista épica' },
      { id: 'levelup', name: 'Level Up', description: 'Som de evolução' },
      { id: 'none', name: 'Silencioso', description: 'Sem som' },
    ],
  },
  transcription: {
    label: 'Transcrição',
    icon: Clock,
    description: 'Quando uma transcrição é concluída',
    sounds: [
      { id: 'default', name: 'Padrão', description: 'Som de conclusão' },
      { id: 'complete', name: 'Completo', description: 'Som de tarefa concluída' },
      { id: 'success', name: 'Sucesso', description: 'Som positivo' },
      { id: 'none', name: 'Silencioso', description: 'Sem som' },
    ],
  },
};

// Reuse a single AudioContext to prevent resource leaks
let sharedAudioContext: AudioContext | null = null;
const getSharedAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

// Simulate sound preview (in a real app, these would be actual audio files)
const playSoundPreview = (soundId: string, category: string) => {
  // Reuse shared AudioContext
  const audioContext = getSharedAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Different frequencies for different sound types
  const frequencies: Record<string, number> = {
    default: 440,
    pop: 880,
    chime: 660,
    ding: 1000,
    bubble: 300,
    alert: 520,
    bell: 700,
    ping: 1200,
    urgent: 600,
    warning: 500,
    alarm: 800,
    fanfare: 550,
    achievement: 750,
    levelup: 900,
    complete: 480,
    success: 640,
  };
  
  oscillator.frequency.setValueAtTime(
    frequencies[soundId] || 440,
    audioContext.currentTime
  );
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export function SoundCustomizationPanel() {
  const { settings, updateSettings } = useUserSettings();
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState(80);
  
  const handleSoundChange = (category: string, soundId: string) => {
    const key = `${category}_sound_type` as keyof typeof settings;
    updateSettings({ [key]: soundId });
    
    if (soundId !== 'none') {
      playSoundPreview(soundId, category);
      setPlayingSound(`${category}-${soundId}`);
      setTimeout(() => setPlayingSound(null), 500);
    }
  };
  
  const handlePlayPreview = (category: string, soundId: string) => {
    if (soundId === 'none') return;
    
    playSoundPreview(soundId, category);
    setPlayingSound(`${category}-${soundId}`);
    setTimeout(() => setPlayingSound(null), 500);
  };
  
  const getSoundValue = (category: string): string => {
    const key = `${category}_sound_type` as keyof typeof settings;
    return (settings[key] as string) || 'default';
  };

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="w-5 h-5 text-primary" />
            Controles Gerais
          </CardTitle>
          <CardDescription>
            Configure o som geral da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.sound_enabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base">Sons habilitados</Label>
                <p className="text-sm text-muted-foreground">
                  Ativa ou desativa todos os sons
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sound_enabled}
              onCheckedChange={(checked) => 
                updateSettings({ sound_enabled: checked })
              }
            />
          </div>
          
          {/* Master Volume */}
          <AnimatePresence>
            {settings.sound_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Label>Volume geral</Label>
                  <Badge variant="secondary">{masterVolume}%</Badge>
                </div>
                <Slider
                  value={[masterVolume]}
                  onValueChange={([value]) => setMasterVolume(value)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Quiet Hours */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base">Horário silencioso</Label>
                  <p className="text-sm text-muted-foreground">
                    Silenciar sons em determinados horários
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.quiet_hours_enabled}
                onCheckedChange={(checked) => 
                  updateSettings({ quiet_hours_enabled: checked })
                }
              />
            </div>
            
            <AnimatePresence>
              {settings.quiet_hours_enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <input
                      type="time"
                      value={settings.quiet_hours_start || '22:00'}
                      onChange={(e) => 
                        updateSettings({ quiet_hours_start: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Término</Label>
                    <input
                      type="time"
                      value={settings.quiet_hours_end || '08:00'}
                      onChange={(e) => 
                        updateSettings({ quiet_hours_end: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Individual Sound Categories */}
      <div className="grid gap-4">
        {Object.entries(SOUND_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const currentSound = getSoundValue(key);
          const isPlaying = playingSound?.startsWith(`${key}-`);
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn(
                'transition-all hover:border-primary/30',
                !settings.sound_enabled && 'opacity-50 pointer-events-none'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'p-2.5 rounded-lg shrink-0',
                      isPlaying ? 'bg-primary/20 animate-pulse' : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        isPlaying ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{category.label}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {category.description}
                      </p>
                    </div>
                    
                    {/* Sound Selector */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentSound}
                        onValueChange={(value) => handleSoundChange(key, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {category.sounds.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>
                              {sound.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={currentSound === 'none'}
                        onClick={() => handlePlayPreview(key, currentSound)}
                        className="shrink-0"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Custom Sound Upload (Future) */}
      <Card className="border-dashed border-2">
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">Sons Personalizados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Em breve: faça upload dos seus próprios sons de notificação
            </p>
            <Button variant="outline" disabled>
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
