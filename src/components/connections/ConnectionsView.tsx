import { useState, useEffect, useCallback } from 'react';
import { log } from '@/lib/logger';
import { PageHeader } from '@/components/layout/PageHeader';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { EmptyState } from '@/components/ui/empty-state';
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
  DialogDescription,
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
  QrCode,
  Wifi,
  WifiOff,
  Star,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
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
  pending: {
    label: 'Aguardando QR',
    color: 'bg-status-away',
    icon: QrCode,
  },
};

export function ConnectionsView() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState<{
    open: boolean;
    connectionId: string;
    connectionName: string;
    qrCode: string | null;
    status: 'loading' | 'pending' | 'connected' | 'error';
    errorMessage?: string;
  }>({ open: false, connectionId: '', connectionName: '', qrCode: null, status: 'loading' });
  const [newConnection, setNewConnection] = useState({ name: '', phone_number: '' });
  const [businessHoursDialog, setBusinessHoursDialog] = useState<{
    open: boolean;
    connectionId: string;
    connectionName: string;
  }>({ open: false, connectionId: '', connectionName: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const { 
    isLoading: evolutionLoading, 
    createInstance, 
    connectInstance, 
    getInstanceStatus,
    disconnectInstance,
    deleteInstance,
  } = useEvolutionApi();

  useEffect(() => {
    fetchConnections();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('whatsapp-connections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
        },
        (payload) => {
          log.debug('Connection update:', payload);
          if (payload.eventType === 'UPDATE') {
            setConnections((prev) =>
              prev.map((conn) =>
                conn.id === (payload.new as WhatsAppConnection).id
                  ? (payload.new as WhatsAppConnection)
                  : conn
              )
            );
            // Update QR dialog if open
            if (qrCodeDialog.open && qrCodeDialog.connectionId === (payload.new as WhatsAppConnection).id) {
              const newConn = payload.new as WhatsAppConnection;
              if (newConn.status === 'connected') {
                setQrCodeDialog((prev) => ({ ...prev, status: 'connected', qrCode: null }));
              } else if (newConn.qr_code) {
                setQrCodeDialog((prev) => ({ ...prev, qrCode: newConn.qr_code, status: 'pending' }));
              }
            }
          } else if (payload.eventType === 'INSERT') {
            setConnections((prev) => [payload.new as WhatsAppConnection, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setConnections((prev) => prev.filter((conn) => conn.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) clearInterval(pollingInterval);
    };
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

  const generateInstanceName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30) + '_' + Date.now().toString().slice(-6);
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

    setIsCreating(true);
    const instanceName = generateInstanceName(newConnection.name);

    try {
      // Create Evolution API instance
      await createInstance({ instanceName });

      // Save to database
      const { data, error } = await supabase.from('whatsapp_connections').insert({
        name: newConnection.name,
        phone_number: newConnection.phone_number,
        instance_id: instanceName,
        status: 'disconnected',
        is_default: connections.length === 0,
      }).select().single();

      if (error) throw error;

      toast({ 
        title: 'Conexão criada!', 
        description: 'Agora conecte escaneando o QR Code.' 
      });
      setIsAddDialogOpen(false);
      setNewConnection({ name: '', phone_number: '' });

      // Open QR dialog automatically
      if (data) {
        handleShowQrCode(data);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Error creating connection:', error);
      toast({
        title: 'Erro ao criar conexão',
        description: errorMessage || 'Verifique se a Evolution API está configurada corretamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowQrCode = async (connection: WhatsAppConnection) => {
    if (!connection.instance_id) {
      toast({
        title: 'Erro',
        description: 'Esta conexão não possui uma instância configurada.',
        variant: 'destructive',
      });
      return;
    }

    setQrCodeDialog({
      open: true,
      connectionId: connection.id,
      connectionName: connection.name,
      qrCode: connection.qr_code,
      status: connection.status === 'connected' ? 'connected' : 'loading',
    });

    if (connection.status !== 'connected') {
      try {
        const result = await connectInstance(connection.instance_id);
        
        if (result?.qrcode?.base64) {
          setQrCodeDialog((prev) => ({
            ...prev,
            qrCode: result.qrcode.base64,
            status: 'pending',
          }));
        }

        // Start polling for status
        startStatusPolling(connection.instance_id, connection.id);
      } catch (error: unknown) {
        setQrCodeDialog((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Erro ao gerar QR Code',
        }));
      }
    }
  };

  const startStatusPolling = useCallback((instanceName: string, connectionId: string) => {
    if (pollingInterval) clearInterval(pollingInterval);

    const interval = setInterval(async () => {
      try {
        const result = await getInstanceStatus(instanceName);
        
        if (result?.state === 'open' || result?.status === 'connected') {
          clearInterval(interval);
          setPollingInterval(null);
          setQrCodeDialog((prev) => ({
            ...prev,
            status: 'connected',
            qrCode: null,
          }));
          toast({
            title: 'Conectado!',
            description: 'WhatsApp conectado com sucesso.',
          });
        }
      } catch (error) {
        log.error('Status polling error:', error);
      }
    }, 3000);

    setPollingInterval(interval);
  }, [getInstanceStatus, pollingInterval]);

  const handleRefreshQrCode = async () => {
    const connection = connections.find((c) => c.id === qrCodeDialog.connectionId);
    if (!connection?.instance_id) return;

    setQrCodeDialog((prev) => ({ ...prev, status: 'loading', qrCode: null }));

    try {
      const result = await connectInstance(connection.instance_id);
      
      if (result?.qrcode?.base64) {
        setQrCodeDialog((prev) => ({
          ...prev,
          qrCode: result.qrcode.base64,
          status: 'pending',
        }));
      }
    } catch (error: unknown) {
      setQrCodeDialog((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erro ao atualizar QR Code',
      }));
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: 'ID copiado!',
      description: 'O ID da conexão foi copiado para a área de transferência.',
    });
  };

  const handleReconnect = async (connection: WhatsAppConnection) => {
    if (!connection.instance_id) {
      toast({
        title: 'Erro',
        description: 'Esta conexão não possui uma instância configurada.',
        variant: 'destructive',
      });
      return;
    }

    handleShowQrCode(connection);
  };

  const handleDisconnect = async (connection: WhatsAppConnection) => {
    if (!connection.instance_id) return;

    try {
      await disconnectInstance(connection.instance_id);
      await supabase
        .from('whatsapp_connections')
        .update({ status: 'disconnected', qr_code: null })
        .eq('id', connection.id);
    } catch (error: unknown) {
      toast({
        title: 'Erro ao desconectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('whatsapp_connections').update({ is_default: false }).neq('id', id);
    await supabase.from('whatsapp_connections').update({ is_default: true }).eq('id', id);
    
    setConnections(connections.map((conn) => ({ ...conn, is_default: conn.id === id })));
    toast({ title: 'Conexão padrão atualizada' });
  };

  const handleDelete = async (connection: WhatsAppConnection) => {
    try {
      // Delete Evolution instance if exists
      if (connection.instance_id) {
        await deleteInstance(connection.instance_id).catch(() => {});
      }

      const { error } = await supabase.from('whatsapp_connections').delete().eq('id', connection.id);
      if (!error) {
        setConnections(connections.filter((conn) => conn.id !== connection.id));
        toast({
          title: 'Conexão removida',
          description: 'A conexão foi excluída com sucesso.',
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Erro ao excluir',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const closeQrDialog = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setQrCodeDialog({ open: false, connectionId: '', connectionName: '', qrCode: null, status: 'loading' });
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
            Gerencie múltiplas conexões WhatsApp via Evolution API
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
              <DialogDescription>
                Crie uma nova instância para conectar ao WhatsApp
              </DialogDescription>
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isCreating}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddConnection} 
                  className="bg-whatsapp hover:bg-whatsapp-dark"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* QR Code Dialog */}
      <Dialog open={qrCodeDialog.open} onOpenChange={(open) => !open && closeQrDialog()}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              {qrCodeDialog.status === 'connected' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-status-online" />
                  Conectado!
                </>
              ) : qrCodeDialog.status === 'error' ? (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  Erro
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  Escanear QR Code - {qrCodeDialog.connectionName}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            {qrCodeDialog.status === 'loading' && (
              <div className="w-64 h-64 mx-auto bg-muted rounded-xl flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              </div>
            )}

            {qrCodeDialog.status === 'pending' && qrCodeDialog.qrCode && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-64 h-64 mx-auto bg-white rounded-xl p-2 flex items-center justify-center"
              >
                <img 
                  src={qrCodeDialog.qrCode.startsWith('data:') 
                    ? qrCodeDialog.qrCode 
                    : `data:image/png;base64,${qrCodeDialog.qrCode}`} 
                  alt="QR Code" 
                  className="w-full h-full object-contain"
                />
              </motion.div>
            )}

            {qrCodeDialog.status === 'connected' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-64 h-64 mx-auto bg-status-online/10 rounded-xl flex flex-col items-center justify-center"
              >
                <CheckCircle2 className="w-20 h-20 text-status-online mb-4" />
                <p className="text-lg font-medium text-status-online">WhatsApp Conectado!</p>
              </motion.div>
            )}

            {qrCodeDialog.status === 'error' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-64 h-64 mx-auto bg-destructive/10 rounded-xl flex flex-col items-center justify-center p-4"
              >
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <p className="text-sm text-destructive text-center">{qrCodeDialog.errorMessage}</p>
              </motion.div>
            )}

            {qrCodeDialog.status === 'pending' && (
              <>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. Abra o WhatsApp no seu celular</p>
                  <p>2. Toque em <strong>Menu</strong> ou <strong>Configurações</strong></p>
                  <p>3. Toque em <strong>Aparelhos conectados</strong></p>
                  <p>4. Toque em <strong>Conectar um aparelho</strong></p>
                  <p>5. Aponte seu celular para esta tela</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Aguardando conexão...
                </div>
              </>
            )}

            {(qrCodeDialog.status === 'pending' || qrCodeDialog.status === 'error') && (
              <Button 
                variant="outline" 
                onClick={handleRefreshQrCode}
                disabled={evolutionLoading}
              >
                {evolutionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Gerar novo código
              </Button>
            )}

            {qrCodeDialog.status === 'connected' && (
              <Button onClick={closeQrDialog}>
                Fechar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Conexões', value: connections.length, color: 'text-primary' },
          { label: 'Conectadas', value: connections.filter((c) => c.status === 'connected').length, color: 'text-status-online' },
          { label: 'Desconectadas', value: connections.filter((c) => c.status !== 'connected').length, color: 'text-status-offline' },
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
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando conexões...
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="Nenhuma conexão configurada"
          description="Adicione sua primeira conexão WhatsApp para começar a atender seus clientes."
          illustration="inbox"
          actionLabel="Adicionar Conexão"
          onAction={() => setIsAddDialogOpen(true)}
        />
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
                                  connection.status !== 'connected' && connection.status !== 'pending' && 'border-status-offline text-status-offline',
                                  connection.status === 'pending' && 'border-status-away text-status-away'
                                )}
                              >
                                <StatusIcon className={cn('w-3 h-3 mr-1', connection.status === 'connecting' && 'animate-spin')} />
                                {status.label}
                              </Badge>
                              <BusinessHoursIndicator connectionId={connection.id} />
                            </div>
                            <p className="text-sm text-muted-foreground">{connection.phone_number}</p>
                            {connection.instance_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Instância: <code className="bg-muted px-1 rounded">{connection.instance_id}</code>
                              </p>
                            )}
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

                          {connection.status !== 'connected' && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShowQrCode(connection)}
                                className="border-whatsapp text-whatsapp hover:bg-whatsapp hover:text-white"
                              >
                                <QrCode className="w-4 h-4 mr-2" />
                                Conectar
                              </Button>
                            </motion.div>
                          )}

                          {connection.status === 'connected' && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect(connection)}
                              >
                                <WifiOff className="w-4 h-4 mr-2" />
                                Desconectar
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
                              <DropdownMenuItem onClick={() => handleShowQrCode(connection)}>
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
                                onClick={() => handleDelete(connection)}
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
