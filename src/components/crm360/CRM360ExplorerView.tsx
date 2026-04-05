/**
 * CRM360ExplorerView — Full CRM 360° data explorer
 * Browse ALL tables from the external CRM database with filters, pagination, search, export, and CRUD
 */
import { useState, useCallback } from 'react';
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
  Search, Building2, RefreshCw, ChevronLeft, ChevronRight, X,
  Download, ArrowUpDown, Plus, Pencil,
} from 'lucide-react';
import { useExternalTableBrowser } from '@/hooks/useExternalDB';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { CRM360StatsCards } from './CRM360StatsCards';
import { CompanyFormDialog } from './CompanyFormDialog';
import { ContactFormDialog } from './ContactFormDialog';
import { TABS, formatCellValue, exportToCSV, RFM_SEGMENT_COLORS } from './crm360TabsConfig';
import type { TabConfig } from './crm360TabsConfig';
import type { ExternalTableName } from '@/types/externalDB';

// ─── RFM Segment badge ───────────────────────────────────────
function RFMBadge({ segment }: { segment: string | null }) {
  if (!segment) return null;
  return (
    <Badge variant="outline" className={RFM_SEGMENT_COLORS[segment] || 'bg-muted text-muted-foreground'}>
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
                browser.data.map((row: Record<string, unknown>, idx: number) => (
                  <TableRow key={String(row.id ?? idx)} className={`hover:bg-muted/30 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
                    <TableCell className="text-muted-foreground text-[10px]">
                      {browser.page * browser.pageSize + idx + 1}
                    </TableCell>
                    {tabConfig.columns.map((col) => (
                      <TableCell key={col.key} className="max-w-[180px] truncate text-xs">
                        {col.key === 'segment_code' ? (
                          <RFMBadge segment={row[col.key] as string} />
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
