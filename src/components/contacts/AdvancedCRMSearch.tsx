/**
 * AdvancedCRMSearch
 * 
 * Full-featured search panel that queries the external CRM database.
 * Features: text search, multi-filter sidebar, paginated results with
 * company, vendedor, RFM, and purchase data inline.
 * 
 * Can be used standalone or embedded in a Dialog.
 */
import { useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdvancedContactSearch } from '@/hooks/useAdvancedContactSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  Building,
  Phone,
  Mail,
  MessageSquare,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  BarChart3,
  Sparkles,
  ExternalLink,
  Loader2,
  Filter,
  ArrowUpDown,
  Download,
  CheckCircle2,
} from 'lucide-react';
import type { SearchContactResult } from '@/types/contactSearch';

interface AdvancedCRMSearchProps {
  onSelectContact?: (contact: SearchContactResult) => void;
  className?: string;
}

// ========================
// Result Card
// ========================

function ContactResultCard({
  contact,
  onSelect,
}: {
  contact: SearchContactResult;
  onSelect?: (c: SearchContactResult) => void;
}) {
  const formatCurrency = (v: number | null) =>
    v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : null;

  const sentimentEmoji: Record<string, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
    critical: '🔴',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group border border-border/30 rounded-xl p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer',
        onSelect && 'active:scale-[0.99]'
      )}
      onClick={() => onSelect?.(contact)}
    >
      {/* Row 1: Name + Score + Sentiment + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              {contact.full_name || contact.nome_tratamento || 'Sem nome'}
            </p>
            {contact.sentiment && sentimentEmoji[contact.sentiment] && (
              <span className="text-xs">{sentimentEmoji[contact.sentiment]}</span>
            )}
          </div>
          {contact.cargo && (
            <p className="text-xs text-muted-foreground truncate">{contact.cargo}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {contact.cliente_ativado !== null && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] py-0',
                contact.cliente_ativado
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              )}
            >
              {contact.cliente_ativado ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
          {contact.relationship_score > 0 && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] py-0',
                contact.relationship_score >= 70
                  ? 'bg-success/10 text-success border-success/30'
                  : contact.relationship_score >= 40
                  ? 'bg-warning/10 text-warning border-warning/30'
                  : 'bg-muted/20 text-muted-foreground border-border/30'
              )}
            >
              {contact.relationship_score}
            </Badge>
          )}
          {contact.is_whatsapp && (
            <Badge variant="outline" className="text-[9px] py-0 bg-success/10 text-success border-success/30">
              💬 WhatsApp
            </Badge>
          )}
        </div>
      </div>

      {/* Row 2: Company */}
      {contact.company_name && (
        <div className="flex items-center gap-2 mb-1.5">
          {contact.company_logo ? (
            <img
              src={contact.company_logo}
              alt=""
              className="w-5 h-5 rounded object-contain bg-white border border-border/20"
            />
          ) : (
            <Building className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs truncate">{contact.company_name}</span>
          {contact.company_estado && (
            <Badge variant="outline" className="text-[9px] py-0 px-1 ml-auto shrink-0">
              {contact.company_estado}
            </Badge>
          )}
        </div>
      )}

      {/* Row 3: Metrics row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        {contact.vendedor_nome && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {contact.vendedor_nome.split(' ').slice(0, 2).join(' ')}
          </span>
        )}
        {contact.total_pedidos != null && contact.total_pedidos > 0 && (
          <span className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            {contact.total_pedidos} ped.
          </span>
        )}
        {contact.valor_total_compras != null && contact.valor_total_compras > 0 && (
          <span className="flex items-center gap-1 text-success">
            {formatCurrency(contact.valor_total_compras)}
          </span>
        )}
        {contact.rfm_segment && (() => {
          const rfmColors: Record<string, string> = {
            Champions: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
            'At Risk': 'bg-red-500/15 text-red-600 border-red-500/30',
            Hibernating: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
            'Need Attention': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
            Promising: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
          };
          return (
            <Badge variant="outline" className={cn('text-[9px] py-0 px-1', rfmColors[contact.rfm_segment] || '')}>
              {contact.rfm_segment}
            </Badge>
          );
        })()}
      </div>

      {/* Row 4: Contact info */}
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
        {contact.phone_primary && (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {contact.phone_primary}
          </span>
        )}
        {contact.email_primary && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{contact.email_primary}</span>
          </span>
        )}
      </div>

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {contact.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px] py-0 px-1.5">
              {tag}
            </Badge>
          ))}
          {contact.tags.length > 4 && (
            <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
              +{contact.tags.length - 4}
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ========================
// Filters Panel
// ========================

function FiltersPanel({
  filters,
  params,
  onFilter,
  onClear,
  activeCount,
}: {
  filters: ReturnType<typeof useAdvancedContactSearch>['filters'];
  params: ReturnType<typeof useAdvancedContactSearch>['params'];
  onFilter: (key: string, value: string | boolean | undefined) => void;
  onClear: () => void;
  activeCount: number;
}) {
  if (!filters) return null;

  return (
    <div className="space-y-4 p-1">
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="w-full text-xs text-destructive hover:text-destructive">
          <X className="w-3 h-3 mr-1" />
          Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
        </Button>
      )}

      {/* Vendedor */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendedor</label>
        <Select
          value={params.vendedor || '_all'}
          onValueChange={(v) => onFilter('vendedor', v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.vendedores.map((v) => (
              <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ramo */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ramo de atividade</label>
        <Select
          value={params.ramo || '_all'}
          onValueChange={(v) => onFilter('ramo', v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.ramos.slice(0, 50).map((r) => (
              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</label>
        <Select
          value={params.estado || '_all'}
          onValueChange={(v) => onFilter('estado', v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.estados.map((e) => (
              <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RFM Segment */}
      {filters.rfm_segments.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Segmento RFM</label>
          <Select
            value={params.rfm_segment || '_all'}
            onValueChange={(v) => onFilter('rfm_segment', v === '_all' ? undefined : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {filters.rfm_segments.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status cliente</label>
        <Select
          value={params.cliente_ativado === true ? 'ativo' : params.cliente_ativado === false ? 'inativo' : '_all'}
          onValueChange={(v) => onFilter('cliente_ativado', v === '_all' ? undefined : v === 'ativo')}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Já comprou */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Já comprou?</label>
        <Select
          value={params.ja_comprou === true ? 'sim' : params.ja_comprou === false ? 'nao' : '_all'}
          onValueChange={(v) => onFilter('ja_comprou', v === '_all' ? undefined : v === 'sim')}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ========================
// Main Component
// ========================

function AdvancedCRMSearchInner({ onSelectContact, className }: AdvancedCRMSearchProps) {
  const {
    results,
    total,
    totalPages,
    currentPage,
    filters,
    isLoading,
    isFetching,
    hasActiveFilters,
    activeFilterCount,
    params,
    setSearch,
    setFilter,
    setSortBy,
    setPage,
    clearFilters,
    isConfigured,
  } = useAdvancedContactSearch();

  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => setSearch(value), 400);
      setSearchTimeout(timeout);
    },
    [setSearch, searchTimeout]
  );

  if (!isConfigured) return null;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Buscar no CRM (nome, empresa, CNPJ...)"
            className="pl-9 h-9 text-sm"
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Filter sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4" />
                Filtros avançados
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] mt-4">
              <FiltersPanel
                filters={filters}
                params={params}
                onFilter={setFilter as (key: string, value: string | boolean | undefined) => void}
                onClear={clearFilters}
                activeCount={activeFilterCount}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Sort */}
        <Select
          value={params.sort_by || 'relevance'}
          onValueChange={(v) => setSortBy(v as 'relevance' | 'name' | 'date' | 'score')}
        >
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <ArrowUpDown className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevância</SelectItem>
            <SelectItem value="score">Score</SelectItem>
            <SelectItem value="compras">Compras</SelectItem>
            <SelectItem value="pedidos">Pedidos</SelectItem>
            <SelectItem value="recent">Recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b border-border/20 text-xs text-muted-foreground">
          <span>
            {isLoading ? '...' : `${total.toLocaleString('pt-BR')} contato${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </span>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-5 text-[10px] px-1.5">
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : !hasActiveFilters ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/40" />
              <p className="text-sm font-medium">Busca avançada no CRM</p>
              <p className="text-xs mt-1">
                Pesquise por nome, empresa, CNPJ ou use os filtros
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum resultado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros ou termo de busca</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {results.map((contact) => (
                <ContactResultCard
                  key={contact.contact_id}
                  contact={contact}
                  onSelect={onSelectContact}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/30 bg-muted/5">
          <span className="text-xs text-muted-foreground">
            Pág. {currentPage + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isFetching}
            >
              <ChevronLeft className="w-3 h-3 mr-0.5" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isFetching}
            >
              Próxima
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const AdvancedCRMSearch = memo(AdvancedCRMSearchInner);
