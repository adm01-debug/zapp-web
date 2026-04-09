import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageSquare, Phone, Users, UserCheck, Truck, Wrench,
  Star, Handshake, MoreHorizontal, GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';

interface KanbanContact {
  id: string;
  name: string;
  surname?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  avatar_url?: string | null;
  contact_type?: string | null;
  tags?: string[] | null;
}

interface ContactKanbanViewProps {
  contacts: KanbanContact[];
  onContactClick: (id: string) => void;
}

const KANBAN_COLUMNS = [
  { type: 'lead', label: 'Leads', color: 'hsl(38, 92%, 50%)', icon: Star },
  { type: 'cliente', label: 'Clientes', color: 'hsl(217, 91%, 60%)', icon: Users },
  { type: 'fornecedor', label: 'Fornecedores', color: 'hsl(270, 60%, 60%)', icon: Truck },
  { type: 'parceiro', label: 'Parceiros', color: 'hsl(142, 71%, 45%)', icon: Handshake },
  { type: 'colaborador', label: 'Colaboradores', color: 'hsl(190, 70%, 50%)', icon: UserCheck },
  { type: 'prestador_servico', label: 'Prestadores', color: 'hsl(340, 65%, 55%)', icon: Wrench },
];

export function ContactKanbanView({ contacts, onContactClick }: ContactKanbanViewProps) {
  const columns = useMemo(() => {
    const grouped: Record<string, KanbanContact[]> = {};
    KANBAN_COLUMNS.forEach(col => { grouped[col.type] = []; });
    grouped['outros'] = [];

    contacts.forEach(c => {
      const type = c.contact_type || 'cliente';
      if (grouped[type]) {
        grouped[type].push(c);
      } else {
        grouped['outros'].push(c);
      }
    });

    return KANBAN_COLUMNS.map(col => ({
      ...col,
      contacts: grouped[col.type] || [],
    })).filter(col => col.contacts.length > 0);
  }, [contacts]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map((column, colIndex) => {
        const Icon = column.icon;
        return (
          <motion.div
            key={column.type}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: colIndex * 0.08 }}
            className="flex-shrink-0 w-[280px]"
          >
            <Card className="border-border/40 h-full">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${column.color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: column.color }} />
                    </div>
                    {column.label}
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {column.contacts.length}
                  </Badge>
                </CardTitle>
                {/* Color bar */}
                <div className="h-0.5 rounded-full mt-2" style={{ backgroundColor: column.color, opacity: 0.4 }} />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {column.contacts.map((contact, i) => {
                        const colors = getAvatarColor(contact.name);
                        return (
                          <motion.button
                            key={contact.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => onContactClick(contact.id)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border border-border/30",
                              "bg-card hover:bg-muted/40 hover:border-primary/20",
                              "transition-all duration-150 cursor-pointer group"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={contact.avatar_url || undefined} />
                                <AvatarFallback className={cn(colors.bg, colors.text, 'text-[10px] font-bold')}>
                                  {getInitials(contact.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate text-foreground">
                                  {contact.name} {contact.surname || ''}
                                </p>
                                {contact.company && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {contact.company}
                                  </p>
                                )}
                              </div>
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {contact.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
