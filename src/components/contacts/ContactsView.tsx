import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Copy, ChevronLeft, ChevronRight, Sparkles,
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

  return (
    <div ref={scrollContainerRef} className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <ScrollToTopButton scrollRef={scrollContainerRef} />
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header with Breadcrumbs */}
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

      {/* Success Confirmation Dialog */}
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
              <p><strong>{showSuccess?.name}</strong> foi adicionado com sucesso à sua base de contatos.</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Protocolo de registro</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono font-semibold text-foreground">{showSuccess?.protocol}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => {
                      navigator.clipboard.writeText(showSuccess?.protocol || '');
                      toast.success('Protocolo copiado!');
                    }}
                    aria-label="Copiar protocolo"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Respondemos em até 24h para contatos com email cadastrado.</p>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(null)} className="w-full bg-whatsapp hover:bg-whatsapp-dark">
            Continuar
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? 
              Esta ação não pode ser desfeita e todas as conversas associadas serão mantidas sem vínculo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteContact(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-background flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Todos
              <Badge variant="secondary" className="ml-1 text-xs">
                {contactCountByType['all'] || 0}
              </Badge>
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
                  <Badge 
                    variant="secondary" 
                    className={cn("ml-1 text-xs", type.color.replace('bg-', 'bg-opacity-20 text-'))}
                  >
                    {contactCountByType[type.value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, email ou empresa..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant={showFilters ? "default" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-whatsapp hover:bg-whatsapp-dark" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-background/20 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </motion.div>
          {activeFiltersCount > 0 && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="ghost" onClick={clearFilters} size="sm">
                <X className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            </motion.div>
          )}
        </div>

        {/* Advanced Filters Panel - Bitrix Style */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/50 rounded-lg p-4 border border-border"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Company Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Empresa
                </Label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as empresas</SelectItem>
                    {uniqueCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Title Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Cargo
                </Label>
                <Select value={filterJobTitle} onValueChange={setFilterJobTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os cargos</SelectItem>
                    {uniqueJobTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Etiqueta
                </Label>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as etiquetas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as etiquetas</SelectItem>
                    {uniqueTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Período
                </Label>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os períodos" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FILTERS.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Results Summary */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between text-sm text-muted-foreground"
        >
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
                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} ativo{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {search && (
            <span className="text-xs italic">
              Buscando por "{search}"
            </span>
          )}
        </motion.div>
      )}

      {/* Contacts Table/Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted/60" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-muted/40" />
                  <div className="h-3 w-28 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="Nenhum contato encontrado"
              description={search ? "Tente ajustar seus filtros ou termo de busca" : "Adicione seu primeiro contato para começar a gerenciar suas conversas"}
              illustration="contacts"
              actionLabel={!search ? "Novo Contato" : undefined}
              onAction={!search ? () => setIsAddDialogOpen(true) : undefined}
              secondaryActionLabel={search ? "Limpar Busca" : undefined}
              onSecondaryAction={search ? () => { clearSearch(); } : undefined}
            />
          ) : (
            <ContactsTable
              contacts={filteredContacts}
              selectedIds={selectedIds}
              onSelectIds={setSelectedIds}
              onOpenChat={openContactChat}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {Math.ceil(totalCount / pageSize)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPrevious}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={!hasMore || loading}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* CRM 360° Advanced Search Dialog */}
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
                  
                  // Check if contact exists locally by phone
                  const cleanPhone = crmContact.phone_primary.replace(/\D/g, '');
                  const { data: existing } = await supabase
                    .from('contacts')
                    .select('id')
                    .or(`phone.eq.${crmContact.phone_primary},phone.eq.${cleanPhone}`)
                    .limit(1);
                  
                  if (existing && existing.length > 0) {
                    // Contact exists locally — open chat
                    setIsCRMSearchOpen(false);
                    openContactChat(existing[0].id);
                  } else {
                    // Import contact from CRM
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
                    if (newContact) {
                      openContactChat(newContact.id);
                    }
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
