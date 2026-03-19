import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sticker, Search, Plus, Star, Trash2, Loader2, Upload, X, Tag, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface StickerItem {
  id: string;
  name: string | null;
  image_url: string;
  category: string;
  is_favorite: boolean;
  use_count: number;
}

interface StickerPickerProps {
  onSendSticker: (stickerUrl: string) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  'comemoração': { emoji: '🎉', label: 'Comemoração' },
  'riso': { emoji: '😂', label: 'Riso' },
  'chorando': { emoji: '😢', label: 'Chorando' },
  'amor': { emoji: '❤️', label: 'Amor' },
  'raiva': { emoji: '😡', label: 'Raiva' },
  'surpresa': { emoji: '😲', label: 'Surpresa' },
  'pensativo': { emoji: '🤔', label: 'Pensativo' },
  'cumprimento': { emoji: '👋', label: 'Cumprimento' },
  'despedida': { emoji: '👋', label: 'Despedida' },
  'concordância': { emoji: '👍', label: 'Concordância' },
  'negação': { emoji: '🙅', label: 'Negação' },
  'sono': { emoji: '😴', label: 'Sono' },
  'fome': { emoji: '🍔', label: 'Fome' },
  'medo': { emoji: '😨', label: 'Medo' },
  'vergonha': { emoji: '🙈', label: 'Vergonha' },
  'deboche': { emoji: '😏', label: 'Deboche' },
  'fofo': { emoji: '🥰', label: 'Fofo' },
  'triste': { emoji: '😔', label: 'Triste' },
  'animado': { emoji: '🤩', label: 'Animado' },
  'outros': { emoji: '📦', label: 'Outros' },
  'recebidas': { emoji: '📥', label: 'Recebidas' },
  'enviadas': { emoji: '📤', label: 'Enviadas' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

// ── Category Selector (inline dropdown) ──
function CategorySelector({ value, onChange, size = 'sm' }: { value: string; onChange: (cat: string) => void; size?: 'sm' | 'xs' }) {
  const [open, setOpen] = useState(false);
  const info = CATEGORY_LABELS[value] || { emoji: '📦', label: value };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 rounded-md border border-border/50 transition-colors hover:bg-muted/60',
            size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span>{info.emoji}</span>
          <span className="text-muted-foreground">{info.label}</span>
          <ChevronDown className={cn(size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3', 'text-muted-foreground/60')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-1.5 max-h-[240px] overflow-y-auto"
        align="start"
        side="bottom"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {ALL_CATEGORIES.map(cat => {
            const catInfo = CATEGORY_LABELS[cat];
            const isActive = cat === value;
            return (
              <button
                key={cat}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(cat);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left',
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                )}
              >
                <span>{catInfo.emoji}</span>
                <span className="flex-1">{catInfo.label}</span>
                {isActive && <Check className="w-3 h-3 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Upload Preview (shows sticker with AI suggestion + manual override before saving) ──
interface PendingUpload {
  file: File;
  imageUrl: string;
  storagePath: string;
  aiCategory: string;
  selectedCategory: string;
  name: string;
}

function UploadPreview({ pending, onConfirm, onCancel }: {
  pending: PendingUpload;
  onConfirm: (p: PendingUpload) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(pending.selectedCategory);
  const [name, setName] = useState(pending.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 border border-border rounded-lg bg-card space-y-2.5"
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center border border-border/30">
          <img src={pending.imageUrl} alt="Preview" className="w-full h-full object-contain p-0.5" />
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-xs flex-1"
          placeholder="Nome da figurinha"
        />
      </div>

      <div className="flex items-center gap-2">
        <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground shrink-0">Categoria:</span>
        <CategorySelector value={category} onChange={setCategory} size="sm" />
        {pending.aiCategory !== 'outros' && pending.aiCategory !== 'enviadas' && category !== pending.aiCategory && (
          <button
            onClick={() => setCategory(pending.aiCategory)}
            className="text-[9px] text-primary hover:underline shrink-0"
          >
            IA sugere: {CATEGORY_LABELS[pending.aiCategory]?.label}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancelar
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => onConfirm({ ...pending, selectedCategory: category, name })}>
          <Check className="w-3 h-3 mr-1" /> Salvar
        </Button>
      </div>
    </motion.div>
  );
}

export function StickerPicker({ onSendSticker, disabled }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStickers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(200);

    if (!error && data) {
      setStickers(data as StickerItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchStickers();
  }, [open, fetchStickers]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo não é uma imagem válida');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Arquivo excede 500KB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'webp';
      const storagePath = `sticker_${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(storagePath, file, { contentType: file.type, cacheControl: '31536000' });

      if (uploadError) {
        toast.error('Erro ao enviar arquivo');
        return;
      }

      const { data: urlData } = supabase.storage.from('stickers').getPublicUrl(storagePath);

      // Classify with AI
      let aiCategory = 'enviadas';
      try {
        toast.info('🔍 Classificando figurinha com IA...');
        const { data: classifyData, error: classifyErr } = await supabase.functions.invoke('classify-sticker', {
          body: { image_url: urlData.publicUrl },
        });
        if (!classifyErr && classifyData?.category) {
          aiCategory = classifyData.category;
        }
      } catch { /* fallback */ }

      setPendingUpload({
        file,
        imageUrl: urlData.publicUrl,
        storagePath,
        aiCategory,
        selectedCategory: aiCategory,
        name: file.name.replace(/\.[^.]+$/, ''),
      });
    } catch {
      toast.error('Erro ao processar figurinha');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async (pending: PendingUpload) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('stickers').insert({
      name: pending.name,
      image_url: pending.imageUrl,
      category: pending.selectedCategory,
      is_favorite: false,
      use_count: 0,
      uploaded_by: user?.id || null,
    });

    if (insertError) {
      console.error('[StickerPicker] Insert error:', insertError);
      toast.error('Erro ao salvar figurinha no banco de dados');
      return;
    }

    toast.success(`Figurinha salva como "${CATEGORY_LABELS[pending.selectedCategory]?.label || pending.selectedCategory}"!`);
    setPendingUpload(null);
    fetchStickers();
  };

  const handleCancelUpload = async () => {
    if (pendingUpload) {
      await supabase.storage.from('stickers').remove([pendingUpload.storagePath]);
    }
    setPendingUpload(null);
  };

  const handleSend = async (sticker: StickerItem) => {
    onSendSticker(sticker.image_url);
    setOpen(false);
    await supabase
      .from('stickers')
      .update({ use_count: (sticker.use_count || 0) + 1 })
      .eq('id', sticker.id);
  };

  const toggleFavorite = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    const newVal = !sticker.is_favorite;
    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, is_favorite: newVal } : s));
    await supabase.from('stickers').update({ is_favorite: newVal }).eq('id', sticker.id);
  };

  const handleCategoryChange = async (sticker: StickerItem, newCategory: string) => {
    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, category: newCategory } : s));
    await supabase.from('stickers').update({ category: newCategory }).eq('id', sticker.id);
    toast.success(`Categoria alterada para "${CATEGORY_LABELS[newCategory]?.label || newCategory}"`);
  };

  const handleDelete = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    setStickers(prev => prev.filter(s => s.id !== sticker.id));
    const path = sticker.image_url.split('/stickers/')[1];
    if (path) await supabase.storage.from('stickers').remove([path]);
    await supabase.from('stickers').delete().eq('id', sticker.id);
    toast.success('Figurinha removida');
  };

  // Get unique categories that have stickers
  const categories = [...new Set(stickers.map(s => s.category).filter(Boolean))].sort();

  const filtered = stickers.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase());
    if (showFavorites) return matchSearch && s.is_favorite;
    if (activeCategory) return matchSearch && s.category === activeCategory;
    return matchSearch;
  });

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) setPendingUpload(null);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          title="Figurinhas"
          disabled={disabled}
        >
          <Sticker className="w-[18px] h-[18px]" />
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
            <Sticker className="w-4 h-4 text-primary" />
            Figurinhas
          </h4>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/webp,image/png,image/gif,image/jpeg"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !!pendingUpload}
              title="Adicionar figurinha"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Upload preview */}
        <AnimatePresence>
          {pendingUpload && (
            <div className="px-3 py-2 border-b border-border/50">
              <UploadPreview
                pending={pendingUpload}
                onConfirm={handleConfirmUpload}
                onCancel={handleCancelUpload}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar figurinhas..."
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
                Todas ({stickers.length})
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
                <Star className="w-3 h-3" /> Favoritas
              </button>
              {categories.map(cat => {
                const info = CATEGORY_LABELS[cat];
                const count = stickers.filter(s => s.category === cat).length;
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

        {/* Stickers grid */}
        <ScrollArea className="h-[260px]">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Sticker className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  {search ? 'Nenhuma figurinha encontrada' : 'Nenhuma figurinha'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em <Plus className="w-3 h-3 inline" /> para adicionar
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                <AnimatePresence>
                  {filtered.map((sticker) => (
                    <motion.button
                      key={sticker.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSend(sticker)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden group',
                        'bg-muted/30 hover:bg-muted/60 transition-colors',
                        'border border-transparent hover:border-primary/30',
                        'cursor-pointer'
                      )}
                      title={`${sticker.name || 'Figurinha'} • ${CATEGORY_LABELS[sticker.category]?.label || sticker.category}`}
                    >
                      <img
                        src={sticker.image_url}
                        alt={sticker.name || 'Sticker'}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                      {/* Category badge */}
                      <span className="absolute top-0.5 left-0.5 text-[9px] leading-none">
                        {CATEGORY_LABELS[sticker.category]?.emoji || '📦'}
                      </span>
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-1">
                        <div className="flex items-center justify-between w-full">
                          <button onClick={(e) => toggleFavorite(e, sticker)} className="p-0.5">
                            <Star className={cn(
                              'w-3.5 h-3.5 transition-colors',
                              sticker.is_favorite ? 'fill-primary text-primary' : 'text-muted-foreground'
                            )} />
                          </button>
                          <button onClick={(e) => handleDelete(e, sticker)} className="p-0.5">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                        {/* Inline category edit */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <CategorySelector
                            value={sticker.category}
                            onChange={(cat) => handleCategoryChange(sticker, cat)}
                            size="xs"
                          />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {filtered.length}/{stickers.length} figurinhas · IA + edição manual
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground hover:text-primary gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!pendingUpload}
          >
            <Upload className="w-3 h-3" />
            Upload
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
