import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Users,
  Eye,
  Edit3,
  AtSign,
  Send,
  Clock,
  User,
  MessageSquare,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Viewer {
  id: string;
  name: string;
  avatar_url: string | null;
  is_typing: boolean;
  last_seen: Date;
}

interface InternalNote {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: Date;
  mentions: string[];
}

interface RealtimeCollaborationProps {
  contactId: string;
  className?: string;
}

// Hook to track who's viewing the conversation
function useConversationViewers(contactId: string) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<Viewer[]>([]);

  // Use Supabase Realtime Presence to track viewers
  useEffect(() => {
    if (!user?.id || !contactId) return;

    const channel = supabase.channel(`conversation:${contactId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presentViewers: Viewer[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== user.id && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as Record<string, unknown>;
            presentViewers.push({
              id: userId,
              name: (presence.name as string) || 'Agente',
              avatar_url: (presence.avatar_url as string) || null,
              is_typing: (presence.is_typing as boolean) || false,
              last_seen: new Date(),
            });
          }
        });
        
        setViewers(presentViewers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get current user's profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();

          await channel.track({
            name: profile?.name || 'Agente',
            avatar_url: profile?.avatar_url || null,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, user?.id]);
  
  return viewers;
}

// Viewers indicator component
function ViewersIndicator({ contactId }: { contactId: string }) {
  const viewers = useConversationViewers(contactId);
  const [isOpen, setIsOpen] = useState(false);
  
  if (viewers.length === 0) return null;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-8"
        >
          <div className="flex -space-x-2">
            {viewers.slice(0, 3).map((viewer) => (
              <Avatar key={viewer.id} className="w-6 h-6 border-2 border-background">
                <AvatarImage src={viewer.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20">
                  {viewer.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {viewers.length} visualizando
          </span>
          {viewers.some(v => v.is_typing) && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Edit3 className="w-3 h-3 mr-1" />
              Digitando...
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visualizando agora
          </h4>
          <div className="space-y-2">
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={viewer.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {viewer.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{viewer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {viewer.is_typing ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Edit3 className="w-3 h-3" />
                        Digitando...
                      </span>
                    ) : (
                      `Visto ${format(viewer.last_seen, 'HH:mm', { locale: ptBR })}`
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Mention input component
function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  
  // Fetch agents for mentions
  const { data: agents } = useQuery({
    queryKey: ['agents-for-mention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('is_active', true)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Check for @ mention trigger
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = newValue.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionFilter(afterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };
  
  const handleSelectMention = (agent: { id: string; name: string }) => {
    const lastAtIndex = value.lastIndexOf('@');
    const newValue = value.slice(0, lastAtIndex) + `@${agent.name} `;
    onChange(newValue);
    setShowMentions(false);
  };
  
  const filteredAgents = agents?.filter(a => 
    a.name.toLowerCase().includes(mentionFilter)
  ) || [];
  
  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="flex-1"
        />
        <Button onClick={onSubmit} disabled={disabled || !value.trim()} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      <AnimatePresence>
        {showMentions && filteredAgents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg overflow-hidden"
          >
            <ScrollArea className="max-h-48">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                  onClick={() => handleSelectMention(agent)}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={agent.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {agent.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{agent.name}</span>
                </button>
              ))}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Internal notes panel
function InternalNotesPanel({ contactId }: { contactId: string }) {
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: notes, isLoading } = useQuery({
    queryKey: ['internal-notes', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_notes')
        .select(`
          id,
          content,
          created_at,
          author:author_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');
      
      const { error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: contactId,
          content,
          author_id: profile.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes', contactId] });
      setNewNote('');
      toast.success('Nota adicionada!');
    },
    onError: () => {
      toast.error('Erro ao adicionar nota');
    },
  });
  
  const handleSubmit = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote);
    }
  };
  
  // Extract mentions from content
  const renderNoteContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <Badge key={i} variant="secondary" className="text-xs mx-0.5">
            {part}
          </Badge>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Notas Internas
          <Badge variant="secondary" className="ml-auto">
            {notes?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* Notes list */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma nota ainda</p>
              <p className="text-xs">Use @ para mencionar colegas</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              <AnimatePresence>
                {notes?.map((note: { id: string; content: string; created_at: string; author?: { name?: string; avatar_url?: string } }, index: number) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={note.author?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {note.author?.name?.substring(0, 2).toUpperCase() || 'NA'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {note.author?.name || 'Anônimo'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(note.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">
                      {renderNoteContent(note.content)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
        
        {/* Add note input */}
        <div className="pt-2 border-t">
          <MentionInput
            value={newNote}
            onChange={setNewNote}
            onSubmit={handleSubmit}
            placeholder="Adicionar nota... (@nome para mencionar)"
            disabled={addNoteMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Handoff dialog
function HandoffDialog({
  open,
  onOpenChange,
  contactId,
  onHandoff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onHandoff: (agentId: string, comment: string) => Promise<void>;
}) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: agents } = useQuery({
    queryKey: ['agents-for-handoff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });
  
  const handleSubmit = async () => {
    if (!selectedAgent) return;
    
    setIsSubmitting(true);
    try {
      await onHandoff(selectedAgent, comment);
      onOpenChange(false);
      setSelectedAgent(null);
      setComment('');
      toast.success('Conversa transferida com sucesso!');
    } catch {
      toast.error('Erro ao transferir conversa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Transferir Conversa
          </DialogTitle>
          <DialogDescription>
            Adicione um comentário para o próximo atendente
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Agent selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione o atendente</label>
            <ScrollArea className="h-48 border rounded-lg p-2">
              <div className="space-y-1">
                {agents?.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      selectedAgent === agent.id
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback>
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left text-sm">{agent.name}</span>
                    {selectedAgent === agent.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comentário (opcional)</label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Cliente precisa de suporte técnico"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedAgent || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main collaboration component
export function RealtimeCollaboration({ contactId, className }: RealtimeCollaborationProps) {
  const [handoffOpen, setHandoffOpen] = useState(false);
  
  const handleHandoff = async (agentId: string, comment: string) => {
    // In production, this would update the contact's assigned_to and add a note
    await supabase
      .from('contacts')
      .update({ assigned_to: agentId })
      .eq('id', contactId);
    
    if (comment) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profile) {
        await supabase
          .from('contact_notes')
          .insert({
            contact_id: contactId,
            author_id: profile.id,
            content: `Transferido: ${comment}`,
          });
      }
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Viewers indicator */}
      <div className="flex items-center justify-between">
        <ViewersIndicator contactId={contactId} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHandoffOpen(true)}
        >
          <Users className="w-4 h-4 mr-2" />
          Transferir
        </Button>
      </div>
      
      {/* Internal notes */}
      <InternalNotesPanel contactId={contactId} />
      
      {/* Handoff dialog */}
      <HandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        contactId={contactId}
        onHandoff={handleHandoff}
      />
    </div>
  );
}

export { ViewersIndicator, InternalNotesPanel, HandoffDialog };
