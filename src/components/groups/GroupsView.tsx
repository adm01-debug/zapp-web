import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
}

export function GroupsView() {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    group_id: '',
    description: '',
    whatsapp_connection_id: '',
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
      console.error(error);
    } else {
      setGroups(data || []);
    }
    setIsLoading(false);
  };

  const fetchConnections = async () => {
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('id, name, phone_number')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setConnections(data || []);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroup.name || !newGroup.group_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const { error } = await supabase.from('whatsapp_groups').insert({
      name: newGroup.name,
      group_id: newGroup.group_id,
      description: newGroup.description || null,
      whatsapp_connection_id: newGroup.whatsapp_connection_id || null,
    });

    if (error) {
      toast.error('Erro ao adicionar grupo');
      console.error(error);
    } else {
      toast.success('Grupo adicionado com sucesso');
      setNewGroup({ name: '', group_id: '', description: '', whatsapp_connection_id: '' });
      setIsAddDialogOpen(false);
      fetchGroups();
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const { error } = await supabase.from('whatsapp_groups').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir grupo');
      console.error(error);
    } else {
      toast.success('Grupo excluído');
      fetchGroups();
    }
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      group.group_id.includes(search)
  );

  const getConnectionName = (connectionId: string | null) => {
    if (!connectionId) return 'Não vinculado';
    const connection = connections.find((c) => c.id === connectionId);
    return connection ? connection.name : 'Desconhecido';
  };

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
          <h1 className="text-2xl font-bold text-foreground">Grupos WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie seus grupos ({groups.length} grupos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={fetchGroups} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </motion.div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Grupo
                </Button>
              </motion.div>
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
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou ID do grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum grupo encontrado</p>
          </div>
        ) : (
          filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:border-whatsapp/50 transition-colors">
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
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Enviar mensagem
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteGroup(group.id)}
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
                  <p className="text-xs text-muted-foreground truncate" title={group.group_id}>
                    ID: {group.group_id}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
