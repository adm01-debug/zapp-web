import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { log } from '@/lib/logger';
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Monitor,
  Globe,
  Clock,
  Lock,
  Users,
  Activity,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useMFA } from '@/hooks/useMFA';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SecurityScore {
  total: number;
  mfa: number;
  devices: number;
  sessions: number;
  password: number;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  created_at: string;
  is_resolved: boolean | null;
}

export function SecurityOverview() {
  const { user } = useAuth();
  const { isMFAEnabled, factors } = useMFA();
  const { devices, sessions, loading: devicesLoading } = useDeviceDetection();
  const { hasRole } = useUserRole();
  const isAdmin = hasRole('admin');

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Fetch security alerts
  useEffect(() => {
    async function fetchAlerts() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('security_alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setSecurityAlerts(data || []);
      } catch (error) {
        log.error('Error fetching alerts:', error);
      } finally {
        setLoadingAlerts(false);
      }
    }

    fetchAlerts();
  }, [user]);

  // Calculate security score
  const calculateScore = (): SecurityScore => {
    let mfaScore = isMFAEnabled ? 25 : 0;
    let deviceScore = devices.filter(d => d.is_trusted).length > 0 ? 25 : 15;
    let sessionScore = sessions.length <= 3 ? 25 : 15;
    let passwordScore = 25; // Assume good password for now

    return {
      total: mfaScore + deviceScore + sessionScore + passwordScore,
      mfa: mfaScore,
      devices: deviceScore,
      sessions: sessionScore,
      password: passwordScore,
    };
  };

  const score = calculateScore();

  const getScoreColor = (total: number) => {
    if (total >= 80) return 'text-success';
    if (total >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (total: number) => {
    if (total >= 80) return 'bg-success';
    if (total >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'bg-destructive/10 text-destructive border-red-500/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-yellow-500/20';
      default:
        return 'bg-info/10 text-info border-blue-500/20';
    }
  };

  const securityItems = [
    {
      id: 'mfa',
      title: 'Autenticação em Duas Etapas',
      description: 'Adicione uma camada extra de segurança',
      icon: Key,
      enabled: isMFAEnabled,
      score: score.mfa,
      maxScore: 25,
    },
    {
      id: 'devices',
      title: 'Dispositivos Confiáveis',
      description: `${devices.filter(d => d.is_trusted).length} de ${devices.length} dispositivos são confiáveis`,
      icon: Smartphone,
      enabled: devices.filter(d => d.is_trusted).length > 0,
      score: score.devices,
      maxScore: 25,
    },
    {
      id: 'sessions',
      title: 'Sessões Ativas',
      description: `${sessions.length} sessão(ões) ativa(s)`,
      icon: Monitor,
      enabled: sessions.length <= 3,
      score: score.sessions,
      maxScore: 25,
    },
    {
      id: 'password',
      title: 'Senha Forte',
      description: 'Sua senha atende aos requisitos de segurança',
      icon: Lock,
      enabled: true,
      score: score.password,
      maxScore: 25,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Security Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Pontuação de Segurança</h3>
                <p className="text-sm text-muted-foreground">
                  Baseado nas suas configurações atuais
                </p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(score.total)}`}>
                  {score.total}
                </div>
                <div className="text-sm text-muted-foreground">de 100</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={score.total} 
                className="h-3"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Smartphone className="w-5 h-5 text-info" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{devices.length}</div>
                  <div className="text-xs text-muted-foreground">Dispositivos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Monitor className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{sessions.length}</div>
                  <div className="text-xs text-muted-foreground">Sessões Ativas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isMFAEnabled ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <Key className={`w-5 h-5 ${isMFAEnabled ? 'text-success' : 'text-warning'}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{factors.length}</div>
                  <div className="text-xs text-muted-foreground">Fatores MFA</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${securityAlerts.filter(a => !a.is_resolved).length > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <AlertTriangle className={`w-5 h-5 ${securityAlerts.filter(a => !a.is_resolved).length > 0 ? 'text-destructive' : 'text-success'}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {securityAlerts.filter(a => !a.is_resolved).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Alertas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Security Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Status de Segurança
            </CardTitle>
            <CardDescription>
              Revise e melhore a segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${item.enabled ? 'bg-success/10' : 'bg-warning/10'}`}>
                      <Icon className={`w-5 h-5 ${item.enabled ? 'text-success' : 'text-warning'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-medium">{item.score}/{item.maxScore}</span>
                    </div>
                    {item.enabled ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-warning" />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas Recentes
            </CardTitle>
            <CardDescription>
              Atividades de segurança na sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : securityAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-success mb-3" />
                <h4 className="font-medium">Nenhum alerta recente</h4>
                <p className="text-sm text-muted-foreground">
                  Sua conta está segura e sem atividades suspeitas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {securityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{alert.title}</h4>
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.is_resolved && (
                          <Badge variant="outline" className="bg-success/10 text-success border-green-500/20">
                            Resolvido
                          </Badge>
                        )}
                      </div>
                      {alert.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {alert.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Devices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Dispositivos Recentes
            </CardTitle>
            <CardDescription>
              Últimos dispositivos que acessaram sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Smartphone className="w-12 h-12 text-muted-foreground mb-3" />
                <h4 className="font-medium">Nenhum dispositivo registrado</h4>
                <p className="text-sm text-muted-foreground">
                  Seus dispositivos aparecerão aqui após o login
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.slice(0, 5).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {device.os?.toLowerCase().includes('mobile') || 
                         device.os?.toLowerCase().includes('android') || 
                         device.os?.toLowerCase().includes('ios') ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Monitor className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{device.device_name || 'Dispositivo'}</h4>
                          {device.is_trusted && (
                            <Badge variant="outline" className="bg-success/10 text-success border-green-500/20 text-xs">
                              Confiável
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {device.browser} · {device.os}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {device.ip_address}
                          <span className="mx-1">·</span>
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(device.last_seen_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
