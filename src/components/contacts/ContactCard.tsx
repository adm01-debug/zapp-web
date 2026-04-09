import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MessageSquare, Edit, Trash2, MoreVertical, Phone, Mail,
  Building, Briefcase, Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getContactTypeInfo } from '@/utils/whatsappFileTypes';
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

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onOpenChat: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  index: number;
}

export function ContactCard({
  contact, isSelected, onToggleSelect, onOpenChat, onEdit, onDelete, index,
}: ContactCardProps) {
  const typeConfig = CONTACT_TYPE_CONFIG[contact.contact_type || 'cliente'] || CONTACT_TYPE_CONFIG.cliente;
  const avatarColors = getAvatarColor(contact.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "group relative rounded-2xl border border-border/40 bg-card hover:bg-muted/30",
        "transition-all duration-200 cursor-pointer overflow-hidden",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        isSelected && "ring-2 ring-primary/50 border-primary/30 bg-primary/5"
      )}
      onClick={() => onOpenChat(contact.id)}
    >
      {/* Top accent bar */}
      <div className={cn("h-1 w-full", typeConfig.gradient)} />

      {/* Selection checkbox */}
      <div
        className={cn(
          "absolute top-3 left-3 z-10 transition-opacity duration-150",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(contact.id, !!checked)}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* Actions dropdown */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-7 h-7 bg-background/60 backdrop-blur-sm hover:bg-background/90">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onOpenChat(contact.id)}>
              <MessageSquare className="w-4 h-4 mr-2" />Conversar
            </DropdownMenuItem>
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

      <div className="p-5 pt-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-background shadow-md">
              <AvatarImage src={contact.avatar_url || undefined} />
              <AvatarFallback className={cn('font-bold text-sm', avatarColors.bg, avatarColors.text)}>
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            {/* Type indicator dot */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
              typeConfig.dotBg
            )}>
              <span className="text-[8px] text-white">{typeConfig.icon}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
              {contact.name} {contact.surname || ''}
            </h3>
            {contact.nickname && (
              <p className="text-xs text-muted-foreground truncate">({contact.nickname})</p>
            )}
            <Badge
              variant="outline"
              className={cn("mt-1 text-[10px] h-5 px-1.5 font-medium gap-1", typeConfig.badgeClass)}
            >
              {typeConfig.iconNode}
              {typeConfig.label}
            </Badge>
          </div>
        </div>

        {/* Company & Job */}
        {(contact.company || contact.job_title) && (
          <div className="bg-muted/40 rounded-xl p-2.5 space-y-1">
            {contact.company && (
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
            {contact.job_title && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Briefcase className="w-3 h-3 shrink-0" />
                <span className="truncate">{contact.job_title}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-[11px] truncate">{contact.phone}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px]">{contact.email}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md">
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md">
                +{contact.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(contact.created_at), "dd MMM yyyy", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
              onClick={() => onOpenChat(contact.id)}
              title="Conversar"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 hover:bg-muted"
              onClick={() => onEdit(contact)}
              title="Editar"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
