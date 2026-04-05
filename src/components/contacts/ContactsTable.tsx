import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare, Edit, Trash2, MoreVertical, Phone, Mail,
  Building, Briefcase, Calendar, Tag, Users, Truck, UserCheck,
  Wrench, Star, Handshake, MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getContactTypeInfo } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';

const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  cliente: <Users className="w-4 h-4" />,
  fornecedor: <Truck className="w-4 h-4" />,
  colaborador: <UserCheck className="w-4 h-4" />,
  prestador_servico: <Wrench className="w-4 h-4" />,
  lead: <Star className="w-4 h-4" />,
  parceiro: <Handshake className="w-4 h-4" />,
  outros: <MoreHorizontal className="w-4 h-4" />,
};

export { CONTACT_TYPE_ICONS };

interface Contact {
  id: string;
  name: string;
  surname: string | null;
  nickname: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  company: string | null;
  job_title: string | null;
  tags: string[] | null;
  contact_type: string | null;
  created_at: string;
}

interface ContactsTableProps {
  contacts: Contact[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onOpenChat: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactsTable({
  contacts, selectedIds, onSelectIds, onOpenChat, onEdit, onDelete,
}: ContactsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-secondary/20 bg-secondary/5">
            <th className="p-4 w-10">
              <Checkbox
                checked={selectedIds.length === contacts.length && contacts.length > 0}
                onCheckedChange={(checked) => onSelectIds(checked ? contacts.map(c => c.id) : [])}
                aria-label="Selecionar todos"
              />
            </th>
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
          {contacts.map((contact, index) => {
            const typeInfo = getContactTypeInfo(contact.contact_type || 'cliente');
            return (
              <motion.tr
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-secondary/10 last:border-0 hover:bg-secondary/5 transition-colors cursor-pointer"
                onClick={() => onOpenChat(contact.id)}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={(checked) =>
                      onSelectIds(checked ? [...selectedIds, contact.id] : selectedIds.filter(id => id !== contact.id))
                    }
                    aria-label={`Selecionar ${contact.name}`}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium block">{contact.name} {contact.surname || ''}</span>
                      {contact.nickname && <span className="text-xs text-muted-foreground">({contact.nickname})</span>}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="outline" className={cn("flex items-center gap-1.5 w-fit", typeInfo.color.replace('bg-', 'border-'), typeInfo.color.replace('bg-', 'text-').replace('-500', '-600'))}>
                    {CONTACT_TYPE_ICONS[typeInfo.value]}
                    {typeInfo.label}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{contact.phone}</div>
                </td>
                <td className="p-4">
                  {contact.email ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{contact.email}</div>
                  ) : <span className="text-muted-foreground/50">-</span>}
                </td>
                <td className="p-4">
                  {(contact.company || contact.job_title) ? (
                    <div className="space-y-1">
                      {contact.company && <div className="flex items-center gap-1 text-sm"><Building className="w-3 h-3" />{contact.company}</div>}
                      {contact.job_title && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Briefcase className="w-3 h-3" />{contact.job_title}</div>}
                    </div>
                  ) : <span className="text-muted-foreground/50">-</span>}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags?.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onOpenChat(contact.id)} title="Iniciar conversa">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </motion.div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="icon" className="w-8 h-8"><MoreVertical className="w-4 h-4" /></Button>
                        </motion.div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Gerenciar etiquetas</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(contact)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
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
  );
}
