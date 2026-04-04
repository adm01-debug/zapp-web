/**
 * CRM360ExplorerView — Full CRM 360° data explorer
 * Browse ALL tables from the external CRM database with filters, pagination, and search
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search, Building2, Users, ShoppingCart, MessageSquare, BarChart3,
  Share2, MapPin, Phone, Mail, Truck, Package, Trophy, RefreshCw,
  ChevronLeft, ChevronRight, Filter, X, Download, ArrowUpDown,
  DollarSign, TrendingUp, Clock, User, Activity,
} from 'lucide-react';
import { useExternalSelect, useExternalTableBrowser } from '@/hooks/useExternalDB';
import { useExternalContact360 } from '@/hooks/useExternalContact360';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  ExtCustomer, ExtCompanyRFMScore, ExtSalesperson, ExtSale,
  ExtCompanySocialMedia, ExtCompanyAddress, ExtContactPhone,
  ExtContactEmail, ExtContactSocialMedia, ExtContactAddress,
  ExtSupplier, ExtCarrier, ExtAchievement, ExternalTableName,
} from '@/types/externalDB';
import { EXTERNAL_TABLE_LABELS } from '@/types/externalDB';

// ─── Tab configuration ───────────────────────────────────────
interface TabConfig {
  id: ExternalTableName;
  label: string;
  icon: React.ElementType;
  description: string;
  columns: { key: string; label: string; format?: 'date' | 'currency' | 'boolean' | 'number' }[];
}

const TABS: TabConfig[] = [
  {
    id: 'customers',
    label: 'Clientes',
    icon: ShoppingCart,
    description: '52k+ registros — dados financeiros, vendedores, ativação',
    columns: [
      { key: 'vendedor_nome', label: 'Vendedor' },
      { key: 'cliente_ativado', label: 'Ativo', format: 'boolean' },
      { key: 'ja_comprou', label: 'Já Comprou', format: 'boolean' },
      { key: 'total_pedidos', label: 'Pedidos', format: 'number' },
      { key: 'valor_total_compras', label: 'Total Compras', format: 'currency' },
      { key: 'ticket_medio', label: 'Ticket Médio', format: 'currency' },
      { key: 'poder_compra', label: 'Poder Compra' },
      { key: 'grupo_clientes', label: 'Grupo' },
      { key: 'data_ultima_compra', label: 'Última Compra', format: 'date' },
    ],
  },
  {
    id: 'company_rfm_scores',
    label: 'Scores RFM',
    icon: BarChart3,
    description: 'Recência, Frequência e Monetário por empresa',
    columns: [
      { key: 'segment_code', label: 'Segmento' },
      { key: 'recency_score', label: 'R', format: 'number' },
      { key: 'frequency_score', label: 'F', format: 'number' },
      { key: 'monetary_score', label: 'M', format: 'number' },
      { key: 'combined_score', label: 'Score', format: 'number' },
      { key: 'interaction_count', label: 'Interações', format: 'number' },
      { key: 'total_value', label: 'Valor Total', format: 'currency' },
      { key: 'overall_trend', label: 'Tendência' },
      { key: 'calculated_at', label: 'Calculado em', format: 'date' },
    ],
  },
  {
    id: 'salespeople',
    label: 'Vendedores',
    icon: User,
    description: 'Equipe de vendas do CRM',
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Cargo' },
      { key: 'commission_rate', label: 'Comissão', format: 'number' },
      { key: 'is_active', label: 'Ativo', format: 'boolean' },
      { key: 'created_at', label: 'Criado em', format: 'date' },
    ],
  },
  {
    id: 'sales',
    label: 'Vendas',
    icon: DollarSign,
    description: 'Registro de vendas realizadas',
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
    id: 'contact_phones',
    label: 'Telefones',
    icon: Phone,
    description: 'Todos os telefones de contatos',
    columns: [
      { key: 'numero', label: 'Número' },
      { key: 'numero_e164', label: 'E.164' },
      { key: 'phone_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'is_whatsapp', label: 'WhatsApp', format: 'boolean' },
      { key: 'is_verified', label: 'Verificado', format: 'boolean' },
    ],
  },
  {
    id: 'contact_emails',
    label: 'E-mails',
    icon: Mail,
    description: 'Todos os e-mails de contatos',
    columns: [
      { key: 'email', label: 'E-mail' },
      { key: 'email_type', label: 'Tipo' },
      { key: 'is_primary', label: 'Principal', format: 'boolean' },
      { key: 'contexto', label: 'Contexto' },
      { key: 'fonte', label: 'Fonte' },
    ],
  },
  {
    id: 'company_social_media',
    label: 'Social (Empresas)',
    icon: Share2,
    description: '99k+ registros de redes sociais',
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
    label: 'Social (Contatos)',
    icon: Share2,
    description: 'Redes sociais dos contatos',
    columns: [
      { key: 'plataforma', label: 'Plataforma' },
      { key: 'handle', label: 'Handle' },
      { key: 'url', label: 'URL' },
      { key: 'confiabilidade', label: 'Confiabilidade', format: 'number' },
      { key: 'fonte', label: 'Fonte' },
    ],
  },
  {
    id: 'company_addresses',
    label: 'Endereços (Empresas)',
    icon: MapPin,
    description: 'Endereços físicos das empresas',
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
    label: 'Endereços (Contatos)',
    icon: MapPin,
    description: 'Endereços dos contatos',
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
    description: 'Base de fornecedores homologados',
    columns: [
      { key: 'categoria', label: 'Categoria' },
      { key: 'tipo_fornecedor', label: 'Tipo' },
      { key: 'ramo_atividade', label: 'Ramo' },
      { key: 'perfil_preco', label: 'Preço' },
      { key: 'perfil_qualidade', label: 'Qualidade' },
      { key: 'homologado', label: 'Homologado', format: 'boolean' },
      { key: 'score_geral', label: 'Score', format: 'number' },
    ],
  },
  {
    id: 'carriers',
    label: 'Transportadoras',
    icon: Truck,
    description: 'Transportadoras cadastradas',
    columns: [
      { key: 'tipo_transporte', label: 'Tipo' },
      { key: 'tipo_frete', label: 'Frete' },
      { key: 'transportadora_validada', label: 'Validada', format: 'boolean' },
      { key: 'homologado', label: 'Homologado', format: 'boolean' },
      { key: 'score_geral', label: 'Score', format: 'number' },
    ],
  },
  {
    id: 'achievements',
    label: 'Conquistas',
    icon: Trophy,
    description: 'Conquistas dos vendedores',
    columns: [
      { key: 'achievement_type', label: 'Tipo' },
      { key: 'achievement_date', label: 'Data', format: 'date' },
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
function DataExplorerTable({ tabConfig }: { tabConfig: TabConfig }) {
  const browser = useExternalTableBrowser(tabConfig.id);

  const totalPages = Math.max(1, Math.ceil(browser.totalRecords / browser.pageSize));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar em ${tabConfig.label}...`}
            value={browser.searchTerm}
            onChange={(e) => browser.setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={String(browser.pageSize)}
          onValueChange={(v) => browser.setPageSize(Number(v))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>

        {browser.filters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={browser.clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpar filtros
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => browser.refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          {browser.totalRecords > 0 && (
            <Badge variant="secondary">{browser.totalRecords.toLocaleString('pt-BR')} registros</Badge>
          )}
          {browser.duration > 0 && (
            <Badge variant="outline" className="text-xs">{browser.duration}ms</Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                {tabConfig.columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      const isCurrentAsc = browser.order?.column === col.key && browser.order?.ascending;
                      browser.setSort(col.key, !isCurrentAsc);
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
                      <TableCell key={col.key}><Skeleton className="h-4 w-20" /></TableCell>
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
                  <TableRow key={row.id || idx} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-xs">
                      {browser.page * browser.pageSize + idx + 1}
                    </TableCell>
                    {tabConfig.columns.map((col) => (
                      <TableCell key={col.key} className="max-w-[200px] truncate">
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
        <span className="text-sm text-muted-foreground">
          Página {browser.page + 1} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={browser.prevPage}
            disabled={browser.page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={browser.nextPage}
            disabled={browser.page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
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

  if (!isExternalConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">CRM Externo Não Configurado</h3>
            <p className="text-muted-foreground text-sm">
              Configure as variáveis VITE_EXTERNAL_SUPABASE_URL e VITE_EXTERNAL_SUPABASE_ANON_KEY para acessar os dados do CRM 360°.
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {TABS.length} tabelas disponíveis
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="w-full" orientation="horizontal">
          <TabsList className="inline-flex w-auto h-auto p-1 gap-1 flex-nowrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        <div className="flex-1 min-h-0 mt-4">
          {TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
              <Card className="h-full">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {(() => { const Icon = tab.icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                        {tab.label}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">{tab.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <DataExplorerTable tabConfig={tab} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
