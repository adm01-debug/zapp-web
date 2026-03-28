import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollToTopButton } from '@/components/ui/scroll-to-top';
import { ContactsEmptyState } from '@/components/ui/contextual-empty-states';
import { ContactForm } from '@/components/contacts/ContactForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  MoreVertical,
  MessageSquare,
  Edit,
  Trash2,
  Download,
  Upload,
  Mail,
  Phone,
  Tag,
  Calendar,
  Filter,
  RefreshCw,
  Building,
  Briefcase,
  Users,
  UserCheck,
  Truck,
  Wrench,
  Star,
  Handshake,
  MoreHorizontal,
  X,
  CalendarDays,
  SortAsc,
  CheckCircle2,
  Copy,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTACT_TYPES, getContactTypeInfo } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';
import { useContactsSearch } from '@/hooks/useContactsSearch';

interface Contact {
  id: string;
  name: string;
  nickname: string | null;
  surname: string | null;
  job_title: string | null;
  company: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  tags: string[] | null;
  notes: string | null;
  contact_type: string | null;
  created_at: string;
  updated_at: string;
}

// Contact type icons mapping
const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  cliente: <Users className="w-4 h-4" />,
  fornecedor: <Truck className="w-4 h-4" />,
  colaborador: <UserCheck className="w-4 h-4" />,
  prestador_servico: <Wrench className="w-4 h-4" />,
  lead: <Star className="w-4 h-4" />,
  parceiro: <Handshake className="w-4 h-4" />,
  outros: <MoreHorizontal className="w-4 h-4" />,
};

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
  
  const { profile } = useAuth();
  const feedback = useActionFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ name: string; protocol: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [newContact, setNewContact] = useState({
    name: '',
    nickname: '',
    surname: '',
    job_title: '',
    company: '',
    phone: '',
    email: '',
    contact_type: 'cliente',
  });

  // Server-side search hook
  const {
    contacts: filteredContacts,
    totalCount,
    loading,
    hasMore,
    contactCountByType,
    uniqueCompanies,
    uniqueJobTitles,
    uniqueTags,
    searchInput,
    debouncedSearch: search,
    handleSearchChange,
    clearSearch,
    activeTab,
    setActiveTab,
    filterCompany,
    setFilterCompany,
    filterJobTitle,
    setFilterJobTitle,
    filterTag,
    setFilterTag,
    filterDateRange,
    setFilterDateRange,
    sortBy,
    setSortBy,
    activeFiltersCount,
    clearFilters,
    page,
    setPage,
    pageSize,
    loadMore,
    loadPrevious,
    refetch,
  } = useContactsSearch();

  const generateProtocol = useCallback(() => {
    const now = new Date();
    return `CT-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  }, []);

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      feedback.warning('Preencha os campos obrigatórios');
      return;
    }
    setIsSubmitting(true);
    await feedback.withFeedback(
      async () => {
        const { error } = await supabase.from('contacts').insert({
          name: newContact.name,
          nickname: newContact.nickname || null,
          surname: newContact.surname || null,
          job_title: newContact.job_title || null,
          company: newContact.company || null,
          phone: newContact.phone,
          email: newContact.email || null,
          contact_type: newContact.contact_type,
          assigned_to: profile?.id || null,
        });
        if (error) {
          if (error.code === '23505' && error.message?.includes('contacts_phone_unique')) {
            throw new Error('Já existe um contato cadastrado com este número de telefone.');
          }
          throw error;
        }
      },
      {
        loadingMessage: 'Adicionando contato...',
        successMessage: 'Contato adicionado com sucesso!',
        errorMessage: 'Erro ao adicionar contato',
        onSuccess: () => {
          const protocol = generateProtocol();
          const contactName = newContact.name;
          setNewContact({ name: '', nickname: '', surname: '', job_title: '', company: '', phone: '', email: '', contact_type: 'cliente' });
          setIsAddDialogOpen(false);
          setShowSuccess({ name: contactName, protocol });
          refetch();
        },
      }
    );
    setIsSubmitting(false);
  };

  const handleEditContact = async () => {
    if (!editingContact) return;
    setIsSubmitting(true);
    await feedback.withFeedback(
      async () => {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: editingContact.name,
            nickname: editingContact.nickname,
            surname: editingContact.surname,
            job_title: editingContact.job_title,
            company: editingContact.company,
            phone: editingContact.phone,
            email: editingContact.email,
            contact_type: editingContact.contact_type,
          })
          .eq('id', editingContact.id);
        if (error) {
          if (error.code === '23505' && error.message?.includes('contacts_phone_unique')) {
            throw new Error('Já existe outro contato com este número de telefone.');
          }
          throw error;
        }
      },
      {
        loadingMessage: 'Salvando alterações...',
        successMessage: 'Contato atualizado com sucesso!',
        errorMessage: 'Erro ao atualizar contato',
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingContact(null);
          refetch();
        },
      }
    );
    setIsSubmitting(false);
  };

  const handleDeleteContact = async (id: string) => {
    await feedback.withFeedback(
      async () => {
        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) throw error;
      },
      {
        loadingMessage: 'Excluindo contato...',
        successMessage: 'Contato excluído com sucesso!',
        errorMessage: 'Erro ao excluir contato',
        onSuccess: () => {
          setDeleteTarget(null);
          refetch();
        },
      }
    );
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleCancelForm = useCallback(() => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  }, []);

  const handleNewContactChange = useCallback((field: string, value: string) => {
    setNewContact(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEditContactChange = useCallback((field: string, value: string) => {
    setEditingContact(prev => prev ? { ...prev, [field]: value } as Contact : null);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
                <CheckCircle2 className="w-16 h-16 text-green-500" />
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary/20 bg-secondary/5">
                    <th className="text-left p-4 font-medium text-muted-foreground">Contato</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Telefone</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Empresa/Cargo</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Etiquetas</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Criado em</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, index) => {
                    const typeInfo = getContactTypeInfo(contact.contact_type || 'cliente');
                    return (
                      <motion.tr
                        key={contact.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-secondary/10 last:border-0 hover:bg-secondary/5 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={contact.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium block">{contact.name} {contact.surname || ''}</span>
                              {contact.nickname && (
                                <span className="text-xs text-muted-foreground">({contact.nickname})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "flex items-center gap-1.5 w-fit",
                              typeInfo.color.replace('bg-', 'border-'),
                              typeInfo.color.replace('bg-', 'text-').replace('-500', '-600')
                            )}
                          >
                            {CONTACT_TYPE_ICONS[typeInfo.value]}
                            {typeInfo.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {contact.phone}
                          </div>
                        </td>
                        <td className="p-4">
                          {contact.email ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {contact.email}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          {(contact.company || contact.job_title) ? (
                            <div className="space-y-1">
                              {contact.company && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Building className="w-3 h-3" />
                                  {contact.company}
                                </div>
                              )}
                              {contact.job_title && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Briefcase className="w-3 h-3" />
                                  {contact.job_title}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8"
                                onClick={() => {
                                  const appWindow = window as Window & { __pendingOpenContactId?: string };
                                  appWindow.__pendingOpenContactId = contact.id;

                                  if (window.location.hash !== '#inbox') {
                                    window.location.hash = 'inbox';
                                  } else {
                                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                                  }

                                  // Retry dispatching until Inbox mounts and starts listening
                                  let attempts = 0;
                                  const tryDispatch = () => {
                                    attempts++;
                                    window.dispatchEvent(new CustomEvent('open-contact-chat', { detail: { contactId: contact.id } }));
                                    if (attempts < 15) {
                                      setTimeout(tryDispatch, 200);
                                    }
                                  };

                                  setTimeout(tryDispatch, 150);
                                }}
                                title="Iniciar conversa"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button variant="ghost" size="icon" className="w-8 h-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </motion.div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Tag className="w-4 h-4 mr-2" />
                                  Gerenciar etiquetas
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteTarget(contact)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
