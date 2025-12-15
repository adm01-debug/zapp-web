import { useState } from 'react';
import { motion, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhatsAppInstance } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

// Mock connections data
const mockConnections: WhatsAppInstance[] = [
  {
    id: 'conn-1',
    name: 'WhatsApp Principal',
    phone: '+55 11 99999-0001',
    status: 'connected',
  },
  {
    id: 'conn-2',
    name: 'WhatsApp Vendas',
    phone: '+55 11 99999-0002',
    status: 'disconnected',
  },
  {
    id: 'conn-3',
    name: 'WhatsApp Suporte',
    phone: '+55 11 99999-0003',
    status: 'connecting',
  },
];

const statusConfig = {
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
};

export function ConnectionsView() {
  const [connections, setConnections] = useState<WhatsAppInstance[]>(mockConnections);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: 'ID copiado!',
      description: 'O ID da conexão foi copiado para a área de transferência.',
    });
  };

  const handleReconnect = (id: string) => {
    setConnections(
      connections.map((conn) =>
        conn.id === id ? { ...conn, status: 'connecting' as const } : conn
      )
    );
    // Simulate reconnection
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === id ? { ...conn, status: 'connected' as const } : conn
        )
      );
      toast({
        title: 'Reconectado!',
        description: 'A conexão foi restabelecida com sucesso.',
      });
    }, 2000);
  };

  const handleDelete = (id: string) => {
    setConnections(connections.filter((conn) => conn.id !== id));
    toast({
      title: 'Conexão removida',
      description: 'A conexão foi excluída com sucesso.',
    });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com WhatsApp e outros canais
          </p>
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
              <p className="text-sm text-muted-foreground">
                Selecione o tipo de conexão que deseja adicionar:
              </p>
              <div className="grid grid-cols-1 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowQrCode('new')}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-whatsapp hover:bg-whatsapp/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-whatsapp/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-whatsapp" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp Business</p>
                    <p className="text-sm text-muted-foreground">Conecte via QR Code</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left opacity-50"
                  disabled
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Facebook className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Facebook Messenger</p>
                    <p className="text-sm text-muted-foreground">Em breve</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-pink-500 hover:bg-pink-500/5 transition-all text-left opacity-50"
                  disabled
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium">Instagram Direct</p>
                    <p className="text-sm text-muted-foreground">Em breve</p>
                  </div>
                </motion.button>
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
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Connections List */}
      <StaggeredList className="space-y-4">
        {connections.map((connection) => {
          const status = statusConfig[connection.status];
          const StatusIcon = status.icon;

          return (
            <StaggeredItem key={connection.id}>
              <motion.div
                whileHover={{ y: -2, boxShadow: '0 8px 30px hsl(var(--primary) / 0.1)' }}
              >
                <Card>
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
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                connection.status === 'connected' && 'border-status-online text-status-online',
                                connection.status === 'disconnected' && 'border-status-offline text-status-offline',
                                connection.status === 'connecting' && 'border-status-away text-status-away'
                              )}
                            >
                              <StatusIcon className={cn('w-3 h-3 mr-1', connection.status === 'connecting' && 'animate-spin')} />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{connection.phone}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: <code className="bg-muted px-1 rounded">{connection.id}</code>
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
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              Configurar Chatbot
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <QrCode className="w-4 h-4 mr-2" />
                              Gerar QR Code
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
    </div>
  );
}
