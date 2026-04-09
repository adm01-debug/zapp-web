import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExternalContact360Batch } from '@/hooks/useExternalContact360Batch';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollToTopButton } from '@/components/ui/scroll-to-top';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search, Plus, Upload, Phone, Filter, RefreshCw, Users,
  Sparkles, FileSpreadsheet,
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
import type { ContactViewMode } from './ContactViewSwitcher';
import { ContactImportDialog } from './ContactImportDialog';
import { ContactMergeDialog } from './ContactMergeDialog';
import { ContactMergePanel } from './ContactMergePanel';
import { ContactGroupedList } from './ContactGroupedList';
import { ContactCompareDialog } from './ContactCompareDialog';
import type { FilterPreset } from './FilterPresets';
import { ContactBulkTagDialog } from './ContactBulkTagDialog';
import { ContactMapView } from './ContactMapView';
import { ContactBirthdayPanel } from './ContactBirthdayPanel';
import { ContactDialogs } from './ContactDialogs';
import { ContactToolbar } from './ContactToolbar';
import { ContactPagination } from './ContactPagination';
import { ContactDetailPanel } from './ContactDetailPanel';
import { ContactKanbanView } from './ContactKanbanView';
import { ContactAnalyticsDashboard } from './ContactAnalyticsDashboard';

