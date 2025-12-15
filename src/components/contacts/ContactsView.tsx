import { useState, useEffect } from 'react';
import { motion } from '@/components/ui/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  created_at: string;
  updated_at: string;
}

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterJobTitle, setFilterJobTitle] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [newContact, setNewContact] = useState({
    name: '',
    nickname: '',
    surname: '',
    job_title: '',
    company: '',
    phone: '',
    email: '',
  });

  // Extract unique values for filters
  const uniqueCompanies = [...new Set(contacts.map(c => c.company).filter(Boolean))] as string[];
  const uniqueJobTitles = [...new Set(contacts.map(c => c.job_title).filter(Boolean))] as string[];
  const uniqueTags = [...new Set(contacts.flatMap(c => c.tags || []))] as string[];

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
      console.error(error);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone.includes(search) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.company?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCompany = !filterCompany || contact.company === filterCompany;
    const matchesJobTitle = !filterJobTitle || contact.job_title === filterJobTitle;
    const matchesTag = !filterTag || contact.tags?.includes(filterTag);
    
    return matchesSearch && matchesCompany && matchesJobTitle && matchesTag;
  });

  const activeFiltersCount = [filterCompany, filterJobTitle, filterTag].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCompany('');
    setFilterJobTitle('');
    setFilterTag('');
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const { error } = await supabase.from('contacts').insert({
      name: newContact.name,
      nickname: newContact.nickname || null,
      surname: newContact.surname || null,
      job_title: newContact.job_title || null,
      company: newContact.company || null,
      phone: newContact.phone,
      email: newContact.email || null,
    });

    if (error) {
      toast.error('Erro ao adicionar contato');
      console.error(error);
    } else {
      toast.success('Contato adicionado com sucesso');
      setNewContact({ name: '', nickname: '', surname: '', job_title: '', company: '', phone: '', email: '' });
      setIsAddDialogOpen(false);
      fetchContacts();
    }
  };

  const handleEditContact = async () => {
    if (!editingContact) return;

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
      })
      .eq('id', editingContact.id);

    if (error) {
      toast.error('Erro ao atualizar contato');
      console.error(error);
    } else {
      toast.success('Contato atualizado com sucesso');
      setIsEditDialogOpen(false);
      setEditingContact(null);
      fetchContacts();
    }
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir contato');
      console.error(error);
    } else {
      toast.success('Contato excluído');
      fetchContacts();
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const ContactForm = ({ 
    values, 
    onChange, 
    onSubmit, 
    submitLabel 
  }: { 
    values: typeof newContact | Contact; 
    onChange: (field: string, value: string) => void;
    onSubmit: () => void;
    submitLabel: string;
  }) => (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Principal *</Label>
          <Input
            id="name"
            placeholder="Nome"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Sobrenome</Label>
          <Input
            id="surname"
            placeholder="Sobrenome"
            value={values.surname || ''}
            onChange={(e) => onChange('surname', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nickname">Apelido</Label>
        <Input
          id="nickname"
          placeholder="Como prefere ser chamado"
          value={values.nickname || ''}
          onChange={(e) => onChange('nickname', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="job_title">Cargo</Label>
          <Input
            id="job_title"
            placeholder="Ex: Gerente de Vendas"
            value={values.job_title || ''}
            onChange={(e) => onChange('job_title', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            placeholder="Nome da empresa"
            value={values.company || ''}
            onChange={(e) => onChange('company', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          placeholder="+55 11 99999-9999"
          value={values.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          value={values.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
        }}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} className="bg-whatsapp hover:bg-whatsapp-dark">
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <FloatingParticles />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground">
            Base de clientes e leads ({contacts.length} contatos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={fetchContacts} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </motion.div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Contato
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Contato</DialogTitle>
              </DialogHeader>
              <ContactForm
                values={newContact}
                onChange={(field, value) => setNewContact({ ...newContact, [field]: value })}
                onSubmit={handleAddContact}
                submitLabel="Adicionar"
              />
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              values={editingContact}
              onChange={(field, value) => setEditingContact({ ...editingContact, [field]: value } as Contact)}
              onSubmit={handleEditContact}
              submitLabel="Salvar"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
                Limpar filtros
              </Button>
            </motion.div>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/50 rounded-lg p-4 border border-border"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Empresa
                </Label>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Todas as empresas</option>
                  {uniqueCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Title Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Cargo
                </Label>
                <select
                  value={filterJobTitle}
                  onChange={(e) => setFilterJobTitle(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Todos os cargos</option>
                  {uniqueJobTitles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Etiqueta
                </Label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Todas as etiquetas</option>
                  {uniqueTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
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
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum contato encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">Contato</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Telefone</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Empresa/Cargo</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Etiquetas</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Criado em</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, index) => (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
