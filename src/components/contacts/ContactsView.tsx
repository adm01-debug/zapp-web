import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExternalContact360Batch } from '@/hooks/useExternalContact360Batch';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollToTopButton } from '@/components/ui/scroll-to-top';
import { ContactForm } from '@/components/contacts/ContactForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search, Plus, Download, Upload, Phone, Tag, Filter, RefreshCw,
  Building, Briefcase, Users, UserCheck, Truck, Wrench, Star,
  Handshake, MoreHorizontal, X, CalendarDays, SortAsc, CheckCircle2,
  Copy, ChevronLeft, ChevronRight, Sparkles, Trash2, Loader2,
  FileSpreadsheet, Merge, GitCompareArrows, LayoutList,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTACT_TYPES } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';
import { AdvancedCRMSearch } from '@/components/contacts/AdvancedCRMSearch';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { BulkActionsBar } from '@/components/contacts/BulkActionsBar';
import { supabase } from '@/integrations/supabase/client';
import { useContactsCRUD } from './useContactsCRUD';
import { ContactsTable, CONTACT_TYPE_ICONS } from './ContactsTable';
import { ContactCard } from './ContactCard';
import { ContactListItem } from './ContactListItem';
import { ContactStatsCards } from './ContactStatsCards';
import { ContactQuickPeek } from './ContactQuickPeek';
import { ContactViewSwitcher, type ContactViewMode } from './ContactViewSwitcher';
import { ContactImportDialog } from './ContactImportDialog';
import { ContactMergeDialog } from './ContactMergeDialog';
import { ContactGroupedList } from './ContactGroupedList';
import { ContactCompareDialog } from './ContactCompareDialog';
import { FilterPresets, type FilterPreset } from './FilterPresets';

// Date filter options
const DATE_FILTERS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'quarter', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Último ano' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'created_desc', label: 'Mais recentes' },
  { value: 'created_asc', label: 'Mais antigos' },
  { value: 'updated_desc', label: 'Atualizado recentemente' },
];

const GRID_COLUMNS_CLASS: Record<number, string> = {
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
};

          <FilterPresets
            currentFilters={{ type: activeTab, company: filterCompany, jobTitle: filterJobTitle, tag: filterTag, dateRange: filterDateRange }}
            onApplyPreset={handleApplyPreset}
          />

          <Button
            variant={groupByCompany ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setGroupByCompany(g => !g)}
          >
            <LayoutList className="w-4 h-4" />
            Agrupar
          </Button>

          {selectedIds.length >= 2 && (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setIsCompareOpen(true)}>
                <GitCompareArrows className="w-4 h-4" />
                Comparar ({selectedIds.length})
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-primary/30 text-primary" onClick={() => setIsMergeOpen(true)}>
                <Merge className="w-4 h-4" />
                Mesclar ({selectedIds.length})
              </Button>
            </>
          )}

