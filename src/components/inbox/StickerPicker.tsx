import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sticker, Search, Plus, Star, Clock, Trash2, Loader2, Upload, X } from 'lucide-react';
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

export function StickerPicker({ onSendSticker, disabled }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        if (file.size > 500 * 1024) {
          toast.error(`${file.name} excede 500KB`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'webp';
        const fileName = `sticker_${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('stickers')
          .upload(fileName, file, {
            contentType: file.type,
            cacheControl: '31536000',
          });

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('stickers').getPublicUrl(fileName);

        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('stickers').insert({
          name: file.name.replace(/\.[^.]+$/, ''),
          image_url: urlData.publicUrl,
          category: 'enviadas',
          uploaded_by: user?.id || null,
        });
      }

      toast.success('Figurinha(s) adicionada(s)!');
      fetchStickers();
    } catch {
      toast.error('Erro ao processar figurinha');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (sticker: StickerItem) => {
    onSendSticker(sticker.image_url);
    setOpen(false);

    // Increment use count
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

  const handleDelete = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    setStickers(prev => prev.filter(s => s.id !== sticker.id));

    // Delete from storage
    const path = sticker.image_url.split('/stickers/')[1];
    if (path) await supabase.storage.from('stickers').remove([path]);
    await supabase.from('stickers').delete().eq('id', sticker.id);
    toast.success('Figurinha removida');
  };

  const filtered = stickers.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'favorites') return matchSearch && s.is_favorite;
    if (activeTab === 'recent') return matchSearch;
    return matchSearch;
  });

  const categories = [...new Set(stickers.map(s => s.category).filter(Boolean))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        className="w-[340px] p-0 bg-popover border-border"
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
              title="Adicionar figurinha"
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-transparent border-b border-border/30 rounded-none h-9 px-2">
            <TabsTrigger value="all" className="text-xs gap-1 data-[state=active]:bg-muted h-7">
              Todas
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs gap-1 data-[state=active]:bg-muted h-7">
              <Star className="w-3 h-3" />
              Favoritas
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs gap-1 data-[state=active]:bg-muted h-7">
              <Clock className="w-3 h-3" />
              Recentes
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[280px]">
            <TabsContent value={activeTab} className="p-2 m-0">
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
                        title={sticker.name || 'Figurinha'}
                      >
                        <img
                          src={sticker.image_url}
                          alt={sticker.name || 'Sticker'}
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
                        />
                        {/* Overlay actions */}
                        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1">
                          <button
                            onClick={(e) => toggleFavorite(e, sticker)}
                            className="p-0.5"
                          >
                            <Star className={cn(
                              'w-3.5 h-3.5 transition-colors',
                              sticker.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                            )} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, sticker)}
                            className="p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {stickers.length} figurinha(s) · WebP, PNG, GIF (máx 500KB)
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
