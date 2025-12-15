import { useState, useEffect } from 'react';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Smartphone,
  Plus,
  MoreVertical,
  RefreshCw,
  Trash2,
  Copy,
  Edit,
  QrCode,
  Wifi,
  WifiOff,
  Settings,
  MessageSquare,
  Facebook,
  Instagram,
  Star,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BusinessHoursDialog } from './BusinessHoursDialog';
import { BusinessHoursIndicator } from './BusinessHoursIndicator';

interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  instance_id: string | null;
  status: string;
  qr_code: string | null;
  is_default: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  connected: {
    label: 'Conectado',
    color: 'bg-status-online',
    icon: Wifi,
  },
  disconnected: {
    label: 'Desconectado',
    color: 'bg-status-offline',
    icon: WifiOff,
  },
  connecting: {
    label: 'Conectando...',
    color: 'bg-status-away',
    icon: RefreshCw,
  },
  qr_pending: {
    label: 'Aguardando QR',
    color: 'bg-status-away',
    icon: QrCode,
  },
};

export function ConnectionsView() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState({ name: '', phone_number: '' });
  const [businessHoursDialog, setBusinessHoursDialog] = useState<{
    open: boolean;
    connectionId: string;
    connectionName: string;
  }>({ open: false, connectionId: '', connectionName: '' });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setConnections(data);
    }
    setLoading(false);
  };

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.phone_number) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e o número do telefone.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('whatsapp_connections').insert({
      name: newConnection.name,
      phone_number: newConnection.phone_number,
      status: 'disconnected',
      is_default: connections.length === 0,
    });

    if (error) {
      toast({
        title: 'Erro ao adicionar conexão',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Conexão adicionada!', description: 'A conexão foi criada com sucesso.' });
      setIsAddDialogOpen(false);
      setNewConnection({ name: '', phone_number: '' });
      fetchConnections();
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: 'ID copiado!',
      description: 'O ID da conexão foi copiado para a área de transferência.',
    });
  };

  const handleReconnect = async (id: string) => {
    await supabase.from('whatsapp_connections').update({ status: 'connecting' }).eq('id', id);
    setConnections(connections.map((conn) => conn.id === id ? { ...conn, status: 'connecting' } : conn));
    
    // Simulate reconnection (in real app, this would call Evolution API)
    setTimeout(async () => {
      await supabase.from('whatsapp_connections').update({ status: 'connected' }).eq('id', id);
      setConnections((prev) => prev.map((conn) => conn.id === id ? { ...conn, status: 'connected' } : conn));
      toast({
        title: 'Reconectado!',
        description: 'A conexão foi restabelecida com sucesso.',
      });
    }, 2000);
  };

  const handleSetDefault = async (id: string) => {
    // Remove default from all others
    await supabase.from('whatsapp_connections').update({ is_default: false }).neq('id', id);
    // Set this one as default
    await supabase.from('whatsapp_connections').update({ is_default: true }).eq('id', id);
    
    setConnections(connections.map((conn) => ({ ...conn, is_default: conn.id === id })));
    toast({ title: 'Conexão padrão atualizada' });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('whatsapp_connections').delete().eq('id', id);
    if (!error) {
      setConnections(connections.filter((conn) => conn.id !== id));
      toast({
        title: 'Conexão removida',
        description: 'A conexão foi excluída com sucesso.',
      });
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between relative z-10"
      >
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl font-bold text-foreground neon-underline"
          >
            Conexões WhatsApp
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-muted-foreground"
          >
            Gerencie múltiplas conexões WhatsApp para sua equipe
          </motion.p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Conexão</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Conexão</Label>
                <Input
                  placeholder="Ex: WhatsApp Vendas"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input
                  placeholder="+55 11 99999-0000"
                  value={newConnection.phone_number}
                  onChange={(e) => setNewConnection({ ...newConnection, phone_number: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddConnection} className="bg-whatsapp hover:bg-whatsapp-dark">
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* QR Code Dialog */}
      <Dialog open={!!showQrCode} onOpenChange={() => setShowQrCode(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-64 h-64 mx-auto bg-white rounded-xl p-4 flex items-center justify-center"
            >
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjEyMCIgeT0iMjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjIwIiB5PSIxMjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzAwMCIvPjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMTMwIiB5PSIzMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMzAiIHk9IjEzMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSIxNDAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48cmVjdCB4PSI0MCIgeT0iMTQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] bg-contain bg-center bg-no-repeat" />
            </motion.div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>1. Abra o WhatsApp no seu celular</p>
              <p>2. Toque em <strong>Menu</strong> ou <strong>Configurações</strong></p>
              <p>3. Toque em <strong>Aparelhos conectados</strong></p>
              <p>4. Toque em <strong>Conectar um aparelho</strong></p>
              <p>5. Aponte seu celular para esta tela</p>
            </div>
            <Button variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Gerar novo código
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Conexões', value: connections.length, color: 'text-primary' },
          { label: 'Conectadas', value: connections.filter((c) => c.status === 'connected').length, color: 'text-status-online' },
          { label: 'Desconectadas', value: connections.filter((c) => c.status === 'disconnected').length, color: 'text-status-offline' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border border-secondary/20 bg-card card-glow-purple">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando conexões...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground mb-4">
              Adicione sua primeira conexão WhatsApp para começar a atender.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-whatsapp hover:bg-whatsapp-dark">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <StaggeredList className="space-y-4">
          {connections.map((connection) => {
            const status = statusConfig[connection.status] || statusConfig.disconnected;
            const StatusIcon = status.icon;

            return (
              <StaggeredItem key={connection.id}>
                <motion.div
                  whileHover={{ y: -2, boxShadow: '0 8px 30px hsl(var(--primary) / 0.1)' }}
                >
                  <Card className="border border-secondary/20 bg-card hover:border-secondary/40 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <motion.div
                            animate={connection.status === 'connecting' ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: connection.status === 'connecting' ? Infinity : 0, ease: 'linear' }}
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              connection.status === 'connected' ? 'bg-whatsapp/10' : 'bg-muted'
                            )}
                          >
                            <Smartphone
                              className={cn(
                                'w-6 h-6',
                                connection.status === 'connected' ? 'text-whatsapp' : 'text-muted-foreground'
                              )}
                            />
                          </motion.div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{connection.name}</h3>
                              {connection.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Padrão
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  connection.status === 'connected' && 'border-status-online text-status-online',
                                  connection.status === 'disconnected' && 'border-status-offline text-status-offline',
                                  (connection.status === 'connecting' || connection.status === 'qr_pending') && 'border-status-away text-status-away'
                                )}
                              >
                                <StatusIcon className={cn('w-3 h-3 mr-1', connection.status === 'connecting' && 'animate-spin')} />
                                {status.label}
                              </Badge>
                              <BusinessHoursIndicator connectionId={connection.id} />
                            </div>
                            <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: <code className="bg-muted px-1 rounded">{connection.id.slice(0, 8)}...</code>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyId(connection.id)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar ID
                            </Button>
                          </motion.div>

                          {connection.status === 'disconnected' && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReconnect(connection.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reconectar
                              </Button>
                            </motion.div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSetDefault(connection.id)}>
                                <Star className="w-4 h-4 mr-2" />
                                Definir como padrão
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowQrCode(connection.id)}>
                                <QrCode className="w-4 h-4 mr-2" />
                                Gerar QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setBusinessHoursDialog({
                                open: true,
                                connectionId: connection.id,
                                connectionName: connection.name,
                              })}>
                                <Clock className="w-4 h-4 mr-2" />
                                Horário de Atendimento
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(connection.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggeredItem>
            );
          })}
        </StaggeredList>
      )}

      {/* Business Hours Dialog */}
      <BusinessHoursDialog
        open={businessHoursDialog.open}
        onOpenChange={(open) => setBusinessHoursDialog((prev) => ({ ...prev, open }))}
        connectionId={businessHoursDialog.connectionId}
        connectionName={businessHoursDialog.connectionName}
      />
    </div>
  );
}
