import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExternalContact360Batch, type CRMBatchResult } from '@/hooks/useExternalContact360Batch';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollToTopButton } from '@/components/ui/scroll-to-top';
import { ContactForm } from '@/components/contacts/ContactForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Button } from '@/components/ui/button';
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
  Copy, ChevronLeft, ChevronRight, Sparkles, Trash2,
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
import { ContactViewSwitcher, type ContactViewMode } from './ContactViewSwitcher';

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

  // Fetch company logos from external CRM
  const contactPhones = useMemo(() => filteredContacts.map(c => c.phone), [filteredContacts]);
  const { data: crmDataMap } = useExternalContact360Batch(contactPhones);

  const getCRMData = (phone: string): CRMBatchResult | undefined => {
    if (!crmDataMap) return undefined;
    const clean = phone.replace(/[^0-9]/g, '');
    return crmDataMap.get(phone) || crmDataMap.get(clean);
  };

  const handleToggleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

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
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
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
      {!loading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
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
          {search && <span className="text-xs italic">Buscando por "{search}"</span>}
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
            />
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {Math.ceil(totalCount / pageSize)}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadPrevious} disabled={page === 0 || loading}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={loadMore} disabled={!hasMore || loading}>
              Próxima<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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

/** Skeleton loader that adapts to the current view mode */
function ContactsSkeleton({ viewMode, gridColumns }: { viewMode: ContactViewMode; gridColumns: number }) {
  if (viewMode === 'grid') {
    return (
      <div className={cn("grid gap-4", GRID_COLUMNS_CLASS[gridColumns] || GRID_COLUMNS_CLASS[4])}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/30 p-5 animate-pulse space-y-4">
            <div className="h-1 w-full rounded bg-muted/60" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted/60" />
              </div>
            </div>
            <div className="h-12 rounded-xl bg-muted/40" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-muted/40" />
              <div className="h-3 w-40 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30 animate-pulse">
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="w-11 h-11 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted/50" />
            </div>
            <div className="h-3 w-28 rounded bg-muted/40" />
            <div className="h-3 w-20 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted/60" />
            </div>
            <div className="h-5 w-16 rounded-full bg-muted/40" />
            <div className="h-3 w-28 rounded bg-muted/40" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
