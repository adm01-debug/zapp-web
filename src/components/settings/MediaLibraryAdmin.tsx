import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Play, Pause, Star, TrendingUp, Edit2, Check,
  Image as ImageIcon, Volume2, Package,
  Filter, RefreshCw, AlertTriangle, Wand2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { useMediaLibrary, getCategoriesForType } from './media-library/useMediaLibrary';
import type { MediaItem, MediaType } from './media-library/useMediaLibrary';

// ═══════════════════════════════════════════════════════════
// Stats Cards
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
            <TrendingUp className="w-4 h-4 text-success" />
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
            <Star className="w-4 h-4 text-warning" />
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
            <Filter className="w-4 h-4 text-info" />
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
  const allCategories = { ...categories };
  if (value && !(value in allCategories)) {
    allCategories[value] = '❓';
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 text-[10px] w-[130px] border-border/40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(allCategories).map(([cat, emoji]) => (
          <SelectItem key={cat} value={cat} className="text-xs">
            {emoji} {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════════
// AI Generate Dialog (audio only)
// ═══════════════════════════════════════════════════════════

function AIGenerateDialog({ open, onOpenChange, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [genPrompt, setGenPrompt] = useState('');
  const [genMode, setGenMode] = useState<'sfx' | 'music'>('sfx');
  const [genDuration, setGenDuration] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genPreviewUrl, setGenPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    setGenPreviewUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-sfx', {
        body: { prompt: genPrompt, duration: genDuration, mode: genMode },
      });
      if (error || data?.error) throw new Error(data?.error || 'Generation failed');
      if (!data?.audioContent) throw new Error('Resposta sem conteúdo de áudio');
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      setGenPreviewUrl(audioUrl);
      audioRef.current?.pause();
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar áudio');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!genPreviewUrl) return;
    setGenerating(true);
    try {
      const resp = await fetch(genPreviewUrl);
      const blob = await resp.blob();
      const storagePath = `ai_gen_${Date.now()}_${crypto.randomUUID()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('audio-memes')
        .upload(storagePath, blob, { contentType: 'audio/mpeg', cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('audio-memes').getPublicUrl(storagePath);
      const { data: { user } } = await supabase.auth.getUser();
      let aiCategory = 'outros';
      try {
        const { data: classifyData } = await supabase.functions.invoke('classify-audio-meme', {
          body: { audio_url: urlData.publicUrl, file_name: genPrompt },
        });
        if (classifyData?.category) aiCategory = classifyData.category;
      } catch { /* fallback */ }
      const { error: insertError } = await supabase.from('audio_memes').insert({
        name: genPrompt.substring(0, 80),
        audio_url: urlData.publicUrl,
        category: aiCategory,
        is_favorite: false,
        use_count: 0,
        uploaded_by: user?.id || null,
      });
      if (insertError) throw insertError;
      toast.success(`Áudio salvo como "${aiCategory}"`);
      onOpenChange(false);
      setGenPrompt('');
      setGenPreviewUrl(null);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar áudio');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) { audioRef.current?.pause(); setGenPreviewUrl(null); }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Áudio com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o efeito sonoro ou música que deseja gerar usando ElevenLabs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button variant={genMode === 'sfx' ? 'default' : 'outline'} size="sm"
              onClick={() => { setGenMode('sfx'); setGenDuration(5); }} className="flex-1 gap-1.5">
              <Volume2 className="w-4 h-4" /> Efeito Sonoro
            </Button>
            <Button variant={genMode === 'music' ? 'default' : 'outline'} size="sm"
              onClick={() => { setGenMode('music'); setGenDuration(15); }} className="flex-1 gap-1.5">
              <Music className="w-4 h-4" /> Música
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Descrição do áudio</Label>
            <Textarea value={genPrompt} onChange={e => setGenPrompt(e.target.value)}
              placeholder={genMode === 'sfx'
                ? 'Ex: Risada de vilão ecoando, buzina de erro cômica, aplausos de plateia...'
                : 'Ex: Música de suspense cinematográfica, jingle alegre de vitória...'} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Duração: {genDuration}s</Label>
            <input type="range" min={genMode === 'sfx' ? 1 : 5} max={genMode === 'sfx' ? 22 : 60}
              value={genDuration} onChange={e => setGenDuration(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{genMode === 'sfx' ? '1s' : '5s'}</span>
              <span>{genMode === 'sfx' ? '22s' : '60s'}</span>
            </div>
          </div>
          {genPreviewUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Button variant="outline" size="icon" className="w-8 h-8 shrink-0"
                onClick={() => { audioRef.current?.pause(); const a = new Audio(genPreviewUrl); a.play().catch(() => {}); audioRef.current = a; }}>
                <Play className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{genPrompt}</p>
                <p className="text-[10px] text-muted-foreground">{genDuration}s • {genMode === 'sfx' ? 'Efeito' : 'Música'}</p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Pronto</Badge>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!genPreviewUrl ? (
            <Button onClick={handleGenerate} disabled={generating || !genPrompt.trim()} className="gap-1.5">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? 'Gerando...' : 'Gerar Preview'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setGenPreviewUrl(null)} className="gap-1.5">
                <RefreshCw className="w-4 h-4" /> Refazer
              </Button>
              <Button onClick={handleSaveGenerated} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {generating ? 'Salvando...' : 'Salvar na Biblioteca'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// Media Admin Panel (per type)
// ═══════════════════════════════════════════════════════════

function MediaAdminPanel({ type }: { type: MediaType }) {
  const lib = useMediaLibrary(type);
  const [showGenDialog, setShowGenDialog] = useState(false);

  return (
    <div className="space-y-4">
      <StatsCards items={lib.items} type={type} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={lib.search} onChange={e => lib.setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria..." className="pl-9 h-9 text-sm" />
        </div>

        <Select value={lib.filterCategory} onValueChange={lib.setFilterCategory}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ({lib.items.length})</SelectItem>
            {lib.existingCategories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {lib.categories[cat] || '📦'} {cat} ({lib.items.filter(i => i.category === cat).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input ref={lib.fileInputRef} type="file" accept={lib.acceptTypes} className="hidden" multiple onChange={lib.handleBulkUpload} />
        <Button variant="outline" size="sm" className="h-9 gap-1.5"
          onClick={() => lib.fileInputRef.current?.click()} disabled={lib.bulkUploading}>
          {lib.bulkUploading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />{lib.uploadProgress}%</>) :
            (<><Upload className="w-3.5 h-3.5" />Upload em massa</>)}
        </Button>

        {type === 'audio_memes' && (
          <Button variant="default" size="sm" className="h-9 gap-1.5" onClick={() => setShowGenDialog(true)}>
            <Sparkles className="w-3.5 h-3.5" /> Gerar com IA
          </Button>
        )}

        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={lib.fetchItems}>
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* AI Generate Dialog */}
      {type === 'audio_memes' && (
        <AIGenerateDialog open={showGenDialog} onOpenChange={setShowGenDialog} onSaved={lib.fetchItems} />
      )}

      {/* Bulk actions bar */}
      <AnimatePresence>
        {lib.selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Badge variant="secondary" className="text-xs">{lib.selected.size} selecionados</Badge>

            <Select onValueChange={lib.handleBulkCategoryChange}>
              <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="Mover para..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(lib.categories).map(([cat, emoji]) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{emoji} {cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={lib.handleBulkReclassify} disabled={lib.reclassifying}>
              {lib.reclassifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {lib.reclassifying ? 'Classificando...' : 'Reclassificar IA'}
            </Button>

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
                    Tem certeza que deseja excluir {lib.selected.size} itens? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={lib.handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir {lib.selected.size} itens
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto"
              onClick={() => lib.setSelected(new Set())}>Limpar seleção</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items table */}
      <Card className="border-border/50">
        <ScrollArea className="h-[500px]">
          <div className="min-w-[600px]">
            <div className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
              <Checkbox checked={lib.filtered.length > 0 && lib.selected.size === lib.filtered.length}
                onCheckedChange={lib.toggleSelectAll} className="mr-1" />
              <span className="w-12">Preview</span>
              <span className="flex-1">Nome</span>
              <span className="w-[130px]">Categoria</span>
              <span className="w-16 text-center">Usos</span>
              <span className="w-12 text-center">⭐</span>
              <span className="w-24 text-right">Ações</span>
            </div>

            {lib.loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : lib.filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
              </div>
            ) : (
              lib.filtered.map(item => {
                const url = type === 'audio_memes' ? item.audio_url : item.image_url;
                const isEditing = lib.editingId === item.id;

                return (
                  <div key={item.id} className={cn(
                    'flex items-center gap-3 px-3 py-2 border-b border-border/30 hover:bg-muted/20 transition-colors',
                    lib.selected.has(item.id) && 'bg-primary/5'
                  )}>
                    <Checkbox checked={lib.selected.has(item.id)} onCheckedChange={() => lib.toggleSelect(item.id)} />

                    {/* Preview */}
                    <div className="w-12 h-10 shrink-0">
                      {type === 'audio_memes' ? (
                        <button onClick={() => lib.handlePreview(item)}
                          className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                            lib.playingId === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20')}>
                          {lib.playingId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/30 border border-border/30">
                          {url ? <img src={url} alt={item.name || ''} className="w-full h-full object-contain p-0.5" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input value={lib.editName} onChange={e => lib.setEditName(e.target.value)} className="h-7 text-xs" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') lib.handleRename(item); if (e.key === 'Escape') lib.setEditingId(null); }} />
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => lib.handleRename(item)}><Check className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => lib.setEditingId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-foreground truncate">{item.name || 'Sem nome'}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="w-[130px]">
                      <InlineCategorySelect value={item.category} categories={lib.categories}
                        onChange={(cat) => lib.handleSingleCategoryChange(item, cat)} />
                    </div>

                    {/* Use count */}
                    <div className="w-16 text-center">
                      <Badge variant="secondary" className="text-[9px]">{item.use_count || 0}x</Badge>
                    </div>

                    {/* Favorite */}
                    <div className="w-12 text-center">
                      <button onClick={() => lib.handleToggleFavorite(item)} className="p-1 rounded hover:bg-muted/50 transition-colors"
                        title={item.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
                        <Star className={cn('w-3.5 h-3.5 mx-auto transition-colors',
                          item.is_favorite ? 'fill-warning text-warning' : 'text-muted-foreground/30 hover:text-warning')} />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="w-24 flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7"
                        onClick={() => { lib.setEditingId(item.id); lib.setEditName(item.name || ''); }}>
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir item</AlertDialogTitle>
                            <AlertDialogDescription>Excluir "{item.name || 'Sem nome'}" permanentemente?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => lib.handleDelete(item)}
                              className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
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
        <span>Exibindo {lib.filtered.length} de {lib.items.length} itens</span>
        {lib.selected.size > 0 && <span>{lib.selected.size} selecionados</span>}
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
          <p className="text-sm text-muted-foreground">Gerencie figurinhas, áudios meme e emojis customizados</p>
        </div>
      </div>

      <Tabs defaultValue="stickers" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="stickers" className="gap-1.5 text-sm"><Sticker className="w-4 h-4" />Figurinhas</TabsTrigger>
          <TabsTrigger value="audio_memes" className="gap-1.5 text-sm"><Volume2 className="w-4 h-4" />Áudios Meme</TabsTrigger>
          <TabsTrigger value="custom_emojis" className="gap-1.5 text-sm"><SmilePlus className="w-4 h-4" />Emojis</TabsTrigger>
        </TabsList>
        <TabsContent value="stickers"><MediaAdminPanel type="stickers" /></TabsContent>
        <TabsContent value="audio_memes"><MediaAdminPanel type="audio_memes" /></TabsContent>
        <TabsContent value="custom_emojis"><MediaAdminPanel type="custom_emojis" /></TabsContent>
      </Tabs>
    </div>
  );
}
