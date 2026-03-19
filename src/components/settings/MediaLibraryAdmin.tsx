import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sticker, Music, SmilePlus, Search, Trash2, Loader2, Upload, X,
  Play, Pause, Star, BarChart3, TrendingUp, Eye, Edit2, Check,
  ChevronDown, Image as ImageIcon, Volume2, FileAudio, Package,
  Filter, RefreshCw, Download, AlertTriangle, Wand2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface MediaItem {
  id: string;
  name: string | null;
  category: string;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  uploaded_by: string | null;
  // type-specific
  audio_url?: string;
  image_url?: string;
  duration_seconds?: number | null;
}

type MediaType = 'stickers' | 'audio_memes' | 'custom_emojis';

// ═══════════════════════════════════════════════════════════
// Category definitions per media type
// ═══════════════════════════════════════════════════════════

const STICKER_CATEGORIES: Record<string, string> = {
  'comemoração': '🎉', 'riso': '😂', 'chorando': '😢', 'amor': '❤️',
  'raiva': '😡', 'surpresa': '😲', 'pensativo': '🤔', 'cumprimento': '👋',
  'despedida': '👋', 'concordância': '👍', 'negação': '🙅', 'sono': '😴',
  'fome': '🍔', 'medo': '😨', 'vergonha': '🙈', 'deboche': '😏',
  'fofo': '🥰', 'triste': '😔', 'animado': '🤩', 'engraçado': '🤣',
  'outros': '📦', 'recebidas': '📥', 'enviadas': '📤',
};

const AUDIO_CATEGORIES: Record<string, string> = {
  'risada': '😂', 'aplausos': '👏', 'suspense': '🎭', 'vitória': '🏆',
  'falha': '💥', 'surpresa': '😱', 'triste': '😢', 'raiva': '😡',
  'romântico': '💕', 'medo': '👻', 'deboche': '😏', 'narração': '🎙️',
  'bordão': '💬', 'efeito sonoro': '🔊', 'viral': '🔥', 'cumprimento': '👋',
  'despedida': '👋', 'animação': '🤩', 'drama': '🎬', 'gospel': '⛪',
  'outros': '📦',
};

const EMOJI_CATEGORIES: Record<string, string> = {
  'riso': '😂', 'amor': '❤️', 'triste': '😢', 'raiva': '😡',
  'surpresa': '😲', 'fofo': '🥰', 'deboche': '😏', 'outros': '📦',
};

function getCategoriesForType(type: MediaType): Record<string, string> {
  switch (type) {
    case 'stickers': return STICKER_CATEGORIES;
    case 'audio_memes': return AUDIO_CATEGORIES;
    case 'custom_emojis': return EMOJI_CATEGORIES;
  }
}

function getUrlField(type: MediaType): 'image_url' | 'audio_url' {
  return type === 'audio_memes' ? 'audio_url' : 'image_url';
}

function getBucket(type: MediaType): string {
  switch (type) {
    case 'stickers': return 'stickers';
    case 'audio_memes': return 'audio-memes';
    case 'custom_emojis': return 'custom-emojis';
  }
}

// ═══════════════════════════════════════════════════════════
// Stats Card
// ═══════════════════════════════════════════════════════════

