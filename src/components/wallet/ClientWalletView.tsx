import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ContextualEmptyState } from '@/components/ui/contextual-empty-states';
import { PageHeader } from '@/components/layout/PageHeader';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  Plus,
  Trash2,
  Users,
  Phone,
  ArrowUpDown,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WalletRule {
  id: string;
  name: string;
  agent_id: string;
  whatsapp_connection_id: string | null;
  priority: number;
  is_active: boolean;
  agent?: { name: string };
  connection?: { name: string; phone_number: string } | null;
}

interface Profile {
  id: string;
  name: string;
}

interface Connection {
  id: string;
  name: string;
  phone_number: string;
}

export function ClientWalletView() {
  const [rules, setRules] = useState<WalletRule[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    agent_id: '',
    whatsapp_connection_id: '',
    priority: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch wallet rules
    const { data: rulesData, error: rulesError } = await supabase
      .from('client_wallet_rules')
      .select('*')
      .order('priority', { ascending: false });

    if (!rulesError && rulesData) {
      // Fetch related data
      const agentIds = [...new Set(rulesData.map(r => r.agent_id))];
      const connectionIds = [...new Set(rulesData.map(r => r.whatsapp_connection_id).filter(Boolean))];
      
      const { data: agentsData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', agentIds);

      const { data: connectionsData } = connectionIds.length > 0 
        ? await supabase
            .from('whatsapp_connections')
            .select('id, name, phone_number')
            .in('id', connectionIds)
        : { data: [] };

      const enrichedRules = rulesData.map(rule => ({
        ...rule,
        agent: agentsData?.find(a => a.id === rule.agent_id),
        connection: connectionsData?.find(c => c.id === rule.whatsapp_connection_id),
      }));

      setRules(enrichedRules);
    }

    // Fetch all agents for dropdown
    const { data: allAgents } = await supabase
      .from('profiles')
      .select('id, name')
      .order('name');

    if (allAgents) {
      setAgents(allAgents);
    }

    // Fetch all connections for dropdown
    const { data: allConnections } = await supabase
      .from('whatsapp_connections')
      .select('id, name, phone_number')
      .order('name');

    if (allConnections) {
      setConnections(allConnections);
    }

    setLoading(false);
  };

  const handleAddRule = async () => {
    if (!newRule.name || !newRule.agent_id) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e selecione um vendedor.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('client_wallet_rules').insert({
      name: newRule.name,
      agent_id: newRule.agent_id,
      whatsapp_connection_id: newRule.whatsapp_connection_id || null,
      priority: newRule.priority,
    });

    if (error) {
      toast({
        title: 'Erro ao criar regra',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Regra criada!', description: 'A regra de carteira foi adicionada.' });
      setIsAddDialogOpen(false);
      setNewRule({ name: '', agent_id: '', whatsapp_connection_id: '', priority: 0 });
      fetchData();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('client_wallet_rules')
      .update({ is_active: isActive })
      .eq('id', id);

    if (!error) {
      setRules(rules.map(r => r.id === id ? { ...r, is_active: isActive } : r));
    }
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase
      .from('client_wallet_rules')
      .delete()
      .eq('id', id);

    if (!error) {
      setRules(rules.filter(r => r.id !== id));
      toast({ title: 'Regra excluída', description: 'A regra foi removida com sucesso.' });
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-whatsapp" />
            Carteira de Clientes
          </h1>
          <p className="text-muted-foreground">
            Configure regras para atribuição automática de clientes aos vendedores
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Regra de Carteira</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Regra</Label>
                <Input
                  placeholder="Ex: Vendas - Principal"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select
                  value={newRule.agent_id}
                  onValueChange={(v) => setNewRule({ ...newRule, agent_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conexão WhatsApp (opcional)</Label>
                <Select
                  value={newRule.whatsapp_connection_id}
                  onValueChange={(v) => setNewRule({ ...newRule, whatsapp_connection_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as conexões" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as conexões</SelectItem>
                    {connections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name} ({conn.phone_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se definido, apenas clientes dessa conexão serão atribuídos.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Maior prioridade = processada primeiro
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddRule} className="bg-whatsapp hover:bg-whatsapp-dark">
                  Criar Regra
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Regras Ativas', value: rules.filter(r => r.is_active).length, icon: UserCheck, color: 'text-status-online' },
          { label: 'Total de Regras', value: rules.length, icon: ArrowUpDown, color: 'text-primary' },
          { label: 'Vendedores', value: agents.length, icon: Users, color: 'text-whatsapp' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border border-secondary/20 bg-card card-glow-purple">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rules Table */}
      <Card className="border border-secondary/20 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Regras de Atribuição</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhuma regra configurada"
              description="Configure regras para atribuir clientes automaticamente aos vendedores certos"
              illustration="wallet"
              size="sm"
              actionLabel="Criar Primeira Regra"
              onAction={() => setIsAddDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.agent?.name || '-'}</TableCell>
                    <TableCell>
                      {rule.connection ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {rule.connection.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Quando um novo contato chega, o sistema verifica as regras na ordem de prioridade.</p>
          <p>• Se uma regra corresponde à conexão WhatsApp do contato, ele é atribuído ao vendedor.</p>
          <p>• Regras com "Todas as conexões" funcionam como fallback.</p>
          <p>• Contatos já atribuídos não são reatribuídos automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
