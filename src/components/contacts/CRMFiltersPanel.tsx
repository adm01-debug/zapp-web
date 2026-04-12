import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { useAdvancedContactSearch } from '@/hooks/useAdvancedContactSearch';

interface FiltersPanelProps {
  filters: ReturnType<typeof useAdvancedContactSearch>['filters'];
  params: ReturnType<typeof useAdvancedContactSearch>['params'];
  onFilter: (key: string, value: string | boolean | undefined) => void;
  onClear: () => void;
  activeCount: number;
}

export function CRMFiltersPanel({ filters, params, onFilter, onClear, activeCount }: FiltersPanelProps) {
  if (!filters) return null;

  return (
    <div className="space-y-4 p-1">
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="w-full text-xs text-destructive hover:text-destructive">
          <X className="w-3 h-3 mr-1" />
          Limpar {activeCount} filtro{activeCount > 1 ? 's' : ''}
        </Button>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendedor</label>
        <Select value={params.vendedor || '_all'} onValueChange={(v) => onFilter('vendedor', v === '_all' ? undefined : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.vendedores.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ramo de atividade</label>
        <Select value={params.ramo || '_all'} onValueChange={(v) => onFilter('ramo', v === '_all' ? undefined : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.ramos.slice(0, 50).map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</label>
        <Select value={params.estado || '_all'} onValueChange={(v) => onFilter('estado', v === '_all' ? undefined : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {filters.estados.map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filters.rfm_segments.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Segmento RFM</label>
          <Select value={params.rfm_segment || '_all'} onValueChange={(v) => onFilter('rfm_segment', v === '_all' ? undefined : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {filters.rfm_segments.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status cliente</label>
        <Select value={params.cliente_ativado === true ? 'ativo' : params.cliente_ativado === false ? 'inativo' : '_all'} onValueChange={(v) => onFilter('cliente_ativado', v === '_all' ? undefined : v === 'ativo')}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Já comprou?</label>
        <Select value={params.ja_comprou === true ? 'sim' : params.ja_comprou === false ? 'nao' : '_all'} onValueChange={(v) => onFilter('ja_comprou', v === '_all' ? undefined : v === 'sim')}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
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