const GRID_COLUMNS_CLASS: Record<number, string> = {
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
};

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
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<typeof filteredContacts[0] | null>(null);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    if (preset.filters.type) setActiveTab(preset.filters.type);
    if (preset.filters.company) setFilterCompany(preset.filters.company);
    if (preset.filters.jobTitle) setFilterJobTitle(preset.filters.jobTitle);
    if (preset.filters.tag) setFilterTag(preset.filters.tag);
    if (preset.filters.dateRange) setFilterDateRange(preset.filters.dateRange);
    toast.success(`Filtro "${preset.name}" aplicado`);
  }, [setActiveTab, setFilterCompany, setFilterJobTitle, setFilterTag, setFilterDateRange]);

  const contactPhones = useMemo(() => filteredContacts.map(c => c.phone), [filteredContacts]);
  const { lookup: getCRMData } = useExternalContact360Batch(contactPhones);

  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => selected ? [...prev, id] : prev.filter(i => i !== id));
  }, [setSelectedIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.length === filteredContacts.length ? [] : filteredContacts.map(c => c.id)
    );
  }, [filteredContacts, setSelectedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setIsAddDialogOpen(true); }
      if (e.key === 'Escape') {
        if (detailContact) { setDetailContact(null); return; }
        if (selectedIds.length > 0) { setSelectedIds([]); }
        else if (searchInput) { clearSearch(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); handleSelectAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds.length, searchInput, clearSearch, setIsAddDialogOpen, setSelectedIds, handleSelectAll, detailContact]);

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

  const handleContactClick = useCallback((id: string) => {
    const contact = filteredContacts.find(c => c.id === id);
    if (contact) setDetailContact(contact);
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
        breadcrumbs={[{ label: 'Gestão' }, { label: 'Contatos' }]}
        actions={
          <div className="flex items-center gap-2">
            {isExternalConfigured && (
              <Button variant="outline" onClick={() => setIsCRMSearchOpen(true)} className="border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4 mr-2" />CRM 360°
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Sincronizar
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Importar
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredContacts.length === 0}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />Exportar
            </Button>
            <ContactDialogs
              isAddDialogOpen={isAddDialogOpen} setIsAddDialogOpen={setIsAddDialogOpen}
              newContact={newContact} handleNewContactChange={handleNewContactChange}
              handleAddContact={handleAddContact} handleCancelForm={handleCancelForm}
              isSubmitting={isSubmitting}
              isEditDialogOpen={isEditDialogOpen} setIsEditDialogOpen={setIsEditDialogOpen}
              editingContact={editingContact} handleEditContactChange={handleEditContactChange}
              handleEditContact={handleEditContact}
              showSuccess={showSuccess} setShowSuccess={setShowSuccess}
              deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget}
              handleDeleteContact={handleDeleteContact}
            />
          </div>
        }
      />

      {/* Import / Merge / Compare / BulkTag Dialogs */}
      <ContactImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} onImportComplete={refetch} />
      <ContactMergeDialog
        open={isMergeOpen} onOpenChange={setIsMergeOpen}
        contacts={filteredContacts.filter(c => selectedIds.includes(c.id))}
        onMergeComplete={() => { setSelectedIds([]); refetch(); }}
      />
      <ContactCompareDialog
        open={isCompareOpen} onOpenChange={setIsCompareOpen}
        contacts={filteredContacts.filter(c => selectedIds.includes(c.id))}
      />
      <ContactBulkTagDialog
        open={isBulkTagOpen} onOpenChange={setIsBulkTagOpen}
        contactIds={selectedIds} allTags={uniqueTags}
        onComplete={() => { setSelectedIds([]); refetch(); }}
      />

      {/* Stats + Birthday */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <ContactStatsCards totalCount={totalCount} contactCountByType={contactCountByType} uniqueCompanies={uniqueCompanies} contacts={filteredContacts} />
        </div>
        <div className="lg:col-span-1">
          <ContactBirthdayPanel
            contacts={filteredContacts.map(c => ({ id: c.id, name: c.name, avatar_url: c.avatar_url, birthday: undefined }))}
            onContactClick={openContactChat}
          />
        </div>
      </div>

      {/* Type Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-background flex items-center gap-2">
              <Users className="w-4 h-4" />Todos
              <Badge variant="secondary" className="ml-1 text-xs">{contactCountByType['all'] || 0}</Badge>
            </TabsTrigger>
            {CONTACT_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="data-[state=active]:bg-background flex items-center gap-2">
                {CONTACT_TYPE_ICONS[type.value]}
                {type.label}
                {contactCountByType[type.value] > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{contactCountByType[type.value]}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Toolbar */}
      <ContactToolbar
        searchInput={searchInput} onSearchChange={handleSearchChange}
        sortBy={sortBy} setSortBy={setSortBy}
        showFilters={showFilters} setShowFilters={setShowFilters}
        activeFiltersCount={activeFiltersCount} clearFilters={clearFilters}
        activeTab={activeTab}
        filterCompany={filterCompany} setFilterCompany={setFilterCompany}
        filterJobTitle={filterJobTitle} setFilterJobTitle={setFilterJobTitle}
        filterTag={filterTag} setFilterTag={setFilterTag}
        filterDateRange={filterDateRange} setFilterDateRange={setFilterDateRange}
        uniqueCompanies={uniqueCompanies} uniqueJobTitles={uniqueJobTitles} uniqueTags={uniqueTags}
        onApplyPreset={handleApplyPreset}
        groupByCompany={groupByCompany} setGroupByCompany={setGroupByCompany}
        selectedIds={selectedIds}
        onBulkTag={() => setIsBulkTagOpen(true)}
        onCompare={() => setIsCompareOpen(true)}
        onMerge={() => setIsMergeOpen(true)}
        viewMode={viewMode} setViewMode={setViewMode}
        gridColumns={gridColumns} setGridColumns={setGridColumns}
        totalCount={totalCount}
      />

      {/* Results Summary */}
      {!loading && filteredContacts.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSelectAll}>
              <Checkbox
                checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={() => handleSelectAll()}
                className="w-3.5 h-3.5"
              />
              {selectedIds.length > 0 ? `${selectedIds.length} selecionado${selectedIds.length !== 1 ? 's' : ''}` : 'Selecionar todos'}
            </Button>
            <span className="text-muted-foreground/60">|</span>
            <span>
              Exibindo <span className="font-semibold text-foreground">{filteredContacts.length}</span>
              {filteredContacts.length < totalCount && <> de <span className="font-semibold text-foreground">{totalCount}</span></>}
              {' '}contato{totalCount !== 1 ? 's' : ''}
            </span>
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1"><Filter className="w-3 h-3" />{activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {search && <span className="text-xs italic">Buscando por "{search}"</span>}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-muted-foreground/50">
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Ctrl+N</kbd><span>Novo</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Ctrl+A</kbd><span>Selecionar</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40 font-mono">Esc</kbd><span>Limpar</span>
            </div>
          </div>
        </div>
      )}

      {/* Contact Content */}
      {loading ? (
        <ContactsSkeleton viewMode={viewMode} gridColumns={gridColumns} />
      ) : filteredContacts.length === 0 ? (
        <Card><CardContent className="p-0">
          <EmptyState
            icon={Phone} title="Nenhum contato encontrado"
            description={search ? "Tente ajustar seus filtros ou termo de busca" : "Adicione seu primeiro contato"}
            illustration="contacts"
            actionLabel={!search ? "Novo Contato" : undefined}
            onAction={!search ? () => setIsAddDialogOpen(true) : undefined}
            secondaryActionLabel={search ? "Limpar Busca" : undefined}
            onSecondaryAction={search ? clearSearch : undefined}
          />
        </CardContent></Card>
      ) : viewMode === 'grid' ? (
        <div className={cn("grid gap-4", GRID_COLUMNS_CLASS[gridColumns] || GRID_COLUMNS_CLASS[4])}>
          {filteredContacts.map((contact, index) => (
            <ContactCard
              key={contact.id} contact={contact}
              isSelected={selectedIds.includes(contact.id)}
              onToggleSelect={handleToggleSelect}
              onOpenChat={handleContactClick}
              onEdit={openEditDialog} onDelete={setDeleteTarget} index={index}
              companyLogo={getCRMData(contact.phone)?.logo_url}
              companyName={getCRMData(contact.phone)?.company_name}
              searchQuery={search}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        groupByCompany ? (
          <ContactGroupedList
            contacts={filteredContacts} selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect} onOpenChat={handleContactClick}
            onEdit={openEditDialog} onDelete={setDeleteTarget}
            getCRMData={getCRMData} searchQuery={search}
          />
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, index) => (
              <ContactListItem
                key={contact.id} contact={contact}
                isSelected={selectedIds.includes(contact.id)}
                onToggleSelect={handleToggleSelect}
                onOpenChat={handleContactClick}
                onEdit={openEditDialog} onDelete={setDeleteTarget} index={index}
                companyLogo={getCRMData(contact.phone)?.logo_url}
                companyName={getCRMData(contact.phone)?.company_name}
                searchQuery={search}
              />
            ))}
          </div>
        )
      ) : viewMode === 'kanban' ? (
        <ContactKanbanView contacts={filteredContacts} onContactClick={handleContactClick} />
      ) : viewMode === 'map' ? (
        <ContactMapView contacts={filteredContacts} onContactClick={handleContactClick} />
      ) : (
        <Card><CardContent className="p-0">
          <ContactsTable
            contacts={filteredContacts} selectedIds={selectedIds}
            onSelectIds={setSelectedIds} onOpenChat={handleContactClick}
            onEdit={openEditDialog} onDelete={setDeleteTarget}
            getCRMData={getCRMData} searchQuery={search}
          />
        </CardContent></Card>
      )}

      {/* Pagination */}
      <ContactPagination
        totalCount={totalCount} pageSize={pageSize} page={page}
        setPage={setPage} loadMore={loadMore} loadPrevious={loadPrevious}
        hasMore={hasMore} loading={loading}
      />

      {/* Detail Panel */}
      {detailContact && (
        <ContactDetailPanel
          contact={detailContact}
          onClose={() => setDetailContact(null)}
          onOpenChat={openContactChat}
          onEdit={openEditDialog}
        />
      )}

      {/* CRM 360° Dialog */}
      {isExternalConfigured && (
        <Dialog open={isCRMSearchOpen} onOpenChange={setIsCRMSearchOpen}>
          <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
            <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />Busca avançada — CRM 360°
              </DialogTitle>
              <DialogDescription>Pesquise contatos no CRM com filtros por vendedor, empresa, ramo, estado e segmento</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <AdvancedCRMSearch
                onSelectContact={async (crmContact) => {
                  if (!crmContact.phone_primary) return;
                  const cleanPhone = crmContact.phone_primary.replace(/\D/g, '');
                  const { data: existing } = await supabase
                    .from('contacts').select('id')
                    .or(`phone.eq.${crmContact.phone_primary},phone.eq.${cleanPhone}`)
                    .limit(1);
                  if (existing && existing.length > 0) {
                    setIsCRMSearchOpen(false);
                    openContactChat(existing[0].id);
                  } else {
                    const { data: newC, error } = await supabase
                      .from('contacts')
                      .insert({
                        name: crmContact.full_name || crmContact.nome_tratamento || 'Contato CRM',
                        phone: crmContact.phone_primary,
                        email: crmContact.email_primary || undefined,
                        company: crmContact.company_name || undefined,
                        job_title: crmContact.cargo || undefined,
                        contact_type: 'cliente',
                      })
                      .select('id').single();
                    if (error) { toast.error('Erro ao importar contato'); return; }
                    toast.success('Contato importado do CRM!');
                    setIsCRMSearchOpen(false);
                    if (newC) openContactChat(newC.id);
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

/** Skeleton loader */
function ContactsSkeleton({ viewMode, gridColumns }: { viewMode: ContactViewMode; gridColumns: number }) {
  if (viewMode === 'grid') {
    return (
      <div className={cn("grid gap-4", GRID_COLUMNS_CLASS[gridColumns] || GRID_COLUMNS_CLASS[4])}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
            className="rounded-2xl border border-border/30 p-5 space-y-4">
            <div className="h-1 w-full rounded bg-muted/60 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
              </div>
            </div>
            <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          </motion.div>
        ))}
      </div>
    );
  }
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30">
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <Card><CardContent className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4 p-3">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted/40 animate-pulse" />
        </motion.div>
      ))}
    </CardContent></Card>
  );
}
