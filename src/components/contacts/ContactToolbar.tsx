import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tag, Filter, SortAsc, X, CalendarDays, Building, Briefcase,
  GitCompareArrows, Merge, LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactViewSwitcher, type ContactViewMode } from './ContactViewSwitcher';
import { FilterPresets, type FilterPreset } from './FilterPresets';
import { ContactSearchWithSuggestions } from './ContactSearchWithSuggestions';

const DATE_FILTERS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'quarter', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Último ano' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'created_desc', label: 'Mais recentes' },
  { value: 'created_asc', label: 'Mais antigos' },
  { value: 'updated_desc', label: 'Atualizado recentemente' },
];

interface ContactToolbarProps {
  searchInput: string;
  onSearchChange: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
  activeFiltersCount: number;
  clearFilters: () => void;
  // Filters
  activeTab: string;
  filterCompany: string;
  setFilterCompany: (val: string) => void;
  filterJobTitle: string;
  setFilterJobTitle: (val: string) => void;
  filterTag: string;
  setFilterTag: (val: string) => void;
  filterDateRange: string;
  setFilterDateRange: (val: string) => void;
  uniqueCompanies: string[];
  uniqueJobTitles: string[];
  uniqueTags: string[];
  // Presets
  onApplyPreset: (preset: FilterPreset) => void;
  // Grouping
  groupByCompany: boolean;
  setGroupByCompany: (val: boolean) => void;
  // Selection
  selectedIds: string[];
  onBulkTag: () => void;
  onCompare: () => void;
  onMerge: () => void;
  // View
  viewMode: ContactViewMode;
  setViewMode: (mode: ContactViewMode) => void;
  gridColumns: number;
  setGridColumns: (cols: number) => void;
}

export function ContactToolbar({
  searchInput, onSearchChange, sortBy, setSortBy,
  showFilters, setShowFilters, activeFiltersCount, clearFilters,
  activeTab, filterCompany, setFilterCompany, filterJobTitle, setFilterJobTitle,
  filterTag, setFilterTag, filterDateRange, setFilterDateRange,
  uniqueCompanies, uniqueJobTitles, uniqueTags,
  onApplyPreset, groupByCompany, setGroupByCompany,
  selectedIds, onBulkTag, onCompare, onMerge,
  viewMode, setViewMode, gridColumns, setGridColumns,
}: ContactToolbarProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email ou empresa..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SortAsc className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-whatsapp hover:bg-whatsapp-dark" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-background/20 text-xs">{activeFiltersCount}</Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} size="sm">
            <X className="w-4 h-4 mr-1" />Limpar
          </Button>
        )}

        <FilterPresets
          currentFilters={{ type: activeTab, company: filterCompany, jobTitle: filterJobTitle, tag: filterTag, dateRange: filterDateRange }}
          onApplyPreset={onApplyPreset}
        />

        <Button
          variant={groupByCompany ? "default" : "outline"}
          size="sm"
          onClick={() => setGroupByCompany(!groupByCompany)}
          className="gap-1.5"
        >
          <LayoutList className="w-4 h-4" />
          Agrupar
        </Button>

        {selectedIds.length >= 1 && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onBulkTag}>
              <Tag className="w-4 h-4" />
              Tags ({selectedIds.length})
            </Button>
            {selectedIds.length >= 2 && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onCompare}>
                  <GitCompareArrows className="w-4 h-4" />
                  Comparar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary" onClick={onMerge}>
                  <Merge className="w-4 h-4" />
                  Mesclar
                </Button>
              </>
            )}
          </>
        )}

        <div className="ml-auto">
          <ContactViewSwitcher
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            gridColumns={gridColumns}
            onGridColumnsChange={setGridColumns}
          />
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/30 rounded-xl p-4 border border-border/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Building className="w-3.5 h-3.5" />Empresa
                </Label>
                <Select value={filterCompany || '__all__'} onValueChange={(v) => setFilterCompany(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as empresas</SelectItem>
                    {uniqueCompanies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />Cargo
                </Label>
                <Select value={filterJobTitle || '__all__'} onValueChange={(v) => setFilterJobTitle(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os cargos</SelectItem>
                    {uniqueJobTitles.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" />Etiqueta
                </Label>
                <Select value={filterTag || '__all__'} onValueChange={(v) => setFilterTag(v === '__all__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as etiquetas</SelectItem>
                    {uniqueTags.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" />Período
                </Label>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
