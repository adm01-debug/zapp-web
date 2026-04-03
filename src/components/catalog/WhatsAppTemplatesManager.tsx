import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Search,
  FileText,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Variable,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

interface WhatsAppTemplate {
  [key: string]: unknown;
  id: string;
  name: string;
  category: string;
  language: string;
  content: string;
  header_text: string | null;
  footer_text: string | null;
  buttons: Record<string, unknown>[] | null;
  variables: string[] | null;
  status: string;
  whatsapp_connection_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing', color: 'bg-info/20 text-info' },
  { value: 'utility', label: 'Utilidade', color: 'bg-success/20 text-success' },
  { value: 'authentication', label: 'Autenticação', color: 'bg-primary/20 text-primary' },
];

const TEMPLATE_LANGUAGES = [
  { value: 'pt_BR', label: 'Português (BR)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
];

const STATUS_BADGES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: 'Aprovado', className: 'bg-success/20 text-success', icon: CheckCircle2 },
  pending: { label: 'Pendente', className: 'bg-warning/20 text-warning', icon: Clock },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/20 text-destructive', icon: XCircle },
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground', icon: FileText },
};

const EMPTY_TEMPLATE: Partial<WhatsAppTemplate> = {
  name: '',
  category: 'utility',
  language: 'pt_BR',
  content: '',
  header_text: '',
  footer_text: '',
  buttons: [],
  variables: [],
  status: 'draft',
};

export function WhatsAppTemplatesManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WhatsAppTemplate>>(EMPTY_TEMPLATE);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as WhatsAppTemplate[]);
    } catch (err) {
      log.error('Error fetching templates:', err);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches)].sort();
  };

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content);
    setEditingTemplate(prev => ({
      ...prev,
      content,
      variables,
    }));
  };

  const handleSave = async () => {
    if (!editingTemplate.name?.trim() || !editingTemplate.content?.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        name: editingTemplate.name.trim().toLowerCase().replace(/\s+/g, '_'),
        category: editingTemplate.category || 'utility',
        language: editingTemplate.language || 'pt_BR',
        content: editingTemplate.content.trim(),
        header_text: editingTemplate.header_text?.trim() || null,
        footer_text: editingTemplate.footer_text?.trim() || null,
        buttons: (editingTemplate.buttons || []) as unknown as Record<string, never>,
        variables: editingTemplate.variables || [],
        status: editingTemplate.status || 'draft',
        created_by: user?.id || null,
      };

      if (editingTemplate.id) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert(templateData);
        if (error) throw error;
        toast.success('Template criado!');
      }

      setIsDialogOpen(false);
      setEditingTemplate(EMPTY_TEMPLATE);
      fetchTemplates();
    } catch (err) {
      log.error('Error saving template:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Template removido!');
      fetchTemplates();
    } catch (err) {
      log.error('Error deleting template:', err);
      toast.error('Erro ao remover template');
    }
  };

  const handleDuplicate = async (template: WhatsAppTemplate) => {
    setEditingTemplate({
      ...template,
      id: undefined,
      name: `${template.name}_copy`,
      status: 'draft',
    });
    setIsDialogOpen(true);
  };

  const handlePreview = (template: WhatsAppTemplate) => {
    setPreviewTemplate(template);
    const vars: Record<string, string> = {};
    (template.variables || []).forEach((v: string) => {
      vars[v] = v === '{{1}}' ? 'João' : v === '{{2}}' ? '12345' : `valor_${v}`;
    });
    setPreviewVariables(vars);
    setIsPreviewOpen(true);
  };

  const renderPreviewContent = (content: string, variables: Record<string, string>) => {
    let rendered = content;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.split(key).join(value || key);
    });
    return rendered;
  };

  const filteredTemplates = templates.filter(t => {
    if (search && !t.name.includes(search.toLowerCase()) && !t.content.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">Templates WhatsApp</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gerencie templates oficiais aprovados pelo WhatsApp Business API
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(EMPTY_TEMPLATE);
            setIsDialogOpen(true);
          }}
          className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {TEMPLATE_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Table */}
      <Card className="border-secondary/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum template encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEditingTemplate(EMPTY_TEMPLATE);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredTemplates.map(template => {
                    const statusInfo = STATUS_BADGES[template.status] || STATUS_BADGES.draft;
                    const StatusIcon = statusInfo.icon;
                    const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.value === template.category);

                    return (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-border/50"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {template.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', categoryInfo?.color)}>
                            {categoryInfo?.label || template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {TEMPLATE_LANGUAGES.find(l => l.value === template.language)?.label || template.language}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs gap-1', statusInfo.className)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(template.variables?.length || 0) > 0 ? (
                            <div className="flex gap-1">
                              {template.variables?.map((v: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(template)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingTemplate(template);
                              setIsDialogOpen(true);
                            }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate.id ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            <DialogDescription>
              Configure o template para uso com a WhatsApp Business API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: confirmacao_pedido"
                />
                <p className="text-xs text-muted-foreground">Apenas letras minúsculas e underscores</p>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={editingTemplate.category || 'utility'}
                  onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={editingTemplate.language || 'pt_BR'}
                  onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingTemplate.status || 'draft'}
                  onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cabeçalho (opcional)</Label>
              <Input
                value={editingTemplate.header_text || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, header_text: e.target.value }))}
                placeholder="Texto do cabeçalho"
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do Template</Label>
              <Textarea
                value={editingTemplate.content || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={6}
                placeholder="Olá {{1}}, seu pedido {{2}} foi confirmado!"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Variable className="w-3 h-3" />
                Use {"{{1}}"}, {"{{2}}"}, etc. para variáveis dinâmicas
              </div>
              {(editingTemplate.variables?.length || 0) > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {editingTemplate.variables?.map((v, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rodapé (opcional)</Label>
              <Input
                value={editingTemplate.footer_text || ''}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Texto do rodapé"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {editingTemplate.id ? 'Atualizar' : 'Criar'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
            <DialogDescription>
              Visualize como o template será exibido
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              {/* Variable inputs */}
              {(previewTemplate.variables?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valores das variáveis:</Label>
                  {previewTemplate.variables?.map((v: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">{v}</Badge>
                      <Input
                        value={previewVariables[v] || ''}
                        onChange={(e) => setPreviewVariables(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`Valor para ${v}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* WhatsApp-like preview */}
              <div className="bg-[#0b141a] rounded-xl p-4">
                <div className="bg-[#005c4b] rounded-lg p-3 max-w-[280px] ml-auto">
                  {previewTemplate.header_text && (
                    <p className="text-primary-foreground font-bold text-sm mb-1">
                      {renderPreviewContent(previewTemplate.header_text, previewVariables)}
                    </p>
                  )}
                  <p className="text-primary-foreground text-sm whitespace-pre-wrap">
                    {renderPreviewContent(previewTemplate.content, previewVariables)}
                  </p>
                  {previewTemplate.footer_text && (
                    <p className="text-primary-foreground/60 text-xs mt-2">
                      {renderPreviewContent(previewTemplate.footer_text, previewVariables)}
                    </p>
                  )}
                  <p className="text-primary-foreground/40 text-[10px] text-right mt-1">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
