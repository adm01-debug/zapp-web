import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, RefreshCw, MessageSquare, Tag } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { DataImporter } from '@/components/DataImporter';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { contatoSchema, zappImportTemplates } from '@/lib/zappSchemas';
import { exportToExcel } from '@/lib/excelImporter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContatosToolbarProps {
  onSearch: (term: string) => void;
  onRefresh: () => void;
  onNewClick: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkEnviarMensagem: () => void;
  onBulkAdicionarTag: () => void;
  currentFilters: Record<string, unknown>;
  data?: unknown[];
}

export const ContatosToolbar = memo(function ContatosToolbar({ onSearch, onRefresh, onNewClick, selectedCount, onClearSelection, onBulkEnviarMensagem, onBulkAdicionarTag, currentFilters, data = [] }: ContatosToolbarProps) {
  const handleImport = async (contatos: unknown[]) => {
    const { error } = await supabase.from('contatos').insert(contatos);
    if (error) throw error;
    toast.success(`${contatos.length} contatos importados!`);
    onRefresh();
  };

  const handleExport = () => {
    if (data.length === 0) { toast.warning('Nenhum dado'); return; }
    exportToExcel(data as Record<string, unknown>[], [
      { key: 'nome' as const, label: 'Nome' },
      { key: 'telefone' as const, label: 'Telefone' },
      { key: 'email' as const, label: 'E-mail' },
      { key: 'ultimo_contato' as const, label: 'Último Contato' },
    ], 'contatos', 'Contatos');
    toast.success('Exportado!');
  };

  const bulkActions = [
    { key: 'mensagem', label: 'Enviar Mensagem', icon: <MessageSquare className="h-4 w-4" />, onClick: onBulkEnviarMensagem },
    { key: 'tag', label: 'Adicionar Tag', icon: <Tag className="h-4 w-4" />, onClick: onBulkAdicionarTag },
  ];

  return (
    <div className="space-y-3">
      {selectedCount > 0 && <BulkActionsBar selectedCount={selectedCount} onClearSelection={onClearSelection} actions={bulkActions} />}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput onSearch={onSearch} placeholder="Buscar contato..." className="w-64" />
          <SavedFiltersDropdown entityType="contatos" currentFilters={currentFilters} onApplyFilter={() => {}} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4" /></Button>
          <DataImporter schema={contatoSchema} columns={zappImportTemplates.contatos} onImport={handleImport} templateName="contatos" title="Importar Contatos" trigger={<Button variant="outline" size="sm"><Upload className="h-4 w-4" /></Button>} onSuccess={onRefresh} />
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /></Button>
          <Button size="sm" onClick={onNewClick}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
});
export default ContatosToolbar;
