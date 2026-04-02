import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWavoipContext } from '@/contexts/WavoipContext';
import { toast } from '@/hooks/use-toast';
import {
  Phone,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WavoipSettings() {
  const {
    isConnected,
    devices,
    connectWithTokens,
    disconnect,
    fetchTokens,
    saveTokens,
  } = useWavoipContext();

  const [tokens, setTokens] = useState<string[]>([]);
  const [newToken, setNewToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTokens().then((t) => {
      setTokens(t);
      setLoading(false);
    });
  }, [fetchTokens]);

  const addToken = () => {
    const trimmed = newToken.trim();
    if (!trimmed) return;
    if (tokens.includes(trimmed)) {
      toast({ title: 'Token já adicionado', variant: 'destructive' });
      return;
    }
    setTokens((prev) => [...prev, trimmed]);
    setNewToken('');
  };

  const removeToken = (index: number) => {
    setTokens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveTokens(tokens);
    setSaving(false);

    if (success) {
      toast({ title: 'Tokens salvos com sucesso!' });
      // Reconnect with new tokens
      disconnect();
      if (tokens.length > 0) {
        connectWithTokens(tokens);
      }
    } else {
      toast({ title: 'Erro ao salvar tokens', variant: 'destructive' });
    }
  };

  const handleReconnect = () => {
    disconnect();
    if (tokens.length > 0) {
      connectWithTokens(tokens);
      toast({ title: 'Reconectando...' });
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'open': return 'bg-status-online';
      case 'connecting': return 'bg-status-away';
      case 'disconnected':
      case 'close': return 'bg-status-offline';
      case 'error': return 'bg-destructive';
      case 'hibernating': return 'bg-muted-foreground';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'open': return 'Conectado';
      case 'UP': return 'Ativo';
      case 'connecting': return 'Conectando';
      case 'disconnected': return 'Desconectado';
      case 'close': return 'Fechado';
      case 'error': return 'Erro';
      case 'restarting': return 'Reiniciando';
      case 'hibernating': return 'Hibernando';
      case 'BUILDING': return 'Construindo';
      case 'WAITING_PAYMENT': return 'Aguardando pagamento';
      default: return status || 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Wavoip - Chamadas WhatsApp
              </CardTitle>
              <CardDescription>
                Configure os tokens dos dispositivos Wavoip para realizar e receber chamadas de voz via WhatsApp.
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new token */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="wavoip-token" className="sr-only">Token do dispositivo</Label>
              <Input
                id="wavoip-token"
                placeholder="Cole o token do dispositivo Wavoip..."
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToken()}
              />
            </div>
            <Button onClick={addToken} disabled={!newToken.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {/* Token list */}
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum token configurado. Adicione tokens de dispositivos Wavoip para habilitar chamadas.
            </p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token, index) => {
                const device = devices.find((d) => d.token === token);
                return (
                  <div
                    key={token}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(device?.status || null))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{token.slice(0, 20)}...{token.slice(-8)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {getStatusLabel(device?.status || null)}
                        </span>
                        {device?.phone && (
                          <span className="text-xs text-muted-foreground">
                            | {device.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => removeToken(index)}
                      aria-label={`Remover token ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Tokens
            </Button>
            {isConnected && (
              <Button variant="outline" onClick={handleReconnect}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Devices info */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispositivos Conectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((device) => (
                <div
                  key={device.token}
                  className="p-3 rounded-lg border border-border/30 bg-card"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(device.status))} />
                    <span className="text-sm font-medium">{getStatusLabel(device.status)}</span>
                  </div>
                  {device.phone && (
                    <p className="text-sm text-muted-foreground mt-1">{device.phone}</p>
                  )}
                  <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                    {device.token.slice(0, 16)}...
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