export function ContactsView() {
  const crud = useContactsCRUD();
  const {
    contacts: filteredContacts, totalCount, loading, hasMore,
    contactCountByType, uniqueCompanies, uniqueJobTitles, uniqueTags,
    searchInput, debouncedSearch: search, handleSearchChange, clearSearch,
    activeTab, setActiveTab, filterCompany, setFilterCompany,
    filterJobTitle, setFilterJobTitle, filterTag, setFilterTag,
    filterDateRange, setFilterDateRange, sortBy, setSortBy,
    activeFiltersCount, clearFilters, page, setPage, pageSize,
    loadMore, loadPrevious, refetch,
    profile, feedback, scrollContainerRef,
    isSubmitting, deleteTarget, setDeleteTarget,
    showSuccess, setShowSuccess,
    isAddDialogOpen, setIsAddDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    editingContact, showFilters, setShowFilters,
    isCRMSearchOpen, setIsCRMSearchOpen,
    selectedIds, setSelectedIds,
    newContact, openContactChat,
    handleAddContact, handleEditContact, handleDeleteContact,
    openEditDialog, handleCancelForm,
    handleNewContactChange, handleEditContactChange,
  } = crud;

  const [viewMode, setViewMode] = useState<ContactViewMode>('grid');
  const [gridColumns, setGridColumns] = useState(4);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [groupByCompany, setGroupByCompany] = useState(false);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    if (preset.filters.type) setActiveTab(preset.filters.type);
    if (preset.filters.company) setFilterCompany(preset.filters.company);
    if (preset.filters.jobTitle) setFilterJobTitle(preset.filters.jobTitle);
    if (preset.filters.tag) setFilterTag(preset.filters.tag);
    if (preset.filters.dateRange) setFilterDateRange(preset.filters.dateRange);
    toast.success(`Filtro "${preset.name}" aplicado`);
  }, [setActiveTab, setFilterCompany, setFilterJobTitle, setFilterTag, setFilterDateRange]);

  // Fetch company logos from external CRM
  const contactPhones = useMemo(() => filteredContacts.map(c => c.phone), [filteredContacts]);
  const { lookup: getCRMData } = useExternalContact360Batch(contactPhones);

  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(i => i !== id)
    );
  }, [setSelectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  }, [selectedIds.length, filteredContacts, setSelectedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N → New contact
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsAddDialogOpen(true);
      }
      // Escape → Clear search / deselect
      if (e.key === 'Escape') {
        if (selectedIds.length > 0) {
          setSelectedIds([]);
        } else if (searchInput) {
          clearSearch();
        }
      }
      // Ctrl+A → Select all (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleSelectAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds.length, searchInput, clearSearch, setIsAddDialogOpen, setSelectedIds, handleSelectAll]);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const esc = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
    const headers = ['Nome','Sobrenome','Apelido','Telefone','Email','Empresa','Cargo','Tipo','Tags','Criado em'];
    const csvRows = filteredContacts.map(c => [
      esc(c.name), esc(c.surname||''), esc(c.nickname||''), esc(c.phone),
      esc(c.email||''), esc(c.company||''), esc(c.job_title||''),
      esc(c.contact_type||'cliente'), esc((c.tags||[]).join('; ')),
      esc(format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `contatos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filteredContacts.length} contatos exportados!`);
  }, [filteredContacts]);

  return (
    <div ref={scrollContainerRef} className="p-6 space-y-5 overflow-y-auto h-full relative bg-background">
      <ScrollToTopButton scrollRef={scrollContainerRef} />
      <AuroraBorealis />
      <FloatingParticles />

      {/* Header */}
      <PageHeader
        title="Contatos"
        subtitle={`Base de clientes e leads (${totalCount} contatos)`}
        breadcrumbs={[
          { label: 'Gestão' },
          { label: 'Contatos' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isExternalConfigured && (
              <Button
                variant="outline"
                onClick={() => setIsCRMSearchOpen(true)}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                CRM 360°
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredContacts.length === 0}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-whatsapp hover:bg-whatsapp-dark text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Contato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Contato</DialogTitle>
                </DialogHeader>
                <ContactForm
                  values={newContact}
                  onChange={handleNewContactChange}
                  onSubmit={handleAddContact}
                  onCancel={handleCancelForm}
                  submitLabel="Adicionar"
                  isSubmitting={isSubmitting}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              values={editingContact}
              onChange={handleEditContactChange}
              onSubmit={handleEditContact}
              onCancel={handleCancelForm}
              submitLabel="Salvar"
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!showSuccess} onOpenChange={() => setShowSuccess(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="w-16 h-16 text-success" />
              </motion.div>
              Contato Adicionado!
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-2">
              <p><strong>{showSuccess?.name}</strong> foi adicionado com sucesso.</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Protocolo</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono font-semibold text-foreground">{showSuccess?.protocol}</code>
                  <Button
                    variant="ghost" size="icon" className="w-6 h-6"
                    onClick={() => {
                      navigator.clipboard.writeText(showSuccess?.protocol || '');
                      toast.success('Protocolo copiado!');
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(null)} className="w-full bg-whatsapp hover:bg-whatsapp-dark">
            Continuar
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteContact(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <ContactStatsCards
        totalCount={totalCount}
        contactCountByType={contactCountByType}
        uniqueCompanies={uniqueCompanies}
        contacts={filteredContacts}
      />

      {/* Type Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-background flex items-center gap-2">
              <Users className="w-4 h-4" />
              Todos
              <Badge variant="secondary" className="ml-1 text-xs">{contactCountByType['all'] || 0}</Badge>
            </TabsTrigger>
            {CONTACT_TYPES.map((type) => (
              <TabsTrigger
                key={type.value}
                value={type.value}
                className="data-[state=active]:bg-background flex items-center gap-2"
              >
                {CONTACT_TYPE_ICONS[type.value]}
                {type.label}
                {contactCountByType[type.value] > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {contactCountByType[type.value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Search, Sort, Filters, View Switcher */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, email ou empresa..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
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

      {/* Results Summary */}
      {!loading && filteredContacts.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleSelectAll}
            >
              <Checkbox
                checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={() => handleSelectAll()}
                className="w-3.5 h-3.5"
              />
              {selectedIds.length > 0
                ? `${selectedIds.length} selecionado${selectedIds.length !== 1 ? 's' : ''}`
                : 'Selecionar todos'}
            </Button>
            <span className="text-muted-foreground/60">|</span>
            <span>
              Exibindo <span className="font-semibold text-foreground">{filteredContacts.length}</span>
              {filteredContacts.length < totalCount && (
                <> de <span className="font-semibold text-foreground">{totalCount}</span></>
              )}
              {' '}contato{totalCount !== 1 ? 's' : ''}
            </span>
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Filter className="w-3 h-3" />
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {search && <span className="text-xs italic">Buscando por "{search}"</span>}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-muted-foreground/50">
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Ctrl+N</kbd>
              <span>Novo</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Ctrl+A</kbd>
              <span>Selecionar</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Esc</kbd>
              <span>Limpar</span>
            </div>
          </div>
        </div>
      )}

      {/* Contact Content */}
      {loading ? (
        <ContactsSkeleton viewMode={viewMode} gridColumns={gridColumns} />
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Phone}
              title="Nenhum contato encontrado"
              description={search ? "Tente ajustar seus filtros ou termo de busca" : "Adicione seu primeiro contato"}
              illustration="contacts"
              actionLabel={!search ? "Novo Contato" : undefined}
              onAction={!search ? () => setIsAddDialogOpen(true) : undefined}
              secondaryActionLabel={search ? "Limpar Busca" : undefined}
              onSecondaryAction={search ? clearSearch : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className={cn("grid gap-4", GRID_COLUMNS_CLASS[gridColumns] || GRID_COLUMNS_CLASS[4])}>
          {filteredContacts.map((contact, index) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isSelected={selectedIds.includes(contact.id)}
              onToggleSelect={handleToggleSelect}
              onOpenChat={openContactChat}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
              index={index}
              companyLogo={getCRMData(contact.phone)?.logo_url}
              companyName={getCRMData(contact.phone)?.company_name}
              searchQuery={search}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredContacts.map((contact, index) => (
            <ContactListItem
              key={contact.id}
              contact={contact}
              isSelected={selectedIds.includes(contact.id)}
              onToggleSelect={handleToggleSelect}
              onOpenChat={openContactChat}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
              index={index}
              companyLogo={getCRMData(contact.phone)?.logo_url}
              companyName={getCRMData(contact.phone)?.company_name}
              searchQuery={search}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ContactsTable
              contacts={filteredContacts}
              selectedIds={selectedIds}
              onSelectIds={setSelectedIds}
              onOpenChat={openContactChat}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
              getCRMData={getCRMData}
              searchQuery={search}
            />
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        const currentPage = page + 1;
        const getPageNumbers = () => {
          const pages: (number | 'ellipsis')[] = [];
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
          } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
          }
          return pages;
        };
        return (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página <span className="font-semibold text-foreground">{currentPage}</span> de{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="w-8 h-8" onClick={loadPrevious} disabled={page === 0 || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="icon"
                    className={cn("w-8 h-8 text-xs", p === currentPage && "bg-primary text-primary-foreground")}
                    onClick={() => setPage(p - 1)}
                    disabled={loading}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="icon" className="w-8 h-8" onClick={loadMore} disabled={!hasMore || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })()}

      {/* CRM 360° Dialog */}
      {isExternalConfigured && (
        <Dialog open={isCRMSearchOpen} onOpenChange={setIsCRMSearchOpen}>
          <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
            <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Busca avançada — CRM 360°
              </DialogTitle>
              <DialogDescription>
                Pesquise contatos no CRM com filtros por vendedor, empresa, ramo, estado e segmento
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <AdvancedCRMSearch
                onSelectContact={async (crmContact) => {
                  if (!crmContact.phone_primary) return;
                  const cleanPhone = crmContact.phone_primary.replace(/\D/g, '');
                  const { data: existing } = await supabase
                    .from('contacts')
                    .select('id')
                    .or(`phone.eq.${crmContact.phone_primary},phone.eq.${cleanPhone}`)
                    .limit(1);

                  if (existing && existing.length > 0) {
                    setIsCRMSearchOpen(false);
                    openContactChat(existing[0].id);
                  } else {
                    const { data: newContact, error } = await supabase
                      .from('contacts')
                      .insert({
                        name: crmContact.full_name || crmContact.nome_tratamento || 'Contato CRM',
                        phone: crmContact.phone_primary,
                        email: crmContact.email_primary || undefined,
                        company: crmContact.company_name || undefined,
                        job_title: crmContact.cargo || undefined,
                        contact_type: 'cliente',
                      })
                      .select('id')
                      .single();

                    if (error) {
                      toast.error('Erro ao importar contato');
                      return;
                    }
                    toast.success('Contato importado do CRM!');
                    setIsCRMSearchOpen(false);
                    if (newContact) openContactChat(newContact.id);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onActionComplete={() => { setSelectedIds([]); refetch(); }}
        availableTags={uniqueTags}
      />
    </div>
  );
}

/** Skeleton loader that adapts to the current view mode with staggered animations */
function ContactsSkeleton({ viewMode, gridColumns }: { viewMode: ContactViewMode; gridColumns: number }) {
  if (viewMode === 'grid') {
    return (
      <div className={cn("grid gap-4", GRID_COLUMNS_CLASS[gridColumns] || GRID_COLUMNS_CLASS[4])}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="rounded-2xl border border-border/30 p-5 space-y-4"
          >
            <div className="h-1 w-full rounded bg-muted/60 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
              </div>
            </div>
            <div className="h-12 rounded-xl bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 100 + 100}ms` }} />
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 100 + 150}ms` }} />
              <div className="h-3 w-40 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 100 + 200}ms` }} />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30"
          >
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 80 + 50}ms` }} />
            </div>
            <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-3"
          >
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 80 + 50}ms` }} />
            </div>
            <div className="h-5 w-16 rounded-full bg-muted/40 animate-pulse" />
            <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
