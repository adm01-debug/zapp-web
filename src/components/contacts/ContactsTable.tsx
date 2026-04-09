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
  Briefcase, Calendar, Tag, Users, Truck, UserCheck,
  Wrench, Star, Handshake, MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';
import { CompanyLogo } from './CompanyLogo';
import { HighlightText } from './HighlightText';
import type { Contact } from './types';
import type { CRMBatchResult } from '@/hooks/useExternalContact360Batch';

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

interface ContactsTableProps {
  contacts: Contact[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onOpenChat: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  getCRMData?: (phone: string) => CRMBatchResult | undefined;
  searchQuery?: string;
}

export function ContactsTable({
  contacts, selectedIds, onSelectIds, onOpenChat, onEdit, onDelete, getCRMData, searchQuery,
}: ContactsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/30">
      <table className="w-full" role="grid" aria-label="Lista de contatos">
        <thead>
          <tr className="border-b border-border/20 bg-muted/20">
            <th className="p-3 w-10">
              <Checkbox
                checked={selectedIds.length === contacts.length && contacts.length > 0}
                onCheckedChange={(checked) => onSelectIds(checked ? contacts.map(c => c.id) : [])}
                aria-label="Selecionar todos"
              />
            </th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contato</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Telefone</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Empresa/Cargo</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etiquetas</th>
            <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Criado em</th>
            <th className="text-right p-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact, index) => {
            const typeConfig = CONTACT_TYPE_CONFIG[contact.contact_type || 'cliente'] || CONTACT_TYPE_CONFIG.cliente;
            const avatarColors = getAvatarColor(contact.name);
            const crmData = getCRMData?.(contact.phone);
            return (
              <motion.tr
                key={contact.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.015 }}
                className={cn(
                  "border-b border-border/10 last:border-0 hover:bg-muted/30 transition-all duration-150 cursor-pointer group",
                  selectedIds.includes(contact.id) && "bg-primary/5 border-l-2 border-l-primary"
                )}
                onClick={() => onOpenChat(contact.id)}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={(checked) =>
                      onSelectIds(checked ? [...selectedIds, contact.id] : selectedIds.filter(id => id !== contact.id))
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={contact.avatar_url || undefined} />
                        <AvatarFallback className={cn('font-semibold text-xs', avatarColors.bg, avatarColors.text)}>
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                        typeConfig.dotBg
                      )} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm block truncate">{contact.name} {contact.surname || ''}</span>
                      {contact.nickname && <span className="text-[11px] text-muted-foreground">({contact.nickname})</span>}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] h-5 px-1.5 font-medium gap-1", typeConfig.badgeClass)}
                  >
                    {typeConfig.iconNode}
                    {typeConfig.label}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[11px]">{contact.phone}</span>
                  </div>
                </td>
                <td className="p-3">
                  {contact.email ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[160px] text-[11px]">{contact.email}</span>
                    </div>
                  ) : <span className="text-muted-foreground/30">—</span>}
                </td>
                <td className="p-3">
                  {(contact.company || contact.job_title) ? (
                    <div className="space-y-0.5">
                      {contact.company && (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <CompanyLogo
                            logoUrl={crmData?.logo_url}
                            companyName={crmData?.company_name}
                            fallbackCompanyName={contact.company}
                            size="xs"
                          />
                          <span className="truncate max-w-[140px]">{crmData?.company_name || contact.company}</span>
                        </div>
                      )}
                      {contact.job_title && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Briefcase className="w-3 h-3" />{contact.job_title}
                        </div>
                      )}
                    </div>
                  ) : <span className="text-muted-foreground/30">—</span>}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5">{tag}</Badge>
                    ))}
                    {(contact.tags?.length || 0) > 2 && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">+{(contact.tags?.length || 0) - 2}</Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-primary/10 hover:text-primary" onClick={() => onOpenChat(contact.id)} title="Conversar">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
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
