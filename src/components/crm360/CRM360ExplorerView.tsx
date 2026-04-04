/**
 * CRM360ExplorerView — Full CRM 360° data explorer
 * Browse ALL tables from the external CRM database with filters, pagination, search, export, and CRUD
 */
import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Building2, Users, ShoppingCart, MessageSquare, BarChart3,
  Share2, MapPin, Phone, Mail, Truck, Package, Trophy, RefreshCw,
  ChevronLeft, ChevronRight, X, Download, ArrowUpDown, Plus, Pencil,
  DollarSign, User, Activity, Calendar, Zap, FileText, Target,
  Briefcase, Tag, Globe, Layers, ClipboardList, StickyNote, CreditCard,
} from 'lucide-react';
import { useExternalTableBrowser } from '@/hooks/useExternalDB';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CRM360StatsCards } from './CRM360StatsCards';
import { CompanyFormDialog } from './CompanyFormDialog';
import { ContactFormDialog } from './ContactFormDialog';
import type { ExternalTableName } from '@/types/externalDB';

// ─── Tab configuration ───────────────────────────────────────
interface TabConfig {
  id: ExternalTableName | string;
  label: string;
  icon: React.ElementType;
  description: string;
  searchColumn?: string;
  editable?: boolean;
  columns: { key: string; label: string; format?: 'date' | 'currency' | 'boolean' | 'number' }[];
}

