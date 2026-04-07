import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { toast } from 'sonner';
import { useActionFeedback } from '@/hooks/useActionFeedback';

export interface WhatsAppGroup {
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

export interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  instance_id: string;
}

export const GROUP_CATEGORIES = [
  { value: 'orcamentos', label: 'Orçamentos | Fornecedores', color: 'text-info', icon: '📋' },
  { value: 'aprovacao', label: 'Aprovação | Fornecedores', color: 'text-success', icon: '✅' },
  { value: 'os', label: 'O.S. | Fornecedores', color: 'text-warning', icon: '🔧' },
  { value: 'acerto', label: 'Acerto | Fornecedores', color: 'text-secondary', icon: '🤝' },
] as const;

export function useGroupsManager() {
  const feedback = useActionFeedback();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

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

        const apiGroups = Array.isArray(data) ? data : (data?.data || data?.groups || []);

        for (const g of apiGroups) {
          const groupJid = g.id || g.jid || g.groupJid;
          const groupName = g.subject || g.name || 'Grupo sem nome';
          const participantCount = g.size || g.participants?.length || 0;
          const groupDesc = g.desc || g.description || null;
          const isAdmin = g.announce === true || g.iAmAdmin === true;

          if (!groupJid) continue;

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

  const handleAddGroup = async (newGroup: {
    name: string;
    group_id: string;
    description: string;
    whatsapp_connection_id: string;
    category: string;
  }) => {
    if (!newGroup.name || !newGroup.group_id) {
      feedback.warning('Preencha os campos obrigatórios');
      return false;
    }

    let success = false;
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
          success = true;
          fetchGroups();
        },
      }
    );
    return success;
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

  const handleBroadcast = async (broadcastMessage: string) => {
    if (!broadcastMessage.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    const groupsToSend = groups.filter(g => selectedGroups.has(g.id));
    if (groupsToSend.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

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

        if (groupsToSend.indexOf(group) < groupsToSend.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch {
        failed++;
      }
    }

    setSelectedGroups(new Set());

    if (failed > 0) {
      toast.warning(`Enviado para ${sent} grupo(s), ${failed} falha(s)`);
    } else {
      toast.success(`Mensagem enviada para ${sent} grupo(s)!`);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.group_id.includes(search);
    const matchesCategory = !categoryFilter ||
      (categoryFilter === 'sem_categoria' ? !group.category : group.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const selectAllGroups = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleCategoryChange = async (groupId: string, category: string | null) => {
    const { error } = await supabase
      .from('whatsapp_groups')
      .update({ category })
      .eq('id', groupId);

    if (error) {
      toast.error('Erro ao atualizar categoria');
    } else {
      toast.success('Categoria atualizada');
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

  return {
    groups,
    connections,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    isLoading,
    isSyncing,
    selectedGroups,
    filteredGroups,
    handleAutoSync,
    handleAddGroup,
    handleDeleteGroup,
    handleBroadcast,
    toggleGroupSelection,
    selectAllGroups,
    handleCategoryChange,
    getConnectionName,
  };
}
