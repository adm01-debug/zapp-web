import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, Plus, X, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuickReplies, QuickReplyTemplate, CreateTemplateInput } from '@/hooks/useQuickReplies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { QuickReplyCardList } from './quick-replies/QuickReplyCardList';
import { Folder, TrendingUp } from 'lucide-react';



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
                      isFavorite(template.id) && "opacity-100 fill-yellow-400 text-warning"
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
          <QuickReplyCardList
            templates={displayedTemplates}
            groupedByCategory={groupedByCategory}
            isLoading={isLoading}
            activeTab={activeTab}
            searchQuery={searchQuery}
            isFavorite={isFavorite}
            onSelect={handleSelect}
            onToggleFavorite={toggleFavorite}
            onCopy={handleCopy}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShowCreate={() => setShowCreateDialog(true)}
          />
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
