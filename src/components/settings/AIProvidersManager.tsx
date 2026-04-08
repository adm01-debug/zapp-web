import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Brain, Plus, Pencil, Trash2, Zap, TestTube, Loader2, Star, Webhook, Bot, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProviderType = 'lovable_ai' | 'openai_compatible' | 'google_gemini' | 'custom_webhook' | 'custom_agent';

interface AIProvider {
  id: string;
  name: string;
  description: string | null;
  provider_type: ProviderType;
  api_endpoint: string | null;
  api_key_secret_name: string | null;
  model: string | null;
  system_prompt: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  use_for: string[];
  created_at: string;
}

const PROVIDER_LABELS: Record<ProviderType, { label: string; icon: typeof Brain; color: string }> = {
  lovable_ai: { label: 'Lovable AI', icon: Cloud, color: 'bg-primary/15 text-primary' },
  openai_compatible: { label: 'OpenAI Compatível', icon: Brain, color: 'bg-emerald-500/15 text-emerald-600' },
  google_gemini: { label: 'Google Gemini', icon: Zap, color: 'bg-blue-500/15 text-blue-600' },
  custom_webhook: { label: 'Webhook Customizado', icon: Webhook, color: 'bg-orange-500/15 text-orange-600' },
  custom_agent: { label: 'Agente IA Externo', icon: Bot, color: 'bg-purple-500/15 text-purple-600' },
};

const USE_FOR_OPTIONS = [
  { value: 'copilot', label: 'Copiloto' },
  { value: 'analysis', label: 'Análise de Conversa' },
  { value: 'summary', label: 'Resumo' },
  { value: 'tagging', label: 'Auto-tagging' },
  { value: 'auto_reply', label: 'Resposta Automática' },
];

const EMPTY_FORM: Omit<AIProvider, 'id' | 'created_at'> = {
  name: '',
  description: '',
  provider_type: 'openai_compatible',
  api_endpoint: '',
  api_key_secret_name: '',
  model: '',
  system_prompt: '',
  config: {},
  is_active: true,
  is_default: false,
  use_for: ['copilot'],
};

export function AIProvidersManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testing, setTesting] = useState<string | null>(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AIProvider[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const record = {
        name: payload.name,
        description: payload.description || null,
        provider_type: payload.provider_type,
        api_endpoint: payload.api_endpoint || null,
        api_key_secret_name: payload.api_key_secret_name || null,
        model: payload.model || null,
        system_prompt: payload.system_prompt || null,
        config: payload.config || {},
        is_active: payload.is_active,
        is_default: payload.is_default,
        use_for: payload.use_for,
      };

      if (editingId) {
        const { error } = await supabase.from('ai_providers').update(record).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_providers').insert(record as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast({ title: editingId ? 'Provedor atualizado!' : 'Provedor criado!' });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast({ title: 'Provedor removido.' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const handleTest = async (provider: AIProvider) => {
    setTesting(provider.id);
    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            { role: 'system', content: 'Responda apenas: TESTE OK' },
            { role: 'user', content: 'Olá, teste de conexão.' },
          ],
          use_for: provider.use_for[0] || 'copilot',
          provider_id: provider.id,
        },
      });
      if (error) throw error;
      const content = data?.choices?.[0]?.message?.content || JSON.stringify(data);
      toast({ title: '✅ Teste OK!', description: content.slice(0, 200) });
    } catch (e: any) {
      toast({ title: '❌ Falha no Teste', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  const openEdit = (p: AIProvider) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      provider_type: p.provider_type,
      api_endpoint: p.api_endpoint,
      api_key_secret_name: p.api_key_secret_name,
      model: p.model,
      system_prompt: p.system_prompt,
      config: p.config || {},
      is_active: p.is_active,
      is_default: p.is_default,
      use_for: p.use_for,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const toggleUseFor = (val: string) => {
    setForm(prev => ({
      ...prev,
      use_for: prev.use_for.includes(val)
        ? prev.use_for.filter(v => v !== val)
        : [...prev.use_for, val],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Gestão de Provedores de IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure provedores de IA externos, agentes treinados ou APIs customizadas.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Provedor
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum provedor configurado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map(p => {
            const meta = PROVIDER_LABELS[p.provider_type] || PROVIDER_LABELS.custom_agent;
            const Icon = meta.icon;
            return (
              <Card key={p.id} className={cn('transition-all hover:shadow-md', !p.is_active && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn('p-2 rounded-lg shrink-0', meta.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{p.name}</h3>
                          {p.is_default && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Star className="w-3 h-3" /> Padrão
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn('text-xs', meta.color)}>
                            {meta.label}
                          </Badge>
                          {!p.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                        </div>
                        {p.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {p.use_for.map(u => (
                            <Badge key={u} variant="outline" className="text-[10px] px-1.5">
                              {USE_FOR_OPTIONS.find(o => o.value === u)?.label || u}
                            </Badge>
                          ))}
                          {p.model && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Modelo: {p.model}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTest(p)}
                        disabled={testing === p.id || !p.is_active}
                        title="Testar conexão"
                      >
                        {testing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {p.provider_type !== 'lovable_ai' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remover "${p.name}"?`)) deleteMutation.mutate(p.id);
                          }}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Form Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Provedor' : 'Novo Provedor de IA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Gemini Pro, Agente de Vendas"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description || ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição breve do provedor"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de Provedor *</Label>
              <Select
                value={form.provider_type}
                onValueChange={v => setForm(p => ({ ...p, provider_type: v as ProviderType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable_ai">Lovable AI (Integrado)</SelectItem>
                  <SelectItem value="openai_compatible">API OpenAI Compatível</SelectItem>
                  <SelectItem value="google_gemini">Google Gemini</SelectItem>
                  <SelectItem value="custom_webhook">Webhook Customizado</SelectItem>
                  <SelectItem value="custom_agent">Agente IA Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.provider_type !== 'lovable_ai' && (
              <>
                <div className="space-y-1.5">
                  <Label>Endpoint da API *</Label>
                  <Input
                    value={form.api_endpoint || ''}
                    onChange={e => setForm(p => ({ ...p, api_endpoint: e.target.value }))}
                    placeholder="https://api.openai.com/v1/chat/completions"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL completa do endpoint de chat/completions da API.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Nome do Secret da API Key</Label>
                  <Input
                    value={form.api_key_secret_name || ''}
                    onChange={e => setForm(p => ({ ...p, api_key_secret_name: e.target.value }))}
                    placeholder="OPENAI_API_KEY"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome do secret configurado no backend. A chave será lida automaticamente.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input
                value={form.model || ''}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                placeholder={form.provider_type === 'lovable_ai' ? 'google/gemini-2.5-flash' : 'gpt-4o'}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Prompt de Sistema</Label>
              <Textarea
                value={form.system_prompt || ''}
                onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))}
                placeholder="Instruções personalizadas para o modelo..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Será adicionado como prefixo ao prompt de sistema de cada funcionalidade.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Usar para</Label>
              <div className="flex flex-wrap gap-3">
                {USE_FOR_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.use_for.includes(opt.value)}
                      onCheckedChange={() => toggleUseFor(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
                />
                <span className="text-sm">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={v => setForm(p => ({ ...p, is_default: v }))}
                />
                <span className="text-sm">Provedor Padrão</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? 'Salvar' : 'Criar Provedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
