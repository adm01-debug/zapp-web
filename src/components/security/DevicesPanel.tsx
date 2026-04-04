import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Monitor, 
  Globe, 
  Clock, 
  Trash2, 
  Shield, 
  ShieldCheck,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function DevicesPanel() {
  const { 
    devices, 
    sessions, 
    loading, 
    currentDeviceId,
    trustDevice, 
    removeDevice, 
    endSession,
    endAllOtherSessions 
  } = useDeviceDetection();

  const [processingDevice, setProcessingDevice] = useState<string | null>(null);
  const [processingSession, setProcessingSession] = useState<string | null>(null);

  const handleTrustDevice = async (deviceId: string) => {
    setProcessingDevice(deviceId);
    try {
      await trustDevice(deviceId);
      toast.success('Dispositivo marcado como confiável');
    } catch (error) {
      toast.error('Erro ao confiar no dispositivo');
    } finally {
      setProcessingDevice(null);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setProcessingDevice(deviceId);
    try {
      await removeDevice(deviceId);
      toast.success('Dispositivo removido');
    } catch (error) {
      toast.error('Erro ao remover dispositivo');
    } finally {
      setProcessingDevice(null);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setProcessingSession(sessionId);
    try {
      await endSession(sessionId);
      toast.success('Sessão encerrada');
    } catch (error) {
      toast.error('Erro ao encerrar sessão');
    } finally {
      setProcessingSession(null);
    }
  };

  const handleEndAllOtherSessions = async () => {
    try {
      await endAllOtherSessions();
      toast.success('Todas as outras sessões foram encerradas');
    } catch (error) {
      toast.error('Erro ao encerrar sessões');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Sessões Ativas
              </CardTitle>
              <CardDescription>
                Sessões atualmente conectadas à sua conta
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Encerrar outras
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar outras sessões?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso desconectará todos os outros dispositivos da sua conta. 
                      Você precisará fazer login novamente nesses dispositivos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndAllOtherSessions} className="bg-destructive hover:bg-destructive">
                      Encerrar sessões
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Monitor className="w-12 h-12 text-muted-foreground mb-3" />
              <h4 className="font-medium">Nenhuma sessão ativa</h4>
              <p className="text-sm text-muted-foreground">
                Suas sessões aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isCurrentSession = session.device_id === currentDeviceId;
                const device = devices.find(d => d.id === session.device_id);
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isCurrentSession ? 'border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isCurrentSession ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Monitor className={`w-5 h-5 ${isCurrentSession ? 'text-primary' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {device?.device_name || 'Dispositivo desconhecido'}
                          </h4>
                          {isCurrentSession && (
                            <Badge className="bg-primary">Sessão atual</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {device?.browser} · {device?.os}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Globe className="w-3 h-3" />
                          {session.ip_address}
                          <span>·</span>
                          <Clock className="w-3 h-3" />
                          Ativa {formatDistanceToNow(new Date(session.started_at), { 
                            addSuffix: false, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                    {!isCurrentSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleEndSession(session.id)}
                        disabled={processingSession === session.id}
                      >
                        {processingSession === session.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <LogOut className="w-4 h-4 mr-2" />
                            Encerrar
                          </>
                        )}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Dispositivos Registrados
          </CardTitle>
          <CardDescription>
            Dispositivos que já acessaram sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Smartphone className="w-12 h-12 text-muted-foreground mb-3" />
              <h4 className="font-medium">Nenhum dispositivo registrado</h4>
              <p className="text-sm text-muted-foreground">
                Seus dispositivos aparecerão aqui após o login
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const isCurrentDevice = device.id === currentDeviceId;
                const isMobile = device.os?.toLowerCase().includes('mobile') || 
                                 device.os?.toLowerCase().includes('android') || 
                                 device.os?.toLowerCase().includes('ios');
                
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${
                      isCurrentDevice ? 'border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isCurrentDevice ? 'bg-primary/10' : 'bg-muted'}`}>
                          {isMobile ? (
                            <Smartphone className={`w-5 h-5 ${isCurrentDevice ? 'text-primary' : ''}`} />
                          ) : (
                            <Monitor className={`w-5 h-5 ${isCurrentDevice ? 'text-primary' : ''}`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{device.device_name || 'Dispositivo'}</h4>
                            {isCurrentDevice && (
                              <Badge className="bg-primary">Este dispositivo</Badge>
                            )}
                            {device.is_trusted && (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Confiável
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {device.browser} · {device.os}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {device.ip_address}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Último acesso: {formatDistanceToNow(new Date(device.last_seen_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!device.is_trusted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTrustDevice(device.id)}
                            disabled={processingDevice === device.id}
                          >
                            {processingDevice === device.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Confiar
                              </>
                            )}
                          </Button>
                        )}
                        {!isCurrentDevice && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover dispositivo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá o dispositivo da lista e encerrará todas as sessões 
                                  associadas. O dispositivo será tratado como novo no próximo login.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRemoveDevice(device.id)}
                                  className="bg-destructive hover:bg-destructive"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-info/5 border-info/20">
        <CardContent className="flex items-start gap-4 p-4">
          <AlertCircle className="w-5 h-5 text-info mt-0.5" />
          <div>
            <h4 className="font-medium text-info">Dica de Segurança</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Marque seus dispositivos pessoais como "confiáveis" para não receber alertas 
              de segurança a cada login. Remova dispositivos que você não reconhece imediatamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
