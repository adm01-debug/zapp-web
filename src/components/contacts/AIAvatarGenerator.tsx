import { useState } from 'react';
import { log } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, RefreshCw, Download, Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIAvatarGeneratorProps {
  contactName: string;
  currentAvatar?: string;
  onAvatarGenerated: (avatarUrl: string) => void;
}

const AVATAR_STYLES = [
  { id: 'professional', label: 'Profissional', description: 'Estilo corporativo' },
  { id: 'cartoon', label: 'Cartoon', description: 'Estilo animado' },
  { id: 'minimalist', label: 'Minimalista', description: 'Design simples' },
  { id: 'artistic', label: 'Artístico', description: 'Estilo ilustração' },
  { id: 'geometric', label: 'Geométrico', description: 'Formas abstratas' },
];

const COLOR_SCHEMES = [
  { id: 'vibrant', label: 'Vibrante', colors: ['#FF6B6B', '#4ECDC4', '#FFE66D'] },
  { id: 'pastel', label: 'Pastel', colors: ['#FFB5E8', '#B5DEFF', '#BFFCC6'] },
  { id: 'corporate', label: 'Corporativo', colors: ['#2C3E50', '#3498DB', '#95A5A6'] },
  { id: 'warm', label: 'Quente', colors: ['#F39C12', '#E74C3C', '#9B59B6'] },
  { id: 'cool', label: 'Frio', colors: ['#00B894', '#0984E3', '#6C5CE7'] },
];

export function AIAvatarGenerator({ 
  contactName, 
  currentAvatar, 
  onAvatarGenerated 
}: AIAvatarGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [style, setStyle] = useState('professional');
  const [colorScheme, setColorScheme] = useState('vibrant');
  const [customPrompt, setCustomPrompt] = useState('');

  const generateAvatar = async () => {
    setIsGenerating(true);
    
    try {
      const initials = contactName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const styleConfig = AVATAR_STYLES.find(s => s.id === style);
      const colorConfig = COLOR_SCHEMES.find(c => c.id === colorScheme);

      const prompt = customPrompt || 
        `A ${styleConfig?.label.toLowerCase()} style avatar portrait for a person named "${contactName}". 
         Use colors ${colorConfig?.colors.join(', ')}. 
         ${style === 'professional' ? 'Corporate headshot style, clean background.' : ''}
         ${style === 'cartoon' ? 'Pixar-like 3D cartoon character, friendly expression.' : ''}
         ${style === 'minimalist' ? 'Simple flat design, geometric shapes, clean lines.' : ''}
         ${style === 'artistic' ? 'Artistic illustration, watercolor or digital painting style.' : ''}
         ${style === 'geometric' ? 'Abstract geometric pattern forming a face, modern art style.' : ''}
         The initials "${initials}" could be subtly incorporated. Square format, suitable as profile picture.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate avatar');
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        setGeneratedAvatar(imageUrl);
        toast({
          title: '✨ Avatar gerado!',
          description: 'Clique em "Usar Avatar" para aplicar.',
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error) {
      log.error('Error generating avatar:', error);
      toast({
        title: 'Erro ao gerar avatar',
        description: 'Tente novamente ou use um estilo diferente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseAvatar = () => {
    if (generatedAvatar) {
      onAvatarGenerated(generatedAvatar);
      setIsOpen(false);
      toast({
        title: '✅ Avatar aplicado!',
        description: 'O avatar foi atualizado com sucesso.',
      });
    }
  };

  const downloadAvatar = () => {
    if (generatedAvatar) {
      const link = document.createElement('a');
      link.href = generatedAvatar;
      link.download = `avatar-${contactName.replace(/\s+/g, '-')}.png`;
      link.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Gerar Avatar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Avatar com IA
          </DialogTitle>
          <DialogDescription>
            Crie um avatar único para {contactName} usando inteligência artificial
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-border">
                <AvatarImage src={generatedAvatar || currentAvatar} />
                <AvatarFallback className="text-3xl">
                  {contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Estilo do Avatar</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVATAR_STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label>Paleta de Cores</Label>
            <Select value={colorScheme} onValueChange={setColorScheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_SCHEMES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {c.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span>{c.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label>Prompt Personalizado (Opcional)</Label>
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Avatar com fundo de escritório moderno..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={generateAvatar} 
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {generatedAvatar ? 'Regenerar' : 'Gerar Avatar'}
                </>
              )}
            </Button>

            {generatedAvatar && (
              <>
                <Button variant="outline" size="icon" onClick={downloadAvatar}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button onClick={handleUseAvatar}>
                  <Check className="h-4 w-4 mr-2" />
                  Usar Avatar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
