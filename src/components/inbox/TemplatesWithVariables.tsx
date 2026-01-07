import { useState, useMemo, useCallback, useRef } from 'react';
import { log } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Search,
  Tag,
  Folder,
  MoreVertical,
  Sparkles,
  Eye,
  FileText,
  User,
  Building2,
  Calendar,
  Hash,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Variable definitions
const AVAILABLE_VARIABLES = [
  { key: 'nome', label: 'Nome do contato', icon: User, example: 'João Silva' },
  { key: 'primeiro_nome', label: 'Primeiro nome', icon: User, example: 'João' },
  { key: 'empresa', label: 'Empresa', icon: Building2, example: 'Tech Corp' },
  { key: 'cargo', label: 'Cargo', icon: Tag, example: 'Gerente Comercial' },
  { key: 'saudacao', label: 'Saudação', icon: Sparkles, example: 'Bom dia' },
  { key: 'data_atual', label: 'Data atual', icon: Calendar, example: '06/01/2026' },
  { key: 'protocolo', label: 'Protocolo', icon: Hash, example: '#2026010600123' },
  { key: 'atendente', label: 'Nome do atendente', icon: User, example: 'Maria Santos' },
];

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string | null;
  is_global: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

interface TemplateWithVariablesProps {
  templates: Template[];
  onUseTemplate: (content: string, variables: Record<string, string>) => void;
  contactData?: {
    name?: string;
    company?: string;
    job_title?: string;
  };
}

// Parse and highlight variables in text
function VariableHighlighter({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(/^\{\{[^}]+\}\}$/)) {
          const varName = part.slice(2, -2);
          return (
            <Badge 
              key={index} 
              variant="secondary" 
              className="mx-0.5 text-xs font-mono"
            >
              {varName}
            </Badge>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

// Replace variables with actual values
function replaceVariables(
  content: string, 
  contactData?: { name?: string; company?: string; job_title?: string },
  customValues?: Record<string, string>
): string {
  const now = new Date();
  const hour = now.getHours();
  let saudacao = 'Bom dia';
  if (hour >= 12 && hour < 18) saudacao = 'Boa tarde';
  if (hour >= 18 || hour < 6) saudacao = 'Boa noite';
  
  const firstName = contactData?.name?.split(' ')[0] || '';
  const protocol = `#${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  
  const defaultValues: Record<string, string> = {
    nome: contactData?.name || '',
    primeiro_nome: firstName,
    empresa: contactData?.company || '',
    cargo: contactData?.job_title || '',
    saudacao,
    data_atual: now.toLocaleDateString('pt-BR'),
    protocolo: protocol,
    atendente: 'Atendente', // Would come from current user
  };
  
  const values = { ...defaultValues, ...customValues };
  
  let result = content;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
  });
  
  return result;
}

// Get variables used in a template
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2).toLowerCase()))];
}

// Live preview component
function TemplatePreview({ 
  content, 
  contactData,
  className,
}: { 
  content: string;
  contactData?: { name?: string; company?: string; job_title?: string };
  className?: string;
}) {
  const previewContent = replaceVariables(content, contactData);
  
  return (
    <div className={cn('p-3 rounded-lg bg-muted/50 border text-sm', className)}>
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Eye className="w-3 h-3" />
        Preview com dados do contato
      </div>
      <p className="whitespace-pre-wrap">{previewContent}</p>
    </div>
  );
}

// Variable inserter component
function VariableInserter({ 
  onInsert, 
  className,
}: { 
  onInsert: (variable: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      <TooltipProvider>
        {AVAILABLE_VARIABLES.map((v) => {
          const Icon = v.icon;
          return (
            <Tooltip key={v.key}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onInsert(`{{${v.key}}}`)}
                >
                  <Icon className="w-3 h-3" />
                  {v.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exemplo: {v.example}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

// Template editor dialog
function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSave: (data: Partial<Template>) => Promise<void>;
}) {
  const [title, setTitle] = useState(template?.title || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState(template?.category || 'geral');
  const [shortcut, setShortcut] = useState(template?.shortcut || '');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleInsertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + variable + content.slice(end);
      setContent(newContent);
      
      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            start + variable.length,
            start + variable.length
          );
        }
      }, 0);
    } else {
      setContent(content + variable);
    }
  };
  
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        title,
        content,
        category,
        shortcut: shortcut || null,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            Use variáveis dinâmicas para personalizar suas mensagens
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Boas-vindas Inicial"
            />
          </div>
          
          {/* Category & Shortcut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="cobranca">Cobrança</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Atalho (opcional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase())}
                  placeholder="boasvindas"
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          
          {/* Variable Inserter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Variáveis Disponíveis
            </Label>
            <VariableInserter onInsert={handleInsertVariable} />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite sua mensagem... Use {{variavel}} para inserir dados dinâmicos"
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis detectadas: {extractVariables(content).length > 0 
                ? extractVariables(content).map(v => `{{${v}}}`).join(', ')
                : 'Nenhuma'}
            </p>
          </div>
          
          {/* Preview */}
          {content && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <TemplatePreview
                content={content}
                contactData={{
                  name: 'João Silva',
                  company: 'Tech Corp',
                  job_title: 'Gerente Comercial',
                }}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplatesWithVariables({
  templates,
  onUseTemplate,
  contactData,
}: TemplateWithVariablesProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !search || 
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, categoryFilter]);
  
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);
  
  const handleUseTemplate = (template: Template) => {
    const processedContent = replaceVariables(template.content, contactData);
    onUseTemplate(processedContent, {});
    toast.success(`Template "${template.title}" aplicado!`);
  };
  
  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };
  
  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };
  
  const handleSave = async (data: Partial<Template>) => {
    // In production, this would save to database
    log.debug('Saving template:', { ...editingTemplate, ...data });
    toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Templates com Variáveis
            </CardTitle>
            <CardDescription>
              Mensagens dinâmicas com dados do contato
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <Folder className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Templates List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            <AnimatePresence>
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {template.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.shortcut && (
                          <Badge variant="outline" className="text-xs font-mono">
                            /{template.shortcut}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        <VariableHighlighter text={template.content} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum template encontrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Editor Dialog */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
      />
    </Card>
  );
}

export { VariableHighlighter, TemplatePreview, VariableInserter, replaceVariables, AVAILABLE_VARIABLES };
