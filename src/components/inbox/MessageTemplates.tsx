import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Trash2, Edit2, X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Template {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string;
  use_count: number;
}

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
}

export function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '', shortcut: '', category: 'general' });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTemplates = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchTemplates();
    }
  }, [isOpen, user]);

  const handleSelectTemplate = async (template: Template) => {
    onSelectTemplate(template.content);
    
    // Update use count
    await supabase
      .from('message_templates')
      .update({ use_count: template.use_count + 1 })
      .eq('id', template.id);
    
    setIsOpen(false);
  };

  const handleAddTemplate = async () => {
    if (!user || !newTemplate.title || !newTemplate.content) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título e conteúdo do template.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          title: newTemplate.title,
          content: newTemplate.content,
          shortcut: newTemplate.shortcut || null,
          category: newTemplate.category
        });

      if (error) throw error;

      toast({
        title: "Template criado!",
        description: "Seu template foi salvo com sucesso."
      });

      setNewTemplate({ title: '', content: '', shortcut: '', category: 'general' });
      setShowAddForm(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .update({
          title: editingTemplate.title,
          content: editingTemplate.content,
          shortcut: editingTemplate.shortcut,
          category: editingTemplate.category
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast({
        title: "Template atualizado!",
        description: "As alterações foram salvas."
      });

      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "O template foi removido."
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase()) ||
    t.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ['general', 'saudacao', 'despedida', 'suporte', 'vendas'];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        title="Templates de mensagem"
      >
        <FileText className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Templates de Mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar templates..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>

          {/* Add/Edit Form */}
          <AnimatePresence>
            {(showAddForm || editingTemplate) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 border border-border rounded-lg bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingTemplate(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Título do template"
                      value={editingTemplate?.title || newTemplate.title}
                      onChange={(e) => editingTemplate
                        ? setEditingTemplate({ ...editingTemplate, title: e.target.value })
                        : setNewTemplate({ ...newTemplate, title: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Atalho (ex: /ola)"
                      value={editingTemplate?.shortcut || newTemplate.shortcut}
                      onChange={(e) => editingTemplate
                        ? setEditingTemplate({ ...editingTemplate, shortcut: e.target.value })
                        : setNewTemplate({ ...newTemplate, shortcut: e.target.value })
                      }
                    />
                  </div>
                  <Textarea
                    placeholder="Conteúdo da mensagem..."
                    rows={3}
                    value={editingTemplate?.content || newTemplate.content}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({ ...editingTemplate, content: e.target.value })
                      : setNewTemplate({ ...newTemplate, content: e.target.value })
                    }
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {categories.map(cat => (
                        <Badge
                          key={cat}
                          variant={(editingTemplate?.category || newTemplate.category) === cat ? 'default' : 'outline'}
                          className="cursor-pointer capitalize"
                          onClick={() => editingTemplate
                            ? setEditingTemplate({ ...editingTemplate, category: cat })
                            : setNewTemplate({ ...newTemplate, category: cat })
                          }
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      onClick={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Salvar
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{template.title}</span>
                        {template.shortcut && (
                          <Badge variant="outline" className="text-[10px]">
                            {template.shortcut}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.content}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        Usado {template.use_count}x
                      </span>
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum template encontrado</p>
                <p className="text-sm">Crie seu primeiro template clicando em "Novo"</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
