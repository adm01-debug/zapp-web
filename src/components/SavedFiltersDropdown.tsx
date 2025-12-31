/**
 * Componente de Dropdown para Filtros Salvos
 * 
 * @module components/SavedFiltersDropdown
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Star, Trash2, Plus, Loader2 } from 'lucide-react';
import { useSavedFilters } from '@/hooks/useSavedFilters';

interface SavedFiltersDropdownProps {
  entityType: string;
  currentFilters: Record<string, unknown>;
  onApplyFilter: (filters: Record<string, unknown>) => void;
}

export function SavedFiltersDropdown({
  entityType,
  currentFilters,
  onApplyFilter,
}: SavedFiltersDropdownProps) {
  const { filters, isLoading, saveFilter, deleteFilter, setDefault, isSaving } =
    useSavedFilters(entityType);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = () => {
    if (!filterName.trim()) return;
    
    saveFilter({
      name: filterName.trim(),
      filters: currentFilters,
      is_default: isDefault,
    });
    
    setShowSaveDialog(false);
    setFilterName('');
    setIsDefault(false);
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros Salvos</span>
            {filters.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                {filters.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {hasActiveFilters && (
            <>
              <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Salvar Filtro Atual
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filters.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum filtro salvo
            </div>
          ) : (
            filters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between gap-2"
                onSelect={(e) => e.preventDefault()}
              >
                <button
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => onApplyFilter(filter.filters)}
                >
                  {filter.is_default && (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  )}
                  <span className="truncate">{filter.name}</span>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefault(filter.id);
                    }}
                    title="Definir como padrão"
                  >
                    <Star className={`h-3 w-3 ${filter.is_default ? 'fill-yellow-400' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFilter(filter.id);
                    }}
                    title="Excluir filtro"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para este filtro para usá-lo novamente depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nome do Filtro</Label>
              <Input
                id="filter-name"
                placeholder="Ex: Clientes VIP, Pedidos Pendentes..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="is-default" className="text-sm font-normal">
                Aplicar automaticamente ao abrir a página
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!filterName.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Filtro'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SavedFiltersDropdown;