function StatsCards({ items, type }: { items: MediaItem[]; type: MediaType }) {
  const total = items.length;
  const totalUses = items.reduce((s, i) => s + (i.use_count || 0), 0);
  const favorites = items.filter(i => i.is_favorite).length;
  const categories = [...new Set(items.map(i => i.category))].length;
  const topUsed = [...items].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{total}</p>
              <p className="text-[10px] text-muted-foreground">Total de itens</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{totalUses}</p>
              <p className="text-[10px] text-muted-foreground">Usos totais</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{favorites}</p>
              <p className="text-[10px] text-muted-foreground">Favoritos</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{categories}</p>
              <p className="text-[10px] text-muted-foreground">Categorias</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {topUsed.length > 0 && (
        <Card className="border-border/50 col-span-2 md:col-span-4">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">🏆 Mais usados</p>
            <div className="flex gap-3">
              {topUsed.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="font-medium truncate max-w-[120px]">{item.name || 'Sem nome'}</span>
                  <Badge variant="secondary" className="text-[9px] px-1">{item.use_count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Inline Category Editor
// ═══════════════════════════════════════════════════════════

function InlineCategorySelect({ value, categories, onChange }: {
  value: string;
  categories: Record<string, string>;
  onChange: (cat: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 text-[10px] w-[130px] border-border/40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(categories).map(([cat, emoji]) => (
          <SelectItem key={cat} value={cat} className="text-xs">
            {emoji} {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════════
// Media Admin Panel (per type)
// ═══════════════════════════════════════════════════════════

function MediaAdminPanel({ type }: { type: MediaType }) {
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
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genMode, setGenMode] = useState<'sfx' | 'music'>('sfx');
  const [genDuration, setGenDuration] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genPreviewUrl, setGenPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = getCategoriesForType(type);
  const urlField = getUrlField(type);
  const bucket = getBucket(type);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (!error && data) setItems(data as MediaItem[]);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    fetchItems();
    return () => { audioRef.current?.pause(); };
  }, [fetchItems]);

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

  const handleBulkDelete = async () => {
    const toDelete = items.filter(i => selected.has(i.id));
    // Delete from storage
    for (const item of toDelete) {
      const url = type === 'audio_memes' ? item.audio_url : item.image_url;
      if (url) {
        if (url.includes('/whatsapp-media/')) {
          const path = url.split('/whatsapp-media/')[1];
          if (path) await supabase.storage.from('whatsapp-media').remove([path]);
        } else {
          const bucketName = bucket;
          const path = url.split(`/${bucketName}/`)[1] || url.split('/stickers/')[1];
          if (path) await supabase.storage.from(bucketName).remove([path]);
        }
      }
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
    const { error } = await supabase.from(type).update({ category: newCategory }).in('id', ids);
    if (error) {
      toast.error('Erro ao alterar categorias');
      return;
    }
    setItems(prev => prev.map(i => selected.has(i.id) ? { ...i, category: newCategory } : i));
    toast.success(`${ids.length} itens movidos para "${newCategory}"`);
  };

  const handleSingleCategoryChange = async (item: MediaItem, newCategory: string) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: newCategory } : i));
    await supabase.from(type).update({ category: newCategory }).eq('id', item.id);
  };

  const handleRename = async (item: MediaItem) => {
    if (!editName.trim()) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: editName } : i));
    await supabase.from(type).update({ name: editName }).eq('id', item.id);
    setEditingId(null);
    toast.success('Nome atualizado');
  };

  const handleDelete = async (item: MediaItem) => {
    const url = type === 'audio_memes' ? item.audio_url : item.image_url;
    if (url) {
      if (url.includes('/whatsapp-media/')) {
        const path = url.split('/whatsapp-media/')[1];
        if (path) await supabase.storage.from('whatsapp-media').remove([path]);
      } else {
        const path = url.split(`/${bucket}/`)[1];
        if (path) await supabase.storage.from(bucket).remove([path]);
      }
    }
    await supabase.from(type).delete().eq('id', item.id);
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
    const audio = new Audio(item.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(item.id);
  };

  // ── Bulk Upload ──
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

    setBulkUploading(true);
    setUploadProgress(0);
    const { data: { user } } = await supabase.auth.getUser();
    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const ext = file.name.split('.').pop() || (type === 'audio_memes' ? 'mp3' : 'webp');
        const storagePath = `bulk_${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, { contentType: file.type, cacheControl: '31536000' });

        if (uploadError) continue;

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        const name = file.name.replace(/\.[^.]+$/, '');

        // Classify via AI
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
          name,
          category: aiCategory,
          is_favorite: false,
          use_count: 0,
          uploaded_by: user?.id || null,
        };
        if (type === 'audio_memes') {
          insertData.audio_url = urlData.publicUrl;
        } else {
          insertData.image_url = urlData.publicUrl;
        }

        const { error: insertError } = await supabase.from(type).insert(insertData as any);
        if (!insertError) successCount++;
      } catch { /* skip */ }
      setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));
    }

    setBulkUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(`${successCount}/${validFiles.length} arquivos importados com classificação IA`);
    fetchItems();
  };

  const acceptTypes = type === 'audio_memes' ? 'audio/*' : 'image/webp,image/png,image/gif,image/jpeg';
  const existingCategories = [...new Set(items.map(i => i.category))].sort();

  return (
    <div className="space-y-4">
      <StatsCards items={items} type={type} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ({items.length})</SelectItem>
            {existingCategories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {categories[cat] || '📦'} {cat} ({items.filter(i => i.category === cat).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          className="hidden"
          multiple
          onChange={handleBulkUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={bulkUploading}
        >
          {bulkUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              Upload em massa
            </>
          )}
        </Button>

        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchItems}>
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <Badge variant="secondary" className="text-xs">{selected.size} selecionados</Badge>

            <Select onValueChange={handleBulkCategoryChange}>
              <SelectTrigger className="w-[150px] h-7 text-xs">
                <SelectValue placeholder="Mover para..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categories).map(([cat, emoji]) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{emoji} {cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
                  <Trash2 className="w-3 h-3" /> Excluir selecionados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Confirmar exclusão em massa
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {selected.size} itens? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir {selected.size} itens
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>
              Limpar seleção
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items table */}
      <Card className="border-border/50">
        <ScrollArea className="h-[500px]">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={filtered.length > 0 && selected.size === filtered.length}
                onCheckedChange={toggleSelectAll}
                className="mr-1"
              />
              <span className="w-12">Preview</span>
              <span className="flex-1">Nome</span>
              <span className="w-[130px]">Categoria</span>
              <span className="w-16 text-center">Usos</span>
              <span className="w-12 text-center">⭐</span>
              <span className="w-24 text-right">Ações</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
              </div>
            ) : (
              filtered.map(item => {
                const url = type === 'audio_memes' ? item.audio_url : item.image_url;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 border-b border-border/30 hover:bg-muted/20 transition-colors',
                      selected.has(item.id) && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />

                    {/* Preview */}
                    <div className="w-12 h-10 shrink-0">
                      {type === 'audio_memes' ? (
                        <button
                          onClick={() => handlePreview(item)}
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                            playingId === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20'
                          )}
                        >
                          {playingId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/30 border border-border/30">
                          <img src={url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleRename(item)}
                          />
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => handleRename(item)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-foreground truncate">{item.name || 'Sem nome'}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="w-[130px]">
                      <InlineCategorySelect
                        value={item.category}
                        categories={categories}
                        onChange={(cat) => handleSingleCategoryChange(item, cat)}
                      />
                    </div>

                    {/* Use count */}
                    <div className="w-16 text-center">
                      <Badge variant="secondary" className="text-[9px]">{item.use_count || 0}x</Badge>
                    </div>

                    {/* Favorite */}
                    <div className="w-12 text-center">
                      <Star className={cn('w-3.5 h-3.5 mx-auto', item.is_favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30')} />
                    </div>

                    {/* Actions */}
                    <div className="w-24 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => { setEditingId(item.id); setEditName(item.name || ''); }}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Excluir "{item.name || 'Sem nome'}" permanentemente?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive text-destructive-foreground">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Exibindo {filtered.length} de {items.length} itens</span>
        {selected.size > 0 && <span>{selected.size} selecionados</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function MediaLibraryAdmin() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Biblioteca de Mídia</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie figurinhas, áudios meme e emojis customizados
          </p>
        </div>
      </div>

      <Tabs defaultValue="stickers" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="stickers" className="gap-1.5 text-sm">
            <Sticker className="w-4 h-4" />
            Figurinhas
          </TabsTrigger>
          <TabsTrigger value="audio_memes" className="gap-1.5 text-sm">
            <Volume2 className="w-4 h-4" />
            Áudios Meme
          </TabsTrigger>
          <TabsTrigger value="custom_emojis" className="gap-1.5 text-sm">
            <SmilePlus className="w-4 h-4" />
            Emojis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stickers">
          <MediaAdminPanel type="stickers" />
        </TabsContent>
        <TabsContent value="audio_memes">
          <MediaAdminPanel type="audio_memes" />
        </TabsContent>
        <TabsContent value="custom_emojis">
          <MediaAdminPanel type="custom_emojis" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
