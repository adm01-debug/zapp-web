import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Volume2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent?: string;
}

// Top ElevenLabs voices
export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Suave e natural', gender: 'female', accent: 'Americano' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Profissional e claro', gender: 'male', accent: 'Americano' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Amigável e calorosa', gender: 'female', accent: 'Americano' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual e jovem', gender: 'male', accent: 'Australiano' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Autoritário e confiante', gender: 'male', accent: 'Britânico' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Acolhedora e gentil', gender: 'female', accent: 'Americano' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Elegante e sofisticada', gender: 'female', accent: 'Britânico' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Narrando e envolvente', gender: 'male', accent: 'Britânico' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Profundo e cativante', gender: 'male', accent: 'Americano' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Expressiva e dinâmica', gender: 'female', accent: 'Americano' },
];

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  className?: string;
}

export function VoiceSelector({ selectedVoiceId, onVoiceChange, className }: VoiceSelectorProps) {
  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === selectedVoiceId) || ELEVENLABS_VOICES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 h-8", className)}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span className="text-xs">{selectedVoice.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Vozes ElevenLabs
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {ELEVENLABS_VOICES.map((voice) => (
            <DropdownMenuItem
              key={voice.id}
              onClick={() => onVoiceChange(voice.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{voice.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    voice.gender === 'female' 
                      ? "bg-pink-500/10 text-pink-500" 
                      : "bg-blue-500/10 text-blue-500"
                  )}>
                    {voice.gender === 'female' ? '♀' : '♂'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {voice.description} • {voice.accent}
                </span>
              </div>
              {selectedVoiceId === voice.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
