import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, BookOpen, FileText, Search, Upload, Trash2, Edit, Eye, Brain,
  FolderOpen, Tag, Clock, CheckCircle, AlertCircle, File
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_published: boolean;
  embedding_status: string;
  created_at: string;
  updated_at: string;
}

interface KBFile {
  id: string;
  article_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  processing_status: string;
  created_at: string;
}

const CATEGORIES = ['general', 'product', 'support', 'sales', 'onboarding', 'technical', 'faq'];

export function KnowledgeBaseView() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [files, setFiles] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState('articles');

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formTags, setFormTags] = useState('');
  const [formPublished, setFormPublished] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [articlesRes, filesRes] = await Promise.all([
      supabase.from('knowledge_base_articles').select('*').order('updated_at', { ascending: false }),
      supabase.from('knowledge_base_files').select('*').order('created_at', { ascending: false }),
    ]);
    if (articlesRes.data) setArticles(articlesRes.data.map((a: any) => ({ ...a, tags: a.tags || [] })));
    if (filesRes.data) setFiles(filesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditingArticle(null);
    setFormTitle(''); setFormContent(''); setFormCategory('general'); setFormTags(''); setFormPublished(true);
    setShowEditor(true);
  };

  const openEdit = (article: Article) => {
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormCategory(article.category);
    setFormTags(article.tags.join(', '));
    setFormPublished(article.is_published);
    setShowEditor(true);
  };

  const save = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    const payload = {
      title: formTitle,
      content: formContent,
      category: formCategory,
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      is_published: formPublished,
    };

    if (editingArticle) {
      const { error } = await supabase.from('knowledge_base_articles').update(payload).eq('id', editingArticle.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Artigo atualizado!' });
    } else {
      const { error } = await supabase.from('knowledge_base_articles').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Artigo criado!' });
    }
    setShowEditor(false);
    fetchData();
  };

  const deleteArticle = async (id: string) => {
    await supabase.from('knowledge_base_articles').delete().eq('id', id);
    toast({ title: 'Artigo removido' });
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `kb/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);

    await supabase.from('knowledge_base_files').insert({
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
    });

    toast({ title: 'Arquivo enviado!', description: file.name });
    fetchData();
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (status === 'processing') return <Clock className="w-3.5 h-3.5 text-warning animate-spin" />;
    return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const categoryLabels: Record<string, string> = {
    general: 'Geral', product: 'Produto', support: 'Suporte', sales: 'Vendas',
    onboarding: 'Onboarding', technical: 'Técnico', faq: 'FAQ'
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Base de Conhecimento"
        subtitle="Treine a IA com documentos e artigos da sua empresa"
        actions={
          <div className="flex gap-2">
            <label>
              <Button variant="outline" className="gap-2" asChild>
                <span><Upload className="w-4 h-4" /> Upload</span>
              </Button>
              <input type="file" className="hidden" accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFileUpload} />
            </label>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Artigo
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pb-4">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Artigos</p>
              <p className="text-lg font-bold">{articles.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <File className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arquivos</p>
              <p className="text-lg font-bold">{files.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Publicados</p>
              <p className="text-lg font-bold">{articles.filter(a => a.is_published).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Indexados</p>
              <p className="text-lg font-bold">{articles.filter(a => a.embedding_status === 'completed').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-6">
        <TabsList>
          <TabsTrigger value="articles">Artigos</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="flex-1 mt-4">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artigos..." className="pl-9" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 overflow-y-auto">
            <AnimatePresence>
              {filteredArticles.map((article) => (
                <motion.div key={article.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="bg-card/50 border-border/30 hover:border-secondary/30 transition-all group h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {statusIcon(article.embedding_status)}
                          <Badge variant="outline" className="text-[10px]">
                            {categoryLabels[article.category] || article.category}
                          </Badge>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(article)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteArticle(article.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground mb-1">{article.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{article.content}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {article.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-4">{tag}</Badge>
                        ))}
                        {!article.is_published && (
                          <Badge variant="outline" className="text-[10px] h-4 text-warning border-yellow-400/30">Rascunho</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="space-y-2 pb-6">
            {files.map(file => (
              <Card key={file.id} className="bg-card/50 border-border/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : 'N/A'} • {new Date(file.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(file.processing_status)}
                    <Badge variant="outline" className="text-[10px]">{file.processing_status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {files.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum arquivo enviado</p>
                <p className="text-xs">Faça upload de PDFs, documentos ou textos</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título do artigo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="tag1, tag2" />
              </div>
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={12} placeholder="Escreva o conteúdo do artigo..." className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            <Button onClick={save}>{editingArticle ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
