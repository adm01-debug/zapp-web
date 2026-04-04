import { useState, useEffect, useCallback, useRef } from 'react';
import { getLogger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const log = getLogger('useMediaLibrary');

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface MediaItem {
  id: string;
  name: string;
  category: string;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  uploaded_by: string | null;
  image_url?: string;
  audio_url?: string;
  duration_seconds?: number | null;
}

export type MediaType = 'stickers' | 'audio_memes' | 'custom_emojis';

export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// ═══════════════════════════════════════════════════════════
// Category definitions
// ═══════════════════════════════════════════════════════════

export const STICKER_CATEGORIES: Record<string, string> = {
  memes: '😂', reações: '👍', amor: '❤️', festas: '🎉',
  animais: '🐱', comida: '🍕', esportes: '⚽', trabalho: '💼',
  outros: '📦',
};

export const AUDIO_CATEGORIES: Record<string, string> = {
  risadas: '😂', bordões: '🎤', efeitos: '💥', músicas: '🎵',
  memes: '🤣', narração: '📢', animais: '🐶', outros: '📦',
};

export const EMOJI_CATEGORIES: Record<string, string> = {
  custom: '⭐', team: '👥', brand: '🏢', fun: '🎮', outros: '📦',
};

export function getCategoriesForType(type: MediaType): Record<string, string> {
  switch (type) {
    case 'stickers': return STICKER_CATEGORIES;
    case 'audio_memes': return AUDIO_CATEGORIES;
    case 'custom_emojis': return EMOJI_CATEGORIES;
  }
}

export function getUrlField(type: MediaType): 'image_url' | 'audio_url' {
  return type === 'audio_memes' ? 'audio_url' : 'image_url';
}

export function getBucket(type: MediaType): string {
  switch (type) {
    case 'stickers': return 'stickers';
    case 'audio_memes': return 'audio-memes';
    case 'custom_emojis': return 'custom-emojis';
  }
}

export function extractStoragePath(url: string, bucket: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
    ];
    for (const pattern of patterns) {
      const idx = u.pathname.indexOf(pattern);
      if (idx !== -1) {
        let path = u.pathname.substring(idx + pattern.length);
        path = decodeURIComponent(path);
        return { bucket, path };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function useMediaLibrary(type: MediaType) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reclassifying, setReclassifying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = getCategoriesForType(type);
  const bucket = getBucket(type);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        log.error(`Error fetching ${type}:`, error);
        toast.error(`Erro ao carregar ${type === 'stickers' ? 'figurinhas' : type === 'audio_memes' ? 'áudios' : 'emojis'}`);
      }
      setItems((data as MediaItem[]) || []);
    } catch (err) {
      log.error(`Unexpected error fetching ${type}:`, err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [fetchItems]);

  useEffect(() => {
    setSelected(new Set());
  }, [filterCategory, search]);

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const handleToggleFavorite = async (item: MediaItem) => {
    const newValue = !item.is_favorite;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: newValue } : i));
    const { error } = await supabase.from(type).update({ is_favorite: newValue }).eq('id', item.id);
    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: !newValue } : i));
      toast.error('Erro ao atualizar favorito');
    }
  };

  const deleteStorageFile = async (url: string | undefined) => {
    if (!url) return;
    const info = extractStoragePath(url, bucket);
    if (info) {
      await supabase.storage.from(info.bucket).remove([info.path]);
    }
  };

  const handleBulkDelete = async () => {
    const toDelete = items.filter(i => selected.has(i.id));
    if (toDelete.length === 0) return;
    for (const item of toDelete) {
      const url = type === 'audio_memes' ? item.audio_url : item.image_url;
      await deleteStorageFile(url);
    }
    const ids = [...selected];
    const { error } = await supabase.from(type).delete().in('id', ids);
    if (error) {
      toast.error('Erro ao excluir itens');
      return;
    }
    setItems(prev => prev.filter(i => !selected.has(i.id)));
    setSelected(new Set());
    toast.success(`${ids.length} itens excluídos`);
  };

  const handleBulkCategoryChange = async (newCategory: string) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const oldItems = items.filter(i => selected.has(i.id)).map(i => ({ id: i.id, category: i.category }));
    setItems(prev => prev.map(i => selected.has(i.id) ? { ...i, category: newCategory } : i));
    const { error } = await supabase.from(type).update({ category: newCategory }).in('id', ids);
    if (error) {
      setItems(prev => prev.map(i => {
        const old = oldItems.find(o => o.id === i.id);
        return old ? { ...i, category: old.category } : i;
      }));
      toast.error('Erro ao alterar categorias');
      return;
    }
    toast.success(`${ids.length} itens movidos para "${newCategory}"`);
  };

  const handleBulkReclassify = async () => {
    const toReclassify = items.filter(i => selected.has(i.id));
    if (toReclassify.length === 0) return;
    setReclassifying(true);
    let updated = 0;
    let errors = 0;
    const fnName = type === 'audio_memes' ? 'classify-audio-meme' :
      type === 'stickers' ? 'classify-sticker' : 'classify-emoji';

    for (const item of toReclassify) {
      try {
        const body = type === 'audio_memes'
          ? { audio_url: item.audio_url || '', file_name: item.name || '' }
          : { image_url: item.image_url || '' };
        const { data } = await supabase.functions.invoke(fnName, { body });
        if (data?.category && data.category !== item.category) {
          const { error } = await supabase.from(type).update({ category: data.category }).eq('id', item.id);
          if (!error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: data.category } : i));
            updated++;
          } else { errors++; }
        }
      } catch { errors++; }
    }

    setReclassifying(false);
    setSelected(new Set());
    const msg = `${updated}/${toReclassify.length} itens reclassificados com IA`;
    if (errors > 0) toast.info(`${msg} (${errors} erros)`);
    else toast.success(msg);
  };

  const handleSingleCategoryChange = async (item: MediaItem, newCategory: string) => {
    const oldCategory = item.category;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: newCategory } : i));
    const { error } = await supabase.from(type).update({ category: newCategory }).eq('id', item.id);
    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: oldCategory } : i));
      toast.error('Erro ao alterar categoria');
    }
  };

  const handleRename = async (item: MediaItem) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('O nome não pode ser vazio'); return; }
    const oldName = item.name;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: trimmed } : i));
    const { error } = await supabase.from(type).update({ name: trimmed }).eq('id', item.id);
    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: oldName } : i));
      toast.error('Erro ao renomear');
      return;
    }
    setEditingId(null);
    toast.success('Nome atualizado');
  };

  const handleDelete = async (item: MediaItem) => {
    const url = type === 'audio_memes' ? item.audio_url : item.image_url;
    await deleteStorageFile(url);
    const { error } = await supabase.from(type).delete().eq('id', item.id);
    if (error) { toast.error('Erro ao excluir item'); return; }
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast.success('Item excluído');
  };

  const handlePreview = (item: MediaItem) => {
    if (type !== 'audio_memes') return;
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    if (!item.audio_url) { toast.error('URL do áudio não encontrada'); return; }
    const audio = new Audio(item.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { setPlayingId(null); toast.error('Erro ao reproduzir áudio'); };
    audio.play().catch(() => { setPlayingId(null); toast.error('Erro ao reproduzir áudio'); });
    audioRef.current = audio;
    setPlayingId(item.id);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const acceptedTypes = type === 'audio_memes'
      ? (f: File) => f.type.startsWith('audio/')
      : (f: File) => f.type.startsWith('image/');
    const validFiles = fileList.filter(acceptedTypes);
    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido selecionado');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const oversizedFiles = validFiles.filter(f => f.size > MAX_UPLOAD_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} arquivo(s) excedem ${MAX_UPLOAD_SIZE_MB}MB e serão ignorados`);
    }
    const sizedFiles = validFiles.filter(f => f.size <= MAX_UPLOAD_SIZE_BYTES);
    if (sizedFiles.length === 0) {
      toast.error('Nenhum arquivo com tamanho válido');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setBulkUploading(true);
    setUploadProgress(0);
    const { data: { user } } = await supabase.auth.getUser();
    let successCount = 0;

    for (let i = 0; i < sizedFiles.length; i++) {
      const file = sizedFiles[i];
      try {
        const ext = file.name.split('.').pop() || (type === 'audio_memes' ? 'mp3' : 'webp');
        const storagePath = `bulk_${Date.now()}_${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, { contentType: file.type, cacheControl: '31536000' });
        if (uploadError) { log.error(`Upload error for ${file.name}:`, uploadError); continue; }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        const name = file.name.replace(/\.[^.]+$/, '');
        let aiCategory = 'outros';
        try {
          const fnName = type === 'audio_memes' ? 'classify-audio-meme' :
            type === 'stickers' ? 'classify-sticker' : 'classify-emoji';
          const body = type === 'audio_memes'
            ? { audio_url: urlData.publicUrl, file_name: file.name }
            : { image_url: urlData.publicUrl };
          const { data: classifyData } = await supabase.functions.invoke(fnName, { body });
          if (classifyData?.category) aiCategory = classifyData.category;
        } catch { /* fallback */ }
        const insertData: Record<string, unknown> = {
          name, category: aiCategory, is_favorite: false, use_count: 0,
          uploaded_by: user?.id || null,
        };
        if (type === 'audio_memes') insertData.audio_url = urlData.publicUrl;
        else insertData.image_url = urlData.publicUrl;
        const { error: insertError } = await (supabase as unknown as { from: (t: string) => { insert: (d: Record<string, unknown>) => Promise<{ error: unknown }> } }).from(type).insert(insertData);
        if (!insertError) successCount++;
      } catch (err) { log.error(`Unexpected error uploading ${file.name}:`, err); }
      setUploadProgress(Math.round(((i + 1) / sizedFiles.length) * 100));
    }

    setBulkUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(`${successCount}/${sizedFiles.length} arquivos importados com classificação IA`);
    fetchItems();
  };

  const existingCategories = [...new Set(items.map(i => i.category))].sort();
  const acceptTypes = type === 'audio_memes' ? 'audio/*' : 'image/webp,image/png,image/gif,image/jpeg';

  return {
    items, loading, search, setSearch,
    filterCategory, setFilterCategory,
    selected, setSelected,
    editingId, setEditingId,
    editName, setEditName,
    playingId, bulkUploading, uploadProgress, reclassifying,
    audioRef, fileInputRef,
    categories, filtered, existingCategories, acceptTypes,
    fetchItems, toggleSelect, toggleSelectAll,
    handleToggleFavorite, handleBulkDelete, handleBulkCategoryChange,
    handleBulkReclassify, handleSingleCategoryChange,
    handleRename, handleDelete, handlePreview, handleBulkUpload,
  };
}
