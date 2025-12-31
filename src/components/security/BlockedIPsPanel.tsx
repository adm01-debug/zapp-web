import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Plus, Trash2, Clock, Globe, Loader2, Search, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  request_count: number;
  last_attempt_at: string | null;
}

export function BlockedIPsPanel() {
  const { user } = useAuth();
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [ipToRemove, setIpToRemove] = useState<BlockedIP | null>(null);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [duration, setDuration] = useState('60'); // minutes

  const fetchBlockedIPs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false });

    if (!error && data) {
      setBlockedIPs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const handleBlockIP = async () => {
    if (!newIP.trim() || !reason.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIP)) {
      toast.error('Formato de IP inválido');
      return;
    }

    setUpdating(true);
    const expiresAt = isPermanent 
      ? null 
      : new Date(Date.now() + parseInt(duration) * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: newIP,
        reason,
        is_permanent: isPermanent,
        expires_at: expiresAt,
        blocked_by: user?.id
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Este IP já está bloqueado');
      } else {
        toast.error('Erro ao bloquear IP');
      }
    } else {
      toast.success('IP bloqueado com sucesso');
      setShowAddDialog(false);
      resetForm();
      fetchBlockedIPs();
    }
    setUpdating(false);
  };

  const handleUnblockIP = async () => {
    if (!ipToRemove) return;

    setUpdating(true);
    const { error } = await supabase
      .from('blocked_ips')
      .delete()
      .eq('id', ipToRemove.id);

    if (error) {
      toast.error('Erro ao desbloquear IP');
    } else {
      toast.success('IP desbloqueado');
      setIpToRemove(null);
      fetchBlockedIPs();
    }
    setUpdating(false);
  };

  const resetForm = () => {
    setNewIP('');
    setReason('');
    setIsPermanent(false);
    setDuration('60');
  };

  const filteredIPs = blockedIPs.filter(ip =>
    ip.ip_address.includes(search) ||
    ip.reason.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle>IPs Bloqueados</CardTitle>
                <CardDescription>
                  Gerencie endereços IP bloqueados do sistema
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Bloquear IP
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por IP ou motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhum IP bloqueado</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredIPs.map((ip) => (
                  <motion.div
                    key={ip.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isExpired(ip.expires_at) ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-medium">{ip.ip_address}</code>
                          {ip.is_permanent ? (
                            <Badge variant="destructive">Permanente</Badge>
                          ) : isExpired(ip.expires_at) ? (
                            <Badge variant="secondary">Expirado</Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Expira {formatDistanceToNow(new Date(ip.expires_at!), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{ip.reason}</p>
                        {ip.request_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {ip.request_count} tentativas desde o bloqueio
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIpToRemove(ip)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add IP Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear IP</DialogTitle>
            <DialogDescription>
              Adicione um endereço IP à lista de bloqueio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ip">Endereço IP</Label>
              <Input
                id="ip"
                placeholder="192.168.1.1"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                placeholder="Ex: Tentativas de força bruta"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="permanent">Bloqueio permanente</Label>
              <Switch
                id="permanent"
                checked={isPermanent}
                onCheckedChange={setIsPermanent}
              />
            </div>

            {!isPermanent && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBlockIP} disabled={updating}>
              {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation */}
      <AlertDialog open={!!ipToRemove} onOpenChange={() => setIpToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear IP?</AlertDialogTitle>
            <AlertDialogDescription>
              O IP <code className="font-mono">{ipToRemove?.ip_address}</code> poderá acessar o sistema novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockIP} disabled={updating}>
              {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
