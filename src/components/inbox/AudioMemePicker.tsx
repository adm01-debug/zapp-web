import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Plus, Star, Trash2, Loader2, Upload, X, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface AudioMemeItem {
  id: string;
  name: string;
  audio_url: string;
  category: string;
  duration_seconds: number | null;
  is_favorite: boolean;
  use_count: number;
}

interface AudioMemePickerProps {
  onSendAudio: (audioUrl: string) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  'risada': { emoji: '😂', label: 'Risada' },
  'aplausos': { emoji: '👏', label: 'Aplausos' },
  'suspense': { emoji: '🎭', label: 'Suspense' },
  'vitória': { emoji: '🏆', label: 'Vitória' },
  'falha': { emoji: '💥', label: 'Falha' },
  'surpresa': { emoji: '😱', label: 'Surpresa' },
  'triste': { emoji: '😢', label: 'Triste' },
  'raiva': { emoji: '😡', label: 'Raiva' },
  'romântico': { emoji: '💕', label: 'Romântico' },
  'medo': { emoji: '👻', label: 'Medo' },
  'deboche': { emoji: '😏', label: 'Deboche' },
  'narração': { emoji: '🎙️', label: 'Narração' },
  'bordão': { emoji: '💬', label: 'Bordão' },
  'efeito sonoro': { emoji: '🔊', label: 'Efeito Sonoro' },
  'viral': { emoji: '🔥', label: 'Viral' },
  'cumprimento': { emoji: '👋', label: 'Cumprimento' },
  'despedida': { emoji: '👋', label: 'Despedida' },
  'animação': { emoji: '🤩', label: 'Animação' },
  'drama': { emoji: '🎬', label: 'Drama' },
  'outros': { emoji: '📦', label: 'Outros' },
};

export function AudioMemePicker({ onSendAudio, disabled }: AudioMemePickerProps) {
  const [open, setOpen] = useState(false);
  const [memes, setMemes] = useState<AudioMemeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMemes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audio_memes')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(200);

    if (!error && data) {
      setMemes(data as AudioMemeItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchMemes();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [open, fetchMemes]);

  const handlePreview = (meme: AudioMemeItem) => {
    if (playingId === meme.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(meme.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(meme.id);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) {
          toast.error(`${file.name} não é um áudio válido`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} excede 5MB`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'mp3';
        const fileName = `meme_${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('audio-memes')
          .upload(fileName, file, { contentType: file.type, cacheControl: '31536000' });

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('audio-memes').getPublicUrl(fileName);

        // Get duration
        let duration: number | null = null;
        try {
          const tempAudio = new Audio(urlData.publicUrl);
          await new Promise<void>((resolve) => {
            tempAudio.onloadedmetadata = () => {
              duration = isFinite(tempAudio.duration) ? Math.round(tempAudio.duration * 100) / 100 : null;
              resolve();
            };
            tempAudio.onerror = () => resolve();
            setTimeout(resolve, 3000);
          });
        } catch { /* ignore */ }

        // Classify with AI
        let category = 'outros';
        try {
          toast.info('🔍 Classificando áudio meme...');
          const { data: classifyData, error: classifyErr } = await supabase.functions.invoke('classify-audio-meme', {
            body: { audio_url: urlData.publicUrl, file_name: file.name },
          });
          if (!classifyErr && classifyData?.category) {
            category = classifyData.category;
          }
        } catch { /* fallback */ }

        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audio_memes').insert({
          name: file.name.replace(/\.[^.]+$/, ''),
          audio_url: urlData.publicUrl,
          category,
          duration_seconds: duration,
          uploaded_by: user?.id || null,
        });

        toast.success(`Áudio salvo como "${CATEGORY_LABELS[category]?.label || category}"!`);
      }

      fetchMemes();
    } catch {
      toast.error('Erro ao processar áudio');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (meme: AudioMemeItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    onSendAudio(meme.audio_url);
    setOpen(false);
    await supabase
      .from('audio_memes')
      .update({ use_count: (meme.use_count || 0) + 1 })
      .eq('id', meme.id);
  };

  const toggleFavorite = async (e: React.MouseEvent, meme: AudioMemeItem) => {
    e.stopPropagation();
    const newVal = !meme.is_favorite;
    setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, is_favorite: newVal } : m));
    await supabase.from('audio_memes').update({ is_favorite: newVal }).eq('id', meme.id);
  };

  const handleDelete = async (e: React.MouseEvent, meme: AudioMemeItem) => {
    e.stopPropagation();
    setMemes(prev => prev.filter(m => m.id !== meme.id));
    const path = meme.audio_url.split('/audio-memes/')[1];
    if (path) await supabase.storage.from('audio-memes').remove([path]);
    await supabase.from('audio_memes').delete().eq('id', meme.id);
    toast.success('Áudio meme removido');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const categories = [...new Set(memes.map(m => m.category).filter(Boolean))].sort();

  const filtered = memes.filter(m => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase());
    if (showFavorites) return matchSearch && m.is_favorite;
    if (activeCategory) return matchSearch && m.category === activeCategory;
    return matchSearch;
  });

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          title="Áudios Meme"
          disabled={disabled}
        >
          <Volume2 className="w-[18px] h-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0 bg-popover border-border"
        align="end"
        side="top"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            Áudios Meme
          </h4>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Adicionar áudio meme"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar áudios meme..."
              className="h-8 pl-8 text-xs bg-muted/50 border-border/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="px-2 py-2 border-b border-border/30">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => { setActiveCategory(null); setShowFavorites(false); }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                  !activeCategory && !showFavorites
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Todos ({memes.length})
              </button>
              <button
                onClick={() => { setShowFavorites(!showFavorites); setActiveCategory(null); }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1',
                  showFavorites
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Star className="w-3 h-3" /> Favoritos
              </button>
              {categories.map(cat => {
                const info = CATEGORY_LABELS[cat];
                const count = memes.filter(m => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setShowFavorites(false); }}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {info?.emoji || '📦'} {info?.label || cat} ({count})
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Audio list */}
        <ScrollArea className="h-[280px]">
          <div className="p-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Music className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  {search ? 'Nenhum áudio encontrado' : 'Nenhum áudio meme'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em <Plus className="w-3 h-3 inline" /> para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {filtered.map((meme) => (
                    <motion.div
                      key={meme.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className={cn(
                        'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                        'hover:bg-muted/60 border border-transparent hover:border-border/40',
                        playingId === meme.id && 'bg-primary/5 border-primary/20'
                      )}
                      onClick={() => handleSend(meme)}
                    >
                      {/* Play/Pause preview */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePreview(meme); }}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                          playingId === meme.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
                        )}
                      >
                        {playingId === meme.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{meme.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {CATEGORY_LABELS[meme.category]?.emoji || '📦'} {CATEGORY_LABELS[meme.category]?.label || meme.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDuration(meme.duration_seconds)}
                          </span>
                          {meme.use_count > 0 && (
                            <span className="text-[10px] text-muted-foreground/50">
                              {meme.use_count}x
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => toggleFavorite(e, meme)} className="p-1 rounded hover:bg-muted">
                          <Star className={cn(
                            'w-3.5 h-3.5 transition-colors',
                            meme.is_favorite ? 'fill-primary text-primary' : 'text-muted-foreground'
                          )} />
                        </button>
                        <button onClick={(e) => handleDelete(e, meme)} className="p-1 rounded hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {filtered.length}/{memes.length} áudios · Clique para enviar · ▶ para ouvir
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground hover:text-primary gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3" />
            Upload
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
