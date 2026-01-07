import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { 
  Forward, Search, Users, User, Check, X, 
  MessageSquare, Phone, Send, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Message } from '@/types/chat';

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar_url?: string;
}

interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  participant_count: number;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  onForward: (targetIds: string[], targetType: 'contact' | 'group') => void;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  onForward,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  // Fetch contacts and groups
  useEffect(() => {
    if (open) {
      fetchContacts();
      fetchGroups();
    }
  }, [open]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone, avatar_url')
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      log.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('id, name, avatar_url, participant_count')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      log.error('Error fetching groups:', error);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleForward = async () => {
    const hasSelectedContacts = selectedContacts.length > 0;
    const hasSelectedGroups = selectedGroups.length > 0;

    if (!hasSelectedContacts && !hasSelectedGroups) {
      toast({
        title: 'Selecione destinatários',
        description: 'Escolha pelo menos um contato ou grupo para encaminhar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Forward to contacts
      if (hasSelectedContacts) {
        onForward(selectedContacts, 'contact');
      }
      
      // Forward to groups
      if (hasSelectedGroups) {
        onForward(selectedGroups, 'group');
      }

      const totalTargets = selectedContacts.length + selectedGroups.length;
      toast({
        title: 'Mensagem encaminhada!',
        description: `Encaminhada para ${totalTargets} ${totalTargets === 1 ? 'destinatário' : 'destinatários'}.`,
      });

      // Reset and close
      setSelectedContacts([]);
      setSelectedGroups([]);
      setSearchQuery('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao encaminhar',
        description: 'Não foi possível encaminhar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedContacts([]);
    setSelectedGroups([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  const totalSelected = selectedContacts.length + selectedGroups.length;

  const truncateMessage = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-primary" />
            Encaminhar Mensagem
          </DialogTitle>
          <DialogDescription>
            Selecione contatos ou grupos para encaminhar
          </DialogDescription>
        </DialogHeader>

        {/* Message Preview */}
        {message && (
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">
                  {message.type === 'image' && '📷 Imagem'}
                  {message.type === 'audio' && '🎤 Áudio'}
                  {message.type === 'video' && '🎬 Vídeo'}
                  {message.type === 'document' && '📄 Documento'}
                  {(message.type === 'text' || message.type === 'interactive') && 
                    truncateMessage(message.content)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos ou grupos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contacts' | 'groups')} className="px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts" className="gap-2">
              <User className="w-4 h-4" />
              Contatos
              {selectedContacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                  {selectedContacts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="w-4 h-4" />
              Grupos
              {selectedGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                  {selectedGroups.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-2">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum contato encontrado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence>
                    {filteredContacts.map((contact, index) => {
                      const isSelected = selectedContacts.includes(contact.id);
                      
                      return (
                        <motion.button
                          key={contact.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => toggleContact(contact.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                            isSelected 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/80 border border-transparent"
                          )}
                        >
                          <Checkbox 
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="mt-2">
            <ScrollArea className="h-[300px]">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum grupo encontrado</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence>
                    {filteredGroups.map((group, index) => {
                      const isSelected = selectedGroups.includes(group.id);
                      
                      return (
                        <motion.button
                          key={group.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => toggleGroup(group.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                            isSelected 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/80 border border-transparent"
                          )}
                        >
                          <Checkbox 
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={group.avatar_url} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              <Users className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.participant_count} participantes
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Selected count and actions */}
        <DialogFooter className="p-4 pt-3 border-t border-border flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalSelected > 0 ? (
              <span className="text-foreground font-medium">
                {totalSelected} {totalSelected === 1 ? 'selecionado' : 'selecionados'}
              </span>
            ) : (
              'Selecione destinatários'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleForward} 
              disabled={totalSelected === 0 || isSending}
              className="gap-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Encaminhar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
