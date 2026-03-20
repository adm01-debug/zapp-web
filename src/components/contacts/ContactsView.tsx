import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from '@/components/ui/motion';
import { log } from '@/lib/logger';
import { EmptyState } from '@/components/ui/empty-state';
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
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTACT_TYPES, getContactTypeInfo } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';

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
  const feedback = useActionFeedback();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterJobTitle, setFilterJobTitle] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  
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

  // Extract unique values for filters
  const uniqueCompanies = [...new Set(contacts.map(c => c.company).filter(Boolean))] as string[];
  const uniqueJobTitles = [...new Set(contacts.map(c => c.job_title).filter(Boolean))] as string[];
  const uniqueTags = [...new Set(contacts.flatMap(c => c.tags || []))] as string[];

  // Count contacts by type
  const contactCountByType = CONTACT_TYPES.reduce((acc, type) => {
    acc[type.value] = contacts.filter(c => (c.contact_type || 'cliente') === type.value).length;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar contatos');
      log.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  // Apply date filter
  const getDateFilterDate = (filterValue: string): Date | null => {
    const now = new Date();
    switch (filterValue) {
      case 'today':
        return subDays(now, 1);
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subMonths(now, 1);
      case 'quarter':
        return subMonths(now, 3);
      case 'year':
        return subMonths(now, 12);
      default:
        return null;
    }
  };

  // Sort contacts
  const sortContacts = (contactsList: Contact[]): Contact[] => {
    return [...contactsList].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });
  };

  const filteredContacts = sortContacts(contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone.includes(search) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.company?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTab = activeTab === 'all' || (contact.contact_type || 'cliente') === activeTab;
    const matchesCompany = !filterCompany || contact.company === filterCompany;
    const matchesJobTitle = !filterJobTitle || contact.job_title === filterJobTitle;
    const matchesTag = !filterTag || contact.tags?.includes(filterTag);
    
    // Date filter
    const dateFilterDate = getDateFilterDate(filterDateRange);
    const matchesDate = !dateFilterDate || isAfter(new Date(contact.created_at), dateFilterDate);
    
    return matchesSearch && matchesTab && matchesCompany && matchesJobTitle && matchesTag && matchesDate;
  }));

  const activeFiltersCount = [filterCompany, filterJobTitle, filterTag, filterDateRange !== 'all' ? filterDateRange : ''].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCompany('');
    setFilterJobTitle('');
    setFilterTag('');
    setFilterDateRange('all');
    setSortBy('name_asc');
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      feedback.warning('Preencha os campos obrigatórios');
      return;
    }

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
        });
        if (error) throw error;
      },
      {
        loadingMessage: 'Adicionando contato...',
        successMessage: 'Contato adicionado com sucesso!',
        errorMessage: 'Erro ao adicionar contato',
        onSuccess: () => {
          setNewContact({ name: '', nickname: '', surname: '', job_title: '', company: '', phone: '', email: '', contact_type: 'cliente' });
          setIsAddDialogOpen(false);
          fetchContacts();
        },
      }
    );
  };

  const handleEditContact = async () => {
    if (!editingContact) return;

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
        if (error) throw error;
      },
      {
        loadingMessage: 'Salvando alterações...',
        successMessage: 'Contato atualizado com sucesso!',
        errorMessage: 'Erro ao atualizar contato',
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingContact(null);
          fetchContacts();
        },
      }
    );
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
        onSuccess: () => fetchContacts(),
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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Contatos"
        subtitle={`Base de clientes e leads (${contacts.length} contatos)`}
        breadcrumbs={[
          { label: 'Gestão' },
          { label: 'Contatos' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchContacts} disabled={loading}>
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
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Type Tabs */}
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
                {contacts.length}
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

      {/* Contacts Table/Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
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
              onSecondaryAction={search ? () => { setSearch(''); setSearchInput(''); } : undefined}
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
                              <Button variant="ghost" size="icon" className="w-8 h-8">
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
                                  onClick={() => handleDeleteContact(contact.id)}
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
