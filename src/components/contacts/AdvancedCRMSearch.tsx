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

// ContactResultCard extracted to ./CRMContactCard.tsx
import { CRMContactCard } from './CRMContactCard';

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
          onValueChange={(v) => setSortBy(v as 'relevance' | 'name' | 'score' | 'compras' | 'pedidos' | 'recent')}
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
                <CRMContactCard
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
