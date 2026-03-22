import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { Sticker, Search, Plus, Loader2, Upload, X, Grid3X3, LayoutGrid, Grid2X2 } from 'lucide-react';
import { toast } from 'sonner';

import { type StickerItem, type PendingUpload, CATEGORY_LABELS } from './stickers/StickerTypes';
import { StickerUploadPreview } from './stickers/StickerUploadPreview';
import { StickerGrid } from './stickers/StickerGrid';
import { StickerCategoryBar } from './stickers/StickerCategoryBar';

interface StickerPickerProps {
  onSendSticker: (stickerUrl: string) => void;
  disabled?: boolean;
}

const RECENT_LIMIT = 8;

export function StickerPicker({ onSendSticker, disabled }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchStickers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(1000);

    if (!error && data) {
      setStickers(data as StickerItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchStickers();
      // Focus search on open
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, fetchStickers]);

  // Keyboard shortcut: Ctrl+Shift+S to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo não é uma imagem válida');
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Arquivo excede 500KB. Máximo permitido para figurinhas WhatsApp.');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
      toast.error('Erro ao salvar figurinha');
      return;
    }

    toast.success(`✅ Figurinha "${pending.name}" salva como "${CATEGORY_LABELS[pending.selectedCategory]?.label}"!`);
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
    toast.success(newVal ? '⭐ Adicionada aos favoritos' : 'Removida dos favoritos');
  };

  const handleCategoryChange = async (sticker: StickerItem, newCategory: string) => {
    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, category: newCategory } : s));
    await supabase.from('stickers').update({ category: newCategory }).eq('id', sticker.id);
    toast.success(`Categoria: "${CATEGORY_LABELS[newCategory]?.label || newCategory}"`);
  };

  const handleDelete = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    setStickers(prev => prev.filter(s => s.id !== sticker.id));

    if (sticker.image_url.includes('/whatsapp-media/')) {
      const path = sticker.image_url.split('/whatsapp-media/')[1];
      if (path) await supabase.storage.from('whatsapp-media').remove([path]);
    } else {
      const path = sticker.image_url.split('/stickers/')[1];
      if (path) await supabase.storage.from('stickers').remove([path]);
    }

    await supabase.from('stickers').delete().eq('id', sticker.id);
    toast.success('Figurinha removida');
  };

  // Filter & sort
  const filtered = useMemo(() => {
    let result = stickers;

    // Search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        CATEGORY_LABELS[s.category]?.label.toLowerCase().includes(term)
      );
    }

    // Category filters
    if (showRecent) {
      result = [...result].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, RECENT_LIMIT);
    } else if (showFavorites) {
      result = result.filter(s => s.is_favorite);
    } else if (activeCategory) {
      result = result.filter(s => s.category === activeCategory);
    }

    return result;
  }, [stickers, search, showFavorites, showRecent, activeCategory]);

  const gridSizeIcon = gridSize === 'sm' ? Grid3X3 : gridSize === 'md' ? LayoutGrid : Grid2X2;
  const GridSizeIcon = gridSizeIcon;

  const cycleGridSize = () => {
    setGridSize(prev => prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Popover open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setPendingUpload(null);
          setSearch('');
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Figurinhas (Ctrl+Shift+S)"
            disabled={disabled}
            aria-label="Abrir seletor de figurinhas"
          >
            <Sticker className="w-[18px] h-[18px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            'w-[380px] p-0 bg-popover border-border',
            isDragOver && 'ring-2 ring-primary ring-offset-2'
          )}
          align="end"
          side="top"
          sideOffset={8}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-primary">Solte aqui para adicionar</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2" id="sticker-picker-title">
              <Sticker className="w-4 h-4 text-primary" aria-hidden="true" />
              Figurinhas
            </h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                onClick={cycleGridSize}
                title={`Tamanho: ${gridSize === 'sm' ? 'pequeno' : gridSize === 'md' ? 'médio' : 'grande'}`}
                aria-label="Alterar tamanho da grade"
              >
                <GridSizeIcon className="w-3.5 h-3.5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/webp,image/png,image/gif,image/jpeg"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Selecionar arquivo de figurinha"
              />
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !!pendingUpload}
                title="Adicionar figurinha"
                aria-label="Adicionar nova figurinha"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Upload preview */}
          <AnimatePresence>
            {pendingUpload && (
              <div className="px-3 py-2 border-b border-border/50">
                <StickerUploadPreview
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou categoria..."
                className="h-8 pl-8 text-xs bg-muted/50 border-border/50"
                aria-label="Buscar figurinhas"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label="Limpar busca"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Category bar */}
          <StickerCategoryBar
            stickers={stickers}
            activeCategory={activeCategory}
            showFavorites={showFavorites}
            showRecent={showRecent}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              setShowFavorites(false);
              setShowRecent(false);
            }}
            onToggleFavorites={() => {
              setShowFavorites(!showFavorites);
              setActiveCategory(null);
              setShowRecent(false);
            }}
            onToggleRecent={() => {
              setShowRecent(!showRecent);
              setActiveCategory(null);
              setShowFavorites(false);
            }}
          />

          {/* Sticker grid */}
          <StickerGrid
            stickers={filtered}
            loading={loading}
            search={search}
            gridSize={gridSize}
            onSend={handleSend}
            onToggleFavorite={toggleFavorite}
            onDelete={handleDelete}
            onCategoryChange={handleCategoryChange}
            onAddClick={() => fileInputRef.current?.click()}
          />

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground" aria-live="polite">
              {filtered.length}/{stickers.length} figurinhas
              {showRecent && ' · Mais usadas'}
              {showFavorites && ' · Favoritas'}
              {activeCategory && ` · ${CATEGORY_LABELS[activeCategory]?.label}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground/60">
                Arraste uma imagem ou
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground hover:text-primary gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !!pendingUpload}
              >
                <Upload className="w-3 h-3" aria-hidden="true" />
                Upload
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