const TABS: TabConfig[] = [
  {
    id: 'companies',
    label: 'Empresas',
    icon: Building2,
    description: '57k+ empresas — razão social, CNPJ, ramo de atividade',
    searchColumn: 'nome_fantasia',
    editable: true,
    columns: [
      { key: 'nome_fantasia', label: 'Fantasia' },
      { key: 'razao_social', label: 'Razão Social' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'ramo_atividade', label: 'Ramo' },
      { key: 'status', label: 'Status' },
      { key: 'porte_rf', label: 'Porte' },
      { key: 'capital_social', label: 'Capital', format: 'currency' },
      { key: 'data_fundacao', label: 'Fundação', format: 'date' },
    ],
  },
  {
    id: 'contacts',
    label: 'Contatos',
    icon: Users,
    description: '4.7k+ contatos — nome, cargo, empresa, score',
    searchColumn: 'full_name',
    editable: true,
    columns: [
      { key: 'full_name', label: 'Nome' },
      { key: 'cargo', label: 'Cargo' },
      { key: 'departamento', label: 'Departamento' },
      { key: 'relationship_stage', label: 'Estágio' },
      { key: 'relationship_score', label: 'Score', format: 'number' },
      { key: 'sentiment', label: 'Sentimento' },
      { key: 'source', label: 'Origem' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'customers',
    label: 'Clientes',
    icon: ShoppingCart,
    description: '52k+ registros — dados financeiros, vendedores, ativação',
    searchColumn: 'vendedor_nome',
    columns: [
      { key: 'vendedor_nome', label: 'Vendedor' },
      { key: 'cliente_ativado', label: 'Ativo', format: 'boolean' },
      { key: 'ja_comprou', label: 'Comprou', format: 'boolean' },
      { key: 'total_pedidos', label: 'Pedidos', format: 'number' },
      { key: 'valor_total_compras', label: 'Total', format: 'currency' },
      { key: 'ticket_medio', label: 'Ticket', format: 'currency' },
      { key: 'poder_compra', label: 'Poder' },
      { key: 'grupo_clientes', label: 'Grupo' },
      { key: 'perfil_preco', label: 'Preço' },
      { key: 'data_ultima_compra', label: 'Última Compra', format: 'date' },
    ],
  },
  {
    id: 'company_rfm_scores',
    label: 'RFM',
    icon: BarChart3,
    description: 'Recência, Frequência e Monetário',
    searchColumn: 'segment_code',
    columns: [
      { key: 'segment_code', label: 'Segmento' },
      { key: 'recency_score', label: 'R', format: 'number' },
      { key: 'frequency_score', label: 'F', format: 'number' },
      { key: 'monetary_score', label: 'M', format: 'number' },
      { key: 'combined_score', label: 'Score', format: 'number' },
      { key: 'interaction_count', label: 'Interações', format: 'number' },
      { key: 'total_value', label: 'Valor', format: 'currency' },
      { key: 'overall_trend', label: 'Tendência' },
      { key: 'calculated_at', label: 'Calculado', format: 'date' },
    ],
  },
  {
    id: 'interactions',
    label: 'Interações',
    icon: MessageSquare,
    description: '10k+ interações com contatos e empresas',
    searchColumn: 'assunto',
    columns: [
      { key: 'channel', label: 'Canal' },
      { key: 'direction', label: 'Direção' },
      { key: 'type', label: 'Tipo' },
      { key: 'assunto', label: 'Assunto' },
      { key: 'resumo', label: 'Resumo' },
      { key: 'sentiment', label: 'Sentimento' },
      { key: 'data_interacao', label: 'Data', format: 'date' },
    ],
  },
  {
    id: 'salespeople',
    label: 'Vendedores',
    icon: User,
    description: 'Equipe de vendas',
    searchColumn: 'name',
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Cargo' },
      { key: 'commission_rate', label: 'Comissão', format: 'number' },
      { key: 'is_active', label: 'Ativo', format: 'boolean' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'sales',
    label: 'Vendas',
    icon: DollarSign,
    description: 'Registro de vendas',
    searchColumn: 'client_name',
    columns: [
      { key: 'client_name', label: 'Cliente' },
      { key: 'product_name', label: 'Produto' },
      { key: 'amount', label: 'Valor', format: 'currency' },
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Categoria' },
      { key: 'source', label: 'Origem' },
      { key: 'created_at', label: 'Data', format: 'date' },
    ],
  },
  {
    id: 'sales_activities',
    label: 'Atividades',
    icon: Activity,
    description: 'Atividades de venda registradas',
    searchColumn: 'activity_type',
    columns: [
      { key: 'activity_type', label: 'Tipo' },
      { key: 'outcome', label: 'Resultado' },
      { key: 'notes', label: 'Notas' },
      { key: 'duration_minutes', label: 'Duração (min)', format: 'number' },
      { key: 'contact_name', label: 'Contato' },
      { key: 'created_at', label: 'Data', format: 'date' },
    ],
  },
  {
    id: 'contact_phones',
    label: 'Tel. Contatos',
    icon: Phone,
    description: 'Telefones dos contatos',
    searchColumn: 'numero',
    columns: [
      { key: 'numero', label: 'Número' },
      { key: 'numero_e164', label: 'E.164' },
      { key: 'phone_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'is_whatsapp', label: 'WhatsApp', format: 'boolean' },
      { key: 'is_verified', label: 'Verificado', format: 'boolean' },
      { key: 'fonte', label: 'Fonte' },
    ],
  },
  {
    id: 'contact_emails',
    label: 'Emails Contatos',
    icon: Mail,
    description: 'E-mails dos contatos',
    searchColumn: 'email',
    columns: [
      { key: 'email', label: 'E-mail' },
      { key: 'email_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'is_verified', label: 'Verificado', format: 'boolean' },
      { key: 'contexto', label: 'Contexto' },
      { key: 'fonte', label: 'Fonte' },
      { key: 'confiabilidade', label: 'Confiança', format: 'number' },
    ],
  },
  {
    id: 'company_phones',
    label: 'Tel. Empresas',
    icon: Phone,
    description: 'Telefones das empresas',
    searchColumn: 'numero',
    columns: [
      { key: 'numero', label: 'Número' },
      { key: 'numero_e164', label: 'E.164' },
      { key: 'phone_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'is_whatsapp', label: 'WhatsApp', format: 'boolean' },
      { key: 'departamento', label: 'Depto.' },
    ],
  },
  {
    id: 'company_emails',
    label: 'Emails Empresas',
    icon: Mail,
    description: 'E-mails das empresas',
    searchColumn: 'email',
    columns: [
      { key: 'email', label: 'E-mail' },
      { key: 'email_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'departamento', label: 'Depto.' },
    ],
  },
  {
    id: 'company_social_media',
    label: 'Social Empresas',
    icon: Share2,
    description: '99k+ registros de redes sociais',
    searchColumn: 'handle',
    columns: [
      { key: 'plataforma', label: 'Plataforma' },
      { key: 'handle', label: 'Handle' },
      { key: 'url', label: 'URL' },
      { key: 'seguidores', label: 'Seguidores', format: 'number' },
      { key: 'is_active', label: 'Ativo', format: 'boolean' },
      { key: 'origem', label: 'Origem' },
    ],
  },
  {
    id: 'contact_social_media',
    label: 'Social Contatos',
    icon: Share2,
    description: 'Redes sociais dos contatos',
    searchColumn: 'handle',
    columns: [
      { key: 'plataforma', label: 'Plataforma' },
      { key: 'handle', label: 'Handle' },
      { key: 'url', label: 'URL' },
      { key: 'confiabilidade', label: 'Confiança', format: 'number' },
      { key: 'fonte', label: 'Fonte' },
    ],
  },
  {
    id: 'company_addresses',
    label: 'End. Empresas',
    icon: MapPin,
    description: 'Endereços das empresas',
    searchColumn: 'cidade',
    columns: [
      { key: 'logradouro', label: 'Logradouro' },
      { key: 'numero', label: 'Nº' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'UF' },
      { key: 'cep', label: 'CEP' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
    ],
  },
  {
    id: 'contact_addresses',
    label: 'End. Contatos',
    icon: MapPin,
    description: 'Endereços dos contatos',
    searchColumn: 'cidade',
    columns: [
      { key: 'logradouro', label: 'Logradouro' },
      { key: 'numero', label: 'Nº' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'UF' },
      { key: 'pais', label: 'País' },
      { key: 'tipo', label: 'Tipo' },
    ],
  },
  {
    id: 'suppliers',
    label: 'Fornecedores',
    icon: Package,
    description: 'Base de fornecedores',
    searchColumn: 'categoria',
    columns: [
      { key: 'categoria', label: 'Categoria' },
      { key: 'tipo_fornecedor', label: 'Tipo' },
      { key: 'ramo_atividade', label: 'Ramo' },
      { key: 'perfil_preco', label: 'Preço' },
      { key: 'perfil_qualidade', label: 'Qualidade' },
      { key: 'perfil_prazo', label: 'Prazo' },
      { key: 'homologado', label: 'Homologado', format: 'boolean' },
      { key: 'score_geral', label: 'Score', format: 'number' },
    ],
  },
  {
    id: 'carriers',
    label: 'Transportadoras',
    icon: Truck,
    description: 'Transportadoras cadastradas',
    searchColumn: 'tipo_transporte',
    columns: [
      { key: 'tipo_transporte', label: 'Tipo' },
      { key: 'tipo_frete', label: 'Frete' },
      { key: 'transportadora_validada', label: 'Validada', format: 'boolean' },
      { key: 'homologado', label: 'Homologado', format: 'boolean' },
      { key: 'score_geral', label: 'Score', format: 'number' },
      { key: 'ultimo_transporte', label: 'Último', format: 'date' },
    ],
  },
  {
    id: 'achievements',
    label: 'Conquistas',
    icon: Trophy,
    description: 'Conquistas dos vendedores',
    searchColumn: 'achievement_type',
    columns: [
      { key: 'achievement_type', label: 'Tipo' },
      { key: 'achievement_date', label: 'Data', format: 'date' },
    ],
  },
  {
    id: 'daily_challenges',
    label: 'Desafios Diários',
    icon: Zap,
    description: 'Desafios diários da gamificação',
    searchColumn: 'title',
    columns: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descrição' },
      { key: 'challenge_type', label: 'Tipo' },
      { key: 'target_value', label: 'Meta', format: 'number' },
      { key: 'xp_reward', label: 'XP', format: 'number' },
      { key: 'is_active', label: 'Ativo', format: 'boolean' },
      { key: 'challenge_date', label: 'Data', format: 'date' },
    ],
  },
  {
    id: 'weekly_challenges',
    label: 'Desafios Semanais',
    icon: Calendar,
    description: 'Desafios semanais da gamificação',
    searchColumn: 'title',
    columns: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descrição' },
      { key: 'challenge_type', label: 'Tipo' },
      { key: 'target_value', label: 'Meta', format: 'number' },
      { key: 'xp_reward', label: 'XP', format: 'number' },
      { key: 'is_active', label: 'Ativo', format: 'boolean' },
      { key: 'start_date', label: 'Início', format: 'date' },
      { key: 'end_date', label: 'Fim', format: 'date' },
    ],
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: ClipboardList,
    description: 'Pedidos de venda realizados',
    searchColumn: 'numero_pedido',
    columns: [
      { key: 'numero_pedido', label: 'Nº Pedido' },
      { key: 'status', label: 'Status' },
      { key: 'valor_total', label: 'Valor Total', format: 'currency' },
      { key: 'data_pedido', label: 'Data', format: 'date' },
      { key: 'forma_pagamento', label: 'Pagamento' },
      { key: 'prazo_entrega', label: 'Prazo' },
    ],
  },
  {
    id: 'order_items',
    label: 'Itens Pedido',
    icon: Package,
    description: 'Itens individuais dos pedidos',
    searchColumn: 'produto_nome',
    columns: [
      { key: 'produto_nome', label: 'Produto' },
      { key: 'quantidade', label: 'Qtd', format: 'number' },
      { key: 'preco_unitario', label: 'Preço Unit.', format: 'currency' },
      { key: 'valor_total', label: 'Subtotal', format: 'currency' },
      { key: 'desconto', label: 'Desconto', format: 'currency' },
    ],
  },
  {
    id: 'products',
    label: 'Produtos',
    icon: Package,
    description: 'Catálogo de produtos',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'codigo', label: 'Código' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'preco', label: 'Preço', format: 'currency' },
      { key: 'estoque', label: 'Estoque', format: 'number' },
      { key: 'ativo', label: 'Ativo', format: 'boolean' },
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: Target,
    description: 'Leads de prospecção',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'empresa', label: 'Empresa' },
      { key: 'canal_origem', label: 'Canal' },
      { key: 'status', label: 'Status' },
      { key: 'temperatura', label: 'Temperatura' },
      { key: 'responsavel_nome', label: 'Responsável' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'deals',
    label: 'Negócios',
    icon: Briefcase,
    description: 'Negócios em andamento',
    searchColumn: 'titulo',
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'valor', label: 'Valor', format: 'currency' },
      { key: 'estagio', label: 'Estágio' },
      { key: 'probabilidade', label: 'Prob. %', format: 'number' },
      { key: 'responsavel_nome', label: 'Responsável' },
      { key: 'data_fechamento', label: 'Fechamento', format: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    id: 'quotations',
    label: 'Orçamentos',
    icon: FileText,
    description: 'Orçamentos enviados',
    searchColumn: 'numero',
    columns: [
      { key: 'numero', label: 'Nº' },
      { key: 'valor_total', label: 'Valor', format: 'currency' },
      { key: 'status', label: 'Status' },
      { key: 'validade', label: 'Validade', format: 'date' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tarefas',
    icon: ClipboardList,
    description: 'Tarefas e follow-ups',
    searchColumn: 'titulo',
    columns: [
      { key: 'titulo', label: 'Título' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'status', label: 'Status' },
      { key: 'prioridade', label: 'Prioridade' },
      { key: 'responsavel_nome', label: 'Responsável' },
      { key: 'data_vencimento', label: 'Vencimento', format: 'date' },
    ],
  },
  {
    id: 'notes',
    label: 'Notas',
    icon: StickyNote,
    description: 'Notas e observações',
    searchColumn: 'conteudo',
    columns: [
      { key: 'conteudo', label: 'Conteúdo' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'autor_nome', label: 'Autor' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tag,
    description: 'Tags para classificação',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'cor', label: 'Cor' },
      { key: 'categoria', label: 'Categoria' },
    ],
  },
  {
    id: 'pipelines',
    label: 'Pipelines',
    icon: Layers,
    description: 'Pipelines de vendas',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'ativo', label: 'Ativo', format: 'boolean' },
      { key: 'created_at', label: 'Criado', format: 'date' },
    ],
  },
  {
    id: 'segments',
    label: 'Segmentos',
    icon: Globe,
    description: 'Segmentos de mercado',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'criterios', label: 'Critérios' },
    ],
  },
  {
    id: 'regions',
    label: 'Regiões',
    icon: MapPin,
    description: 'Regiões de atuação',
    searchColumn: 'nome',
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'estados', label: 'Estados' },
      { key: 'responsavel_nome', label: 'Responsável' },
    ],
  },
  {
    id: 'payment_conditions',
    label: 'Pagamentos',
    icon: CreditCard,
    description: 'Condições de pagamento',
    searchColumn: 'descricao',
    columns: [
      { key: 'descricao', label: 'Descrição' },
      { key: 'parcelas', label: 'Parcelas', format: 'number' },
      { key: 'prazo_dias', label: 'Prazo (dias)', format: 'number' },
      { key: 'ativo', label: 'Ativo', format: 'boolean' },
    ],
  },
];

// ─── Value formatters ────────────────────────────────────────
function formatCellValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) return '—';
  if (format === 'date' && typeof value === 'string') {
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
    } catch { return String(value); }
  }
  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  if (format === 'boolean') return value ? '✅' : '❌';
  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ─── CSV Export ──────────────────────────────────────────────
