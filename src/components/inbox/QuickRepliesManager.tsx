import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Search, Star, StarOff, Plus, Trash2, Edit2, Copy, 
  Clock, TrendingUp, Folder, GripVertical, X, Check,
  MessageSquare, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuickReplies, QuickReplyTemplate, CreateTemplateInput } from '@/hooks/useQuickReplies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickRepliesManagerProps {
  onSelect?: (content: string) => void;
  compact?: boolean;
}

export function QuickRepliesManager({ onSelect, compact = false }: QuickRepliesManagerProps) {
  const {
    templates,
    filteredTemplates,
    favoriteTemplates,
    recentTemplates,
    categories,
    searchQuery,
    setSearchQuery,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    isFavorite,
    incrementUseCount,
    isCreating,
    isUpdating,
  } = useQuickReplies();

  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplate | null>(null);
  const [formData, setFormData] = useState<CreateTemplateInput>({
    title: '',
    content: '',
    shortcut: '',
    category: 'geral',
  });

  const handleSelect = (template: QuickReplyTemplate) => {
    incrementUseCount(template.id);
    onSelect?.(template.content);
    toast.success('Resposta copiada!');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado para a área de transferência!');
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    await createTemplate(formData);
    setShowCreateDialog(false);
    setFormData({ title: '', content: '', shortcut: '', category: 'geral' });
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;

    await updateTemplate({
      id: editingTemplate.id,
      ...formData,
    });
    setEditingTemplate(null);
    setFormData({ title: '', content: '', shortcut: '', category: 'geral' });
  };

  const handleEdit = (template: QuickReplyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      content: template.content,
      shortcut: template.shortcut || '',
      category: template.category || 'geral',
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
  };

  const displayedTemplates = useMemo(() => {
    switch (activeTab) {
      case 'favorites':
        return favoriteTemplates;
      case 'recent':
        return recentTemplates;
      default:
        return filteredTemplates;
    }
  }, [activeTab, filteredTemplates, favoriteTemplates, recentTemplates]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, QuickReplyTemplate[]> = {};
    displayedTemplates.forEach(t => {
      const cat = t.category || 'geral';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return grouped;
  }, [displayedTemplates]);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar respostas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {displayedTemplates.map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSelect(template)}
                className="w-full p-2 text-left rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{template.title}</span>
                  <Star
                    className={cn(
                      "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      isFavorite(template.id) && "opacity-100 fill-yellow-400 text-yellow-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(template.id);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate">{template.content}</p>
              </motion.button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Respostas Rápidas</h3>
          <Badge variant="secondary" className="text-xs">
            {templates?.length || 0}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, conteúdo ou atalho..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 gap-1">
            <Folder className="w-3.5 h-3.5" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 gap-1">
            <Star className="w-3.5 h-3.5" />
            Favoritas
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Mais Usadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : displayedTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === 'favorites' 
                    ? 'Nenhuma resposta favorita ainda' 
                    : searchQuery 
                      ? 'Nenhum resultado encontrado' 
                      : 'Nenhuma resposta criada'}
                </p>
                {activeTab !== 'favorites' && !searchQuery && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Criar primeira resposta
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByCategory).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((template) => (
                          <motion.div
                            key={template.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              "p-3 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all group cursor-pointer",
                              isFavorite(template.id) && "border-yellow-400/30 bg-yellow-400/5"
                            )}
                            onClick={() => handleSelect(template)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium truncate">{template.title}</span>
                                  {template.shortcut && (
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
                                      {template.shortcut}
                                    </kbd>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {template.content}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {template.use_count || 0} usos
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(template.id);
                                  }}
                                >
                                  <Star className={cn(
                                    "w-4 h-4",
                                    isFavorite(template.id) && "fill-yellow-400 text-yellow-400"
                                  )} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(template.content);
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(template);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(template.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || !!editingTemplate} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingTemplate(null);
            setFormData({ title: '', content: '', shortcut: '', category: 'geral' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
            </DialogTitle>
            <DialogDescription>
              Crie respostas prontas para agilizar seu atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Ex: Saudação inicial"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo</label>
              <Textarea
                placeholder="Digite o conteúdo da resposta..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Atalho</label>
                <Input
                  placeholder="/saudacao"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="saudacao">Saudação</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="encerramento">Encerramento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setEditingTemplate(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={editingTemplate ? handleUpdate : handleCreate}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                  Salvando...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {editingTemplate ? 'Salvar Alterações' : 'Criar Resposta'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
