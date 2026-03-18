import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Image,
  FileVideo,
  FileAudio,
  File,
  Download,
  Search,
  Grid3X3,
  List,
  X,
  Play,
  Pause,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  filename: string;
  created_at: string;
  message_content: string;
}

interface MediaGalleryProps {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getMediaType = (url: string, messageType: string): 'image' | 'video' | 'audio' | 'document' => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension) || messageType === 'image') {
    return 'image';
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(extension) || messageType === 'video') {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'opus'].includes(extension) || messageType === 'audio' || messageType === 'ptt') {
    return 'audio';
  }
  return 'document';
};

const getFilename = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'arquivo';
  } catch {
    return url.split('/').pop() || 'arquivo';
  }
};

function MediaCard({ 
  item, 
  isSelected,
  onSelect,
  onPreview,
}: { 
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => setIsLoading(false);
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/50'
      )}
      onClick={onPreview}
    >
      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          isSelected 
            ? 'bg-primary border-primary text-primary-foreground' 
            : 'bg-background/80 border-muted-foreground/50 opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </div>

      {/* Media content */}
      <div className="aspect-square bg-muted relative">
        {item.type === 'image' && (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            {!hasError ? (
              <img
                src={item.url}
                alt={item.filename}
                className={cn(
                  'w-full h-full object-cover',
                  isLoading && 'opacity-0'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </>
        )}
        
        {item.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center bg-background/80">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground" fill="white" />
              </div>
            </div>
            <FileVideo className="w-8 h-8 text-muted-foreground absolute bottom-2 right-2" />
          </div>
        )}
        
        {item.type === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <FileAudio className="w-10 h-10 text-primary" />
            <span className="text-xs text-muted-foreground text-center truncate w-full">
              {item.filename}
            </span>
          </div>
        )}
        
        {item.type === 'document' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <File className="w-10 h-10 text-info" />
            <span className="text-xs text-muted-foreground text-center truncate w-full">
              {item.filename}
            </span>
          </div>
        )}
      </div>

      {/* Date overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-primary-foreground">
          {format(new Date(item.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
        </p>
      </div>
    </motion.div>
  );
}

function MediaPreviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{item.filename}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={item.url} download={item.filename}>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4 bg-background/90 min-h-[400px]">
          {item.type === 'image' && (
            <img
              src={item.url}
              alt={item.filename}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
          
          {item.type === 'video' && (
            <video
              src={item.url}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="max-w-full max-h-[70vh]"
            />
          )}
          
          {item.type === 'audio' && (
            <div className="p-8">
              <audio src={item.url} controls className="w-full" />
            </div>
          )}
          
          {item.type === 'document' && (
            <div className="text-center p-8">
              <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-primary-foreground mb-4">{item.filename}</p>
              <Button asChild>
                <a href={item.url} download={item.filename}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaGallery({ contactId, open, onOpenChange }: MediaGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['media-gallery', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, media_url, message_type, content, created_at')
        .eq('contact_id', contactId)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!contactId,
  });

  const mediaItems = useMemo((): MediaItem[] => {
    if (!messages) return [];
    
    return messages
      .filter(m => m.media_url)
      .map(m => ({
        id: m.id,
        url: m.media_url!,
        type: getMediaType(m.media_url!, m.message_type),
        filename: getFilename(m.media_url!),
        created_at: m.created_at,
        message_content: m.content,
      }));
  }, [messages]);

  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const matchesFilter = filter === 'all' || item.type === filter;
      const matchesSearch = !search || 
        item.filename.toLowerCase().includes(search.toLowerCase()) ||
        item.message_content.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [mediaItems, filter, search]);

  const counts = useMemo(() => ({
    all: mediaItems.length,
    image: mediaItems.filter(i => i.type === 'image').length,
    video: mediaItems.filter(i => i.type === 'video').length,
    audio: mediaItems.filter(i => i.type === 'audio').length,
    document: mediaItems.filter(i => i.type === 'document').length,
  }), [mediaItems]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDownloadSelected = async () => {
    // Blocked by security policy
    const { toast } = await import('sonner');
    toast.error('🔒 Download bloqueado por política de segurança', {
      description: 'O download de arquivos está desabilitado para proteção de dados.',
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              Galeria de Mídia
              <Badge variant="secondary">{counts.all} itens</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex items-center gap-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar mídia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="all" className="gap-1">
                Todos <Badge variant="outline" className="ml-1">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="image" className="gap-1">
                <Image className="w-3 h-3" />
                <span className="hidden sm:inline">Imagens</span>
                <Badge variant="outline" className="ml-1">{counts.image}</Badge>
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-1">
                <FileVideo className="w-3 h-3" />
                <span className="hidden sm:inline">Vídeos</span>
                <Badge variant="outline" className="ml-1">{counts.video}</Badge>
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-1">
                <FileAudio className="w-3 h-3" />
                <span className="hidden sm:inline">Áudios</span>
                <Badge variant="outline" className="ml-1">{counts.audio}</Badge>
              </TabsTrigger>
              <TabsTrigger value="document" className="gap-1">
                <File className="w-3 h-3" />
                <span className="hidden sm:inline">Docs</span>
                <Badge variant="outline" className="ml-1">{counts.document}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Selection bar */}
          <AnimatePresence>
            {selectedItems.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-2 bg-primary/10 rounded-lg"
              >
                <span className="text-sm">
                  {selectedItems.size} item(s) selecionado(s)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItems(new Set())}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadSelected}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Download
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-[300px]">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2 p-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Image className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma mídia encontrada</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 gap-2 p-2">
                {filteredItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => toggleSelect(item.id)}
                    onPreview={() => setPreviewItem(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer',
                      selectedItems.has(item.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => setPreviewItem(item)}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                        selectedItems.has(item.id) 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'border-muted-foreground/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      {selectedItems.has(item.id) && <Check className="w-3 h-3" />}
                    </div>
                    
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      {item.type === 'image' && <Image className="w-5 h-5 text-muted-foreground" />}
                      {item.type === 'video' && <FileVideo className="w-5 h-5 text-muted-foreground" />}
                      {item.type === 'audio' && <FileAudio className="w-5 h-5 text-muted-foreground" />}
                      {item.type === 'document' && <File className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={item.url} download={item.filename}>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <MediaPreviewDialog
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      />
    </>
  );
}
