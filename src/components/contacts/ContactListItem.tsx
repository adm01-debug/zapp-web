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
  Building, Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';

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

interface ContactListItemProps {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onOpenChat: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  index: number;
}

export function ContactListItem({
  contact, isSelected, onToggleSelect, onOpenChat, onEdit, onDelete, index,
}: ContactListItemProps) {
  const typeConfig = CONTACT_TYPE_CONFIG[contact.contact_type || 'cliente'] || CONTACT_TYPE_CONFIG.cliente;
  const avatarColors = getAvatarColor(contact.name);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className={cn(
        "group flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30",
        "hover:bg-muted/30 hover:border-primary/15 transition-all duration-150 cursor-pointer",
        isSelected && "bg-primary/5 border-primary/30"
      )}
      onClick={() => onOpenChat(contact.id)}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(contact.id, !!checked)}
        />
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarImage src={contact.avatar_url || undefined} />
          <AvatarFallback className={cn('font-semibold text-sm', avatarColors.bg, avatarColors.text)}>
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
          typeConfig.dotBg
        )} />
      </div>

      {/* Name & type */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {contact.name} {contact.surname || ''}
          </h3>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-5 px-1.5 font-medium gap-1 shrink-0", typeConfig.badgeClass)}
          >
            {typeConfig.iconNode}
            {typeConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {contact.company && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building className="w-3 h-3" />
              {contact.company}
            </span>
          )}
          {contact.job_title && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="w-3 h-3" />
              {contact.job_title}
            </span>
          )}
        </div>
      </div>

      {/* Phone */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground min-w-[140px]">
        <Phone className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono text-[11px]">{contact.phone}</span>
      </div>

      {/* Email */}
      <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground min-w-[180px]">
        {contact.email ? (
          <>
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[11px]">{contact.email}</span>
          </>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Tags */}
      <div className="hidden lg:flex items-center gap-1 min-w-[120px]">
        {contact.tags?.slice(0, 2).map(tag => (
          <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5">
            {tag}
          </Badge>
        ))}
        {(contact.tags?.length || 0) > 2 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            +{(contact.tags?.length || 0) - 2}
          </Badge>
        )}
      </div>

      {/* Date */}
      <span className="hidden md:block text-[11px] text-muted-foreground shrink-0">
        {format(new Date(contact.created_at), "dd/MM/yy", { locale: ptBR })}
      </span>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-primary/10 hover:text-primary" onClick={() => onOpenChat(contact.id)} title="Conversar">
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-7 h-7">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              <Edit className="w-4 h-4 mr-2" />Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(contact)}>
              <Trash2 className="w-4 h-4 mr-2" />Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