function exportToCSV(data: Record<string, unknown>[], columns: TabConfig['columns'], filename: string) {
  if (!data.length) return;
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      const str = val === null || val === undefined ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── RFM Segment badge ───────────────────────────────────────
function RFMBadge({ segment }: { segment: string | null }) {
  if (!segment) return null;
  const colors: Record<string, string> = {
    Champions: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'Loyal Customers': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'Potential Loyalist': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
    'At Risk': 'bg-red-500/15 text-red-700 dark:text-red-400',
    Hibernating: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
    Lost: 'bg-gray-500/15 text-gray-500',
  };
  return (
    <Badge variant="outline" className={colors[segment] || 'bg-muted text-muted-foreground'}>
      {segment}
    </Badge>
  );
}

// ─── Generic Data Table ──────────────────────────────────────
function DataExplorerTable({ tabConfig, onRowClick, onCreateClick }: { tabConfig: TabConfig; onRowClick?: (row: Record<string, unknown>) => void; onCreateClick?: () => void }) {
  const browser = useExternalTableBrowser(tabConfig.id as ExternalTableName);
  const [searchInput, setSearchInput] = useState('');

  const totalPages = Math.max(1, Math.ceil(browser.totalRecords / browser.pageSize));

  const handleSearch = useCallback(() => {
    if (!searchInput.trim() || !tabConfig.searchColumn) {
      browser.clearFilters();
      return;
    }
    browser.clearFilters();
    browser.addFilter({
      column: tabConfig.searchColumn,
      operator: 'ilike',
      value: `%${searchInput.trim()}%`,
    });
  }, [searchInput, tabConfig.searchColumn, browser]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    browser.clearFilters();
  }, [browser]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ${tabConfig.searchColumn || 'campo'}...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-8 h-9"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">
          <Search className="h-3.5 w-3.5 mr-1" /> Buscar
        </Button>

        <Select
          value={String(browser.pageSize)}
          onValueChange={(v) => browser.setPageSize(Number(v))}
        >
          <SelectTrigger className="w-[80px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => browser.refetch()} className="h-9">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(browser.data as Record<string, unknown>[], tabConfig.columns, tabConfig.id)}
          disabled={browser.data.length === 0}
          className="h-9"
        >
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>

        {onCreateClick && (
          <Button size="sm" onClick={onCreateClick} className="h-9">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo
          </Button>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          {browser.totalRecords > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {browser.totalRecords.toLocaleString('pt-BR')} reg.
            </Badge>
          )}
          {browser.duration > 0 && (
            <Badge variant="outline" className="text-[10px]">{browser.duration}ms</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] text-[10px]">#</TableHead>
                {tabConfig.columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                    onClick={() => {
                      const isAsc = browser.order?.column === col.key && browser.order?.ascending;
                      browser.setSort(col.key, !isAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {browser.order?.column === col.key && (
                        <ArrowUpDown className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {browser.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    {tabConfig.columns.map((col) => (
                      <TableCell key={col.key}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : browser.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tabConfig.columns.length + 1} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                browser.data.map((row: any, idx: number) => (
                  <TableRow key={row.id || idx} className={`hover:bg-muted/30 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
                    <TableCell className="text-muted-foreground text-[10px]">
                      {browser.page * browser.pageSize + idx + 1}
                    </TableCell>
                    {tabConfig.columns.map((col) => (
                      <TableCell key={col.key} className="max-w-[180px] truncate text-xs">
                        {col.key === 'segment_code' ? (
                          <RFMBadge segment={row[col.key]} />
                        ) : (
                          <span title={String(row[col.key] ?? '')}>
                            {formatCellValue(row[col.key], col.format)}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Pág. {browser.page + 1} de {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={browser.prevPage} disabled={browser.page === 0} className="h-7 px-2">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={browser.nextPage} disabled={browser.page >= totalPages - 1} className="h-7 px-2">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {browser.error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          Erro: {browser.error}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CRM360ExplorerView() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Record<string, unknown> | null>(null);
  const [editingContact, setEditingContact] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRowClick = useCallback((tabId: string, row: Record<string, unknown>) => {
    if (tabId === 'companies') {
      setEditingCompany(row);
      setCompanyDialogOpen(true);
    } else if (tabId === 'contacts') {
      setEditingContact(row);
      setContactDialogOpen(true);
    }
  }, []);

  const handleCreateClick = useCallback((tabId: string) => {
    if (tabId === 'companies') {
      setEditingCompany(null);
      setCompanyDialogOpen(true);
    } else if (tabId === 'contacts') {
      setEditingContact(null);
      setContactDialogOpen(true);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (!isExternalConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">CRM Externo Não Configurado</h3>
            <p className="text-muted-foreground text-sm">
              Configure as variáveis de ambiente para acessar os dados do CRM 360°.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            CRM 360° Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso completo a todas as tabelas do banco de dados CRM externo
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {TABS.length} tabelas
        </Badge>
      </div>

      {/* Stats */}
      <CRM360StatsCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-auto h-auto p-1 gap-0.5 flex-nowrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 whitespace-nowrap"
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                  {tab.editable && <Pencil className="h-2.5 w-2.5 text-primary/60" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        <div className="flex-1 min-h-0 mt-3">
          {TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
              <Card className="h-full">
                <CardHeader className="py-2.5 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {(() => { const Icon = tab.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                        {tab.label}
                        {tab.editable && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            <Pencil className="h-2.5 w-2.5 mr-0.5" /> Editável
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">{tab.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <DataExplorerTable
                    key={refreshKey}
                    tabConfig={tab}
                    onRowClick={tab.editable ? (row) => handleRowClick(tab.id, row) : undefined}
                    onCreateClick={tab.editable ? () => handleCreateClick(tab.id) : undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* CRUD Modals */}
      <CompanyFormDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        company={editingCompany}
        onSuccess={handleSuccess}
      />
      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={editingContact}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
