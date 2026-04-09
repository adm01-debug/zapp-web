import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, Upload, Trash2, Star, Loader2, User, ImagePlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { StickerItem } from './StickerTypes';

interface PersonalStickersProps {
  onSend?: (stickerUrl: string) => void;
}

export function PersonalStickers({ onSend }: PersonalStickersProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StickerItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Get current user profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile-stickers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .single();
      if (error) throw error;
      return data;
    },
  });
    },
  });

  // Get personal stickers for this user
  const { data: stickers = [], isLoading } = useQuery({
    queryKey: ['personal-stickers', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as StickerItem[];
    },
    enabled: !!profile?.id,
  });

  const filteredStickers = stickers.filter((s) => {
    if (!search.trim()) return true;
    return s.name?.toLowerCase().includes(search.toLowerCase());
  });

  const userName = profile?.display_name || profile?.name || 'Meu';
  const folderName = userName.split(' ')[0];

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !profile?.id) return;

    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'png';
        const path = `pessoal/${profile.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('stickers')
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('stickers').getPublicUrl(path);

        const stickerName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

        const { error: insertError } = await supabase
          .from('stickers')
          .insert({
            name: stickerName,
            image_url: urlData.publicUrl,
            category: 'pessoal',
            owner_id: profile.id,
            uploaded_by: profile.id,
          } as Record<string, unknown>);

        if (insertError) {
          toast.error(`Erro ao salvar ${file.name}`);
          continue;
        }

        uploadedCount++;
      }

      if (uploadedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['personal-stickers'] });
        toast.success(`${uploadedCount} figurinha${uploadedCount > 1 ? 's' : ''} adicionada${uploadedCount > 1 ? 's' : ''}! 📸`);
      }
    } catch {
      toast.error('Erro inesperado ao enviar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [profile?.id, queryClient]);

  const toggleFavorite = useMutation({
    mutationFn: async (sticker: StickerItem) => {
      const { error } = await supabase
        .from('stickers')
        .update({ is_favorite: !sticker.is_favorite })
        .eq('id', sticker.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personal-stickers'] }),
  });

  const deleteSticker = useMutation({
    mutationFn: async (sticker: StickerItem) => {
      // Try to delete from storage too
      const url = sticker.image_url;
      const storagePrefix = '/storage/v1/object/public/stickers/';
      const idx = url.indexOf(storagePrefix);
      if (idx !== -1) {
        const storagePath = url.substring(idx + storagePrefix.length);
        await supabase.storage.from('stickers').remove([storagePath]);
      }
      const { error } = await supabase.from('stickers').delete().eq('id', sticker.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-stickers'] });
      toast.success('Figurinha removida');
      setDeleteTarget(null);
    },
  });

  const handleSend = useCallback((sticker: StickerItem) => {
    onSend?.(sticker.image_url);
    supabase.from('stickers').update({ use_count: sticker.use_count + 1 }).eq('id', sticker.id);
  }, [onSend]);

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              Pasta de {folderName}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Suas figurinhas pessoais — fotos e imagens só suas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{stickers.length} fotos</Badge>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {uploading ? 'Enviando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        {stickers.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nas minhas figurinhas..."
              className="pl-9 h-8 text-sm"
            />
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : stickers.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <User className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Adicione suas fotos</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Clique para enviar fotos pessoais como figurinhas. Elas ficarão apenas na sua pasta.
            </p>
            <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" />
              Selecionar fotos
            </Button>
          </div>
        ) : filteredStickers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma figurinha encontrada
          </p>
        ) : (
          <ScrollArea className="h-[260px]">
            <div className="grid grid-cols-4 gap-1.5 p-1">
              <AnimatePresence>
                {filteredStickers.map((sticker) => (
                  <Tooltip key={sticker.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleSend(sticker)}
                        onMouseEnter={() => setHoveredId(sticker.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          'relative aspect-square rounded-xl overflow-hidden group',
                          'bg-muted/30 hover:bg-muted/60 transition-all duration-200',
                          'border border-transparent hover:border-primary/30',
                          'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                          sticker.is_favorite && 'ring-1 ring-primary/20'
                        )}
                      >
                        <img
                          src={sticker.image_url}
                          alt={sticker.name || 'Figurinha pessoal'}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />

                        {sticker.is_favorite && (
                          <span className="absolute top-0.5 right-0.5">
                            <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                          </span>
                        )}

                        {/* Overlay actions */}
                        <div className={cn(
                          'absolute inset-0 bg-background/70 transition-opacity flex items-center justify-center gap-2',
                          hoveredId === sticker.id ? 'opacity-100' : 'opacity-0'
                        )}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate(sticker); }}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors"
                            aria-label={sticker.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          >
                            <Star className={cn(
                              'w-4 h-4',
                              sticker.is_favorite ? 'fill-primary text-primary' : 'text-muted-foreground'
                            )} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(sticker); }}
                            className="p-1.5 rounded-lg bg-background/80 hover:bg-destructive/10 transition-colors"
                            aria-label="Excluir figurinha"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{sticker.name || 'Figurinha pessoal'}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </AnimatePresence>

              {/* Add more button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[9px]">Adicionar</span>
              </motion.button>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir figurinha pessoal?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <span className="flex items-center gap-3 mt-2">
                  <img src={deleteTarget.image_url} alt="" className="w-12 h-12 object-cover rounded-lg bg-muted" />
                  <span>
                    &ldquo;{deleteTarget.name || 'Figurinha'}&rdquo; será removida permanentemente da sua pasta.
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteSticker.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
