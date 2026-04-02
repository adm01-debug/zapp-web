import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useVoipContext } from '@/contexts/VoipContext';
import { toast } from '@/hooks/use-toast';
import {
  Phone,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function VoipSettings() {
  const {
    isReady,
    connections,
    selectedConnectionId,
    setSelectedConnectionId,
    fetchConnections,
  } = useVoipContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [micTest, setMicTest] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    fetchConnections().then(() => setLoading(false));
  }, [fetchConnections]);

  // Enumerate audio devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
    }).catch(() => {
      // Permission not yet granted - will update after mic test
    });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
    toast({ title: 'Conexões atualizadas!' });
  };

  const handleMicTest = async () => {
    if (micTest) {
      setMicTest(false);
      setMicLevel(0);
      return;
    }

    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      setMicTest(true);

      // Re-enumerate devices after permission is granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animationId: number;

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setMicLevel(avg / 255);
        animationId = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        cancelAnimationFrame(animationId);
        stream.getTracks().forEach(t => t.stop());
        audioContext.close();
        setMicTest(false);
        setMicLevel(0);
      }, 10000);
    } catch {
      setMicError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setMicTest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-status-online';
      case 'connecting': return 'bg-status-away';
      case 'disconnected': return 'bg-status-offline';
      default: return 'bg-muted-foreground';
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
      {/* Connection Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                VoIP - Chamadas WhatsApp
              </CardTitle>
              <CardDescription>
                Selecione a conexão WhatsApp para realizar e receber chamadas de voz.
                As chamadas são feitas diretamente pela sua instância WhatsApp conectada.
              </CardDescription>
            </div>
            <Badge variant={isReady ? 'default' : 'secondary'} className="gap-1">
              {isReady ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isReady ? 'Pronto' : 'Não inicializado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <WifiOff className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conexão WhatsApp ativa encontrada.
              </p>
              <p className="text-xs text-muted-foreground">
                Conecte uma instância WhatsApp na aba "Conexões" para habilitar chamadas.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Conexão para chamadas</Label>
                <Select
                  value={selectedConnectionId || undefined}
                  onValueChange={setSelectedConnectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conexão..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', getStatusColor(conn.status))} />
                          <span>{conn.instance_name}</span>
                          {conn.phone_number && (
                            <span className="text-muted-foreground text-xs">({conn.phone_number})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Connection list */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Conexões disponíveis</Label>
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border border-border/30',
                      conn.id === selectedConnectionId ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                    )}
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(conn.status))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{conn.instance_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{conn.status}</span>
                        {conn.phone_number && (
                          <span className="text-xs text-muted-foreground">| {conn.phone_number}</span>
                        )}
                      </div>
                    </div>
                    {conn.id === selectedConnectionId && (
                      <Badge variant="outline" className="text-xs">Selecionada</Badge>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar Conexões
          </Button>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Configurações de Áudio
          </CardTitle>
          <CardDescription>
            Teste seu microfone e verifique os dispositivos de áudio disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio devices */}
          {audioDevices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Microfones detectados</Label>
              {audioDevices.map((device, i) => (
                <div key={device.deviceId || i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mic className="w-3.5 h-3.5" />
                  <span>{device.label || `Microfone ${i + 1}`}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mic test */}
          <div className="space-y-2">
            <Button
              variant={micTest ? 'destructive' : 'outline'}
              onClick={handleMicTest}
            >
              {micTest ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Parar Teste
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Testar Microfone
                </>
              )}
            </Button>

            {micTest && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-whatsapp transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {Math.round(micLevel * 100)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fale no microfone para ver o nível de áudio (teste de 10s)
                </p>
              </div>
            )}

            {micError && (
              <p className="text-sm text-destructive">{micError}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
