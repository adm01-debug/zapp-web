import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { log } from '@/lib/logger';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  MoreVertical,
  Trash2,
  RefreshCw,
  Shield,
  Link as LinkIcon,
  Loader2,
  Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface WhatsAppGroup {
  id: string;
  whatsapp_connection_id: string | null;
  group_id: string;
  name: string;
  description: string | null;
  participant_count: number;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  category: string | null;
}

const GROUP_CATEGORIES = [
  { value: 'orcamentos', label: 'Orçamentos | Fornecedores', color: 'text-blue-500', icon: '📋' },
  { value: 'aprovacao', label: 'Aprovação | Fornecedores', color: 'text-emerald-500', icon: '✅' },
  { value: 'os', label: 'O.S. | Fornecedores', color: 'text-orange-500', icon: '🔧' },
  { value: 'acerto', label: 'Acerto | Fornecedores', color: 'text-purple-500', icon: '🤝' },
] as const;

interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  instance_id: string;
}

export function GroupsView() {
  const feedback = useActionFeedback();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    group_id: '',
    description: '',
    whatsapp_connection_id: '',
    category: '',
  });

  useEffect(() => {
    fetchGroups();
    fetchConnections();
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar grupos');
      log.error('Error fetching groups:', error);
    } else {
      setGroups(data || []);
    }
    setIsLoading(false);
  };

  const fetchConnections = async () => {
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('id, name, phone_number, instance_id')
      .order('name', { ascending: true });

    if (error) {
      log.error('Error fetching connections:', error);
    } else {
      setConnections(data || []);
    }
  };

  // =============================================
  // AUTO-SYNC: Fetch groups from all active connections via Evolution API
  // =============================================
  const handleAutoSync = useCallback(async () => {
    if (connections.length === 0) {
      toast.error('Nenhuma conexão WhatsApp configurada');
      return;
    }

    setIsSyncing(true);
    let totalSynced = 0;
    let totalErrors = 0;

    for (const conn of connections) {
      if (!conn.instance_id) continue;

      try {
        const { data, error } = await supabase.functions.invoke('evolution-api', {
          body: { action: 'list-groups', instanceName: conn.instance_id, getParticipants: 'false' },
        });

        if (error) {
          log.error(`Error syncing groups for ${conn.name}:`, error);
          totalErrors++;
          continue;
        }

        // Evolution API returns array of groups
        const apiGroups = Array.isArray(data) ? data : (data?.data || data?.groups || []);

        for (const g of apiGroups) {
          const groupJid = g.id || g.jid || g.groupJid;
          const groupName = g.subject || g.name || 'Grupo sem nome';
          const participantCount = g.size || g.participants?.length || 0;
          const groupDesc = g.desc || g.description || null;
          const isAdmin = g.announce === true || g.iAmAdmin === true;

          if (!groupJid) continue;

          // Upsert: update if exists, insert if not
          const { error: upsertError } = await supabase
            .from('whatsapp_groups')
            .upsert(
              {
                group_id: groupJid,
                name: groupName,
                description: groupDesc,
                participant_count: participantCount,
                is_admin: isAdmin,
                whatsapp_connection_id: conn.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'group_id' }
            );

          if (upsertError) {
            log.error(`Error upserting group ${groupJid}:`, upsertError);
          } else {
            totalSynced++;
          }
        }
      } catch (err) {
        log.error(`Sync error for connection ${conn.name}:`, err);
        totalErrors++;
      }
    }

    setIsSyncing(false);
    await fetchGroups();

    if (totalErrors > 0) {
      toast.warning(`Sincronização parcial: ${totalSynced} grupos sincronizados, ${totalErrors} conexão(ões) com erro`);
    } else {
      toast.success(`${totalSynced} grupo(s) sincronizados com sucesso!`);
    }
  }, [connections]);

  const handleAddGroup = async () => {
    if (!newGroup.name || !newGroup.group_id) {
      feedback.warning('Preencha os campos obrigatórios');
      return;
    }

    await feedback.withFeedback(
      async () => {
        const { error } = await supabase.from('whatsapp_groups').insert({
          name: newGroup.name,
          group_id: newGroup.group_id,
          description: newGroup.description || null,
          whatsapp_connection_id: newGroup.whatsapp_connection_id || null,
          category: newGroup.category || null,
        });
        if (error) throw error;
      },
      {
        loadingMessage: 'Adicionando grupo...',
        successMessage: 'Grupo adicionado com sucesso!',
        errorMessage: 'Erro ao adicionar grupo',
        onSuccess: () => {
          setNewGroup({ name: '', group_id: '', description: '', whatsapp_connection_id: '', category: '' });
          setIsAddDialogOpen(false);
          fetchGroups();
        },
      }
    );
  };

  const handleDeleteGroup = async (id: string) => {
    await feedback.withFeedback(
      async () => {
        const { error } = await supabase.from('whatsapp_groups').delete().eq('id', id);
        if (error) throw error;
      },
      {
        loadingMessage: 'Excluindo grupo...',
        successMessage: 'Grupo excluído com sucesso!',
        errorMessage: 'Erro ao excluir grupo',
        onSuccess: () => fetchGroups(),
      }
    );
  };

  // =============================================
  // BROADCAST: Send message to selected groups
  // =============================================
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    const groupsToSend = groups.filter(g => selectedGroups.has(g.id));
    if (groupsToSend.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setIsSending(true);
    let sent = 0;
    let failed = 0;

    for (const group of groupsToSend) {
      const conn = connections.find(c => c.id === group.whatsapp_connection_id);
      if (!conn?.instance_id) {
        failed++;
        continue;
      }

      try {
        const { error } = await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'send-text',
            instanceName: conn.instance_id,
            number: group.group_id,
            text: broadcastMessage,
          },
        });

        if (error) {
          failed++;
        } else {
          sent++;
        }

        // Rate limiting: wait between sends
        if (groupsToSend.indexOf(group) < groupsToSend.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch {
        failed++;
      }
    }

    setIsSending(false);
    setIsBroadcastOpen(false);
    setBroadcastMessage('');
    setSelectedGroups(new Set());

    if (failed > 0) {
      toast.warning(`Enviado para ${sent} grupo(s), ${failed} falha(s)`);
    } else {
      toast.success(`Mensagem enviada para ${sent} grupo(s)!`);
    }
  };

  const filteredGroups = groups.filter(
    (group) => {
      const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase()) ||
        group.group_id.includes(search);
      const matchesCategory = !categoryFilter || 
        (categoryFilter === 'sem_categoria' ? !group.category : group.category === categoryFilter);
      return matchesSearch && matchesCategory;
    }
  );

  const handleCategoryChange = async (groupId: string, category: string | null) => {
    const { error } = await supabase
      .from('whatsapp_groups')
      .update({ category })
      .eq('id', groupId);

    if (error) {
      toast.error('Erro ao atualizar categoria');
    } else {
      toast.success('Categoria atualizada');
      // Also update the corresponding contact's group_category
      const group = groups.find(g => g.id === groupId);
      if (group) {
        await supabase
          .from('contacts')
          .update({ group_category: category })
          .like('phone', `%${group.group_id.replace('@g.us', '')}%`);
      }
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, category } : g));
    }
  };

  const getConnectionName = (connectionId: string | null) => {
    if (!connectionId) return 'Não vinculado';
    const connection = connections.find((c) => c.id === connectionId);
    return connection ? connection.name : 'Desconhecido';
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      <PageHeader
        title="Grupos WhatsApp"
        subtitle={`Gerencie seus grupos (${groups.length} grupos)`}
        breadcrumbs={[
          { label: 'Gestão' },
          { label: 'Grupos' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {selectedGroups.size > 0 && (
              <Button
                variant="default"
                onClick={() => setIsBroadcastOpen(true)}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar para {selectedGroups.size} grupo(s)
              </Button>
            )}
            <Button variant="outline" onClick={handleAutoSync} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-whatsapp hover:bg-whatsapp-dark text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_name">Nome do Grupo *</Label>
                    <Input
                      id="group_name"
                      placeholder="Nome do grupo"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group_id">ID do Grupo *</Label>
                    <Input
                      id="group_id"
                      placeholder="Ex: 5511999999999-1234567890@g.us"
                      value={newGroup.group_id}
                      onChange={(e) => setNewGroup({ ...newGroup, group_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="Descrição do grupo"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="connection">Conexão WhatsApp</Label>
                    <Select
                      value={newGroup.whatsapp_connection_id}
                      onValueChange={(value) =>
                        setNewGroup({ ...newGroup, whatsapp_connection_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conexão" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id}>
                            {conn.name} ({conn.phone_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={newGroup.category}
                      onValueChange={(value) =>
                        setNewGroup({ ...newGroup, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddGroup} className="bg-whatsapp hover:bg-whatsapp-dark">
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Search + Select All */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou ID do grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {GROUP_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                </span>
              </SelectItem>
            ))}
            <SelectItem value="sem_categoria">Sem categoria</SelectItem>
          </SelectContent>
        </Select>
        {filteredGroups.length > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllGroups}>
            {selectedGroups.size === filteredGroups.length ? 'Desselecionar todos' : 'Selecionar todos'}
          </Button>
        )}
      </motion.div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title={search ? 'Nenhum grupo encontrado' : 'Nenhum grupo cadastrado'}
              description={
                search
                  ? 'Tente ajustar o termo de busca'
                  : 'Clique em "Sincronizar" para importar grupos automaticamente ou adicione manualmente'
              }
              illustration="contacts"
              actionLabel={!search ? 'Sincronizar Grupos' : undefined}
              onAction={!search ? handleAutoSync : undefined}
              secondaryActionLabel={search ? 'Limpar busca' : undefined}
              onSecondaryAction={search ? () => setSearch('') : undefined}
            />
          </div>
        ) : (
          filteredGroups.map((group, index) => {
            const isSelected = selectedGroups.has(group.id);
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                      : 'border-secondary/20 bg-card hover:border-secondary/40 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.2)]'
                  }`}
                  onClick={() => toggleGroupSelection(group.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={group.avatar_url || undefined} />
                          <AvatarFallback className="bg-whatsapp/10 text-whatsapp">
                            <Users className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base line-clamp-1">{group.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {group.participant_count} participantes
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroups(new Set([group.id]));
                            setIsBroadcastOpen(true);
                          }}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Enviar mensagem
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(group.group_id);
                            toast.success('ID copiado!');
                          }}>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Copiar ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        {getConnectionName(group.whatsapp_connection_id)}
                      </Badge>
                      {group.is_admin && (
                        <Badge className="bg-whatsapp/10 text-whatsapp border-whatsapp/20 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    {/* Category selector */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={group.category || 'none'}
                        onValueChange={(v) => handleCategoryChange(group.id, v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          {GROUP_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <span className="flex items-center gap-1.5">
                                <span>{cat.icon}</span>
                                {cat.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={group.group_id}>
                      ID: {group.group_id}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Broadcast Dialog */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Enviar Mensagem em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <strong>{selectedGroups.size}</strong> grupo(s) selecionado(s)
              <div className="mt-1 text-xs text-muted-foreground">
                {groups
                  .filter(g => selectedGroups.has(g.id))
                  .map(g => g.name)
                  .slice(0, 5)
                  .join(', ')}
                {selectedGroups.size > 5 && ` e mais ${selectedGroups.size - 5}...`}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Digite a mensagem para enviar a todos os grupos selecionados..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={5}
              />
            </div>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
              ⚠️ Intervalo de 2 segundos entre envios para evitar bloqueios.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleBroadcast}
                disabled={isSending || !broadcastMessage.trim()}
                className="bg-whatsapp hover:bg-whatsapp-dark gap-2"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
