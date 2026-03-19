import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionHealthPanel } from '@/components/diagnostics/ConnectionHealthPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, MessageSquare, ArrowUpDown, Activity, Server, Database,
  HardDrive, Zap, Bug, ChevronRight, BarChart3, Send, FileWarning,
  Loader2, Shield,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ───
interface ConnectionStatus {
  id: string;
  instance_id: string;
  status: string;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageDiagnostic {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  failureRate: number;
  recentFailures: Array<{
    id: string;
    content: string;
    status: string;
    created_at: string;
    contact_name: string;
  }>;
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded' | 'down';
  realtime: 'healthy' | 'degraded' | 'down';
  edgeFunctions: 'healthy' | 'degraded' | 'down';
  dbLatency: number;
  storageLatency: number;
  contactsCount: number;
  messagesCount: number;
  connectionsCount: number;
}

interface ErrorLog {
  id: string;
  type: 'connection' | 'message' | 'system' | 'webhook';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: string;
  timestamp: Date;
}

// ─── Status helpers ───
function StatusDot({ status }: { status: string }) {
  const color = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-destructive';
  return (
    <span className="relative flex h-3 w-3">
      {status === 'connected' && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', color)} />}
      <span className={cn('relative inline-flex h-3 w-3 rounded-full', color)} />
    </span>
  );
}

function HealthBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { label: 'Saudável', variant: 'default' as const, icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    degraded: { label: 'Degradado', variant: 'secondary' as const, icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    down: { label: 'Fora do ar', variant: 'destructive' as const, icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', c.className)}>
      <c.icon className="w-3.5 h-3.5" />
      {c.label}
    </Badge>
  );
}

function MetricCard({ icon: Icon, label, value, sub, className }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border border-border/50 bg-card p-4 space-y-2', className)}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

// ─── Main Component ───
export function DiagnosticsView() {
  const [activeTab, setActiveTab] = useState('connections');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Data
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [messageDiag, setMessageDiag] = useState<MessageDiagnostic | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchConnections(),
        fetchMessageDiagnostics(),
        fetchSystemHealth(),
        fetchErrorLogs(),
      ]);
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const fetchConnections = async () => {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setConnections(data as ConnectionStatus[]);
  };

  const fetchMessageDiagnostics = async () => {
    // Get message counts by status (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: messages, count: totalCount } = await supabase
      .from('messages')
      .select('status', { count: 'exact' })
      .gte('created_at', since)
      .eq('sender', 'agent');

    const { count: sentCount } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since).eq('sender', 'agent').eq('status', 'sent');

    const { count: deliveredCount } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since).eq('sender', 'agent').eq('status', 'delivered');

    const { count: readCount } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since).eq('sender', 'agent').eq('status', 'read');

    const { count: failedCount } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since).eq('sender', 'agent').eq('status', 'failed');

    const { count: pendingCount } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .gte('created_at', since).eq('sender', 'agent').eq('status', 'sending');

    // Recent failures
    const { data: failures } = await supabase
      .from('messages')
      .select('id, content, status, created_at, contact_id')
      .eq('sender', 'agent')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get contact names for failures
    const recentFailures = [];
    if (failures) {
      for (const f of failures) {
        let contactName = 'Desconhecido';
        if (f.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', f.contact_id)
            .single();
          if (contact) contactName = contact.name;
        }
        recentFailures.push({
          id: f.id,
          content: f.content,
          status: f.status || 'unknown',
          created_at: f.created_at,
          contact_name: contactName,
        });
      }
    }

    const total = totalCount || 0;
    const sent = sentCount || 0;
    const delivered = deliveredCount || 0;
    const read = readCount || 0;
    const failed = failedCount || 0;
    const pending = pendingCount || 0;

    setMessageDiag({
      total,
      sent,
      delivered,
      read,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round(((delivered + read) / total) * 100) : 0,
      failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      recentFailures,
    });
  };

  const fetchSystemHealth = async () => {
    // DB latency test
    const dbStart = performance.now();
    const { count: contactsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
    const dbLatency = Math.round(performance.now() - dbStart);

    // Storage latency test
    const storageStart = performance.now();
    await supabase.storage.from('whatsapp-media').list('', { limit: 1 });
    const storageLatency = Math.round(performance.now() - storageStart);

    const { count: messagesCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
    const { count: connectionsCount } = await supabase.from('whatsapp_connections').select('*', { count: 'exact', head: true });

    // Test edge functions
    let edgeFunctionsStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    try {
      const { error } = await supabase.functions.invoke('evolution-api/health-check', {
        body: {},
      });
      if (error) edgeFunctionsStatus = 'degraded';
    } catch {
      edgeFunctionsStatus = 'degraded'; // May not have this endpoint
    }

    setHealth({
      database: dbLatency < 500 ? 'healthy' : dbLatency < 2000 ? 'degraded' : 'down',
      storage: storageLatency < 1000 ? 'healthy' : storageLatency < 3000 ? 'degraded' : 'down',
      realtime: 'healthy', // If we got here, realtime is working
      edgeFunctions: edgeFunctionsStatus,
      dbLatency,
      storageLatency,
      contactsCount: contactsCount || 0,
      messagesCount: messagesCount || 0,
      connectionsCount: connectionsCount || 0,
    });
  };

  const fetchErrorLogs = async () => {
    const logs: ErrorLog[] = [];

    // Check for failed messages
    const { data: failedMsgs } = await supabase
      .from('messages')
      .select('id, content, created_at, contact_id')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (failedMsgs) {
      for (const msg of failedMsgs) {
        logs.push({
          id: `msg-${msg.id}`,
          type: 'message',
          severity: 'error',
          message: 'Falha no envio de mensagem',
          details: `Mensagem "${msg.content?.slice(0, 50)}..." falhou ao enviar`,
          timestamp: new Date(msg.created_at),
        });
      }
    }

    // Check for disconnected connections
    const { data: disconnected } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id, status, updated_at')
      .neq('status', 'connected');

    if (disconnected) {
      for (const conn of disconnected) {
        logs.push({
          id: `conn-${conn.id}`,
          type: 'connection',
          severity: 'critical',
          message: `Conexão ${conn.instance_id} desconectada`,
          details: `Status: ${conn.status || 'desconhecido'}. Última atualização: ${conn.updated_at}`,
          timestamp: new Date(conn.updated_at),
        });
      }
    }

    // Check for contacts without connection
    const { data: orphanContacts, count: orphanCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .is('whatsapp_connection_id', null);

    if (orphanCount && orphanCount > 0) {
      logs.push({
        id: 'orphan-contacts',
        type: 'system',
        severity: 'warning',
        message: `${orphanCount} contato(s) sem conexão WhatsApp`,
        details: 'Esses contatos não receberão mensagens enviadas pelo sistema. Vincule-os a uma conexão.',
        timestamp: new Date(),
      });
    }

    // Check for pending messages older than 5 min
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: stuckCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sending')
      .lt('created_at', fiveMinAgo);

    if (stuckCount && stuckCount > 0) {
      logs.push({
        id: 'stuck-messages',
        type: 'message',
        severity: 'warning',
        message: `${stuckCount} mensagem(ns) travada(s) no status "enviando"`,
        details: 'Mensagens com mais de 5 minutos no status "sending". Pode indicar problemas com a Evolution API.',
        timestamp: new Date(),
      });
    }

    // Sort by timestamp desc
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setErrorLogs(logs);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    toast.info('Atualizando diagnósticos...');
    await fetchAll();
    toast.success('Diagnósticos atualizados!');
  };

  const severityConfig = {
    info: { icon: Activity, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
    critical: { icon: Bug, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
  };

  const errorCount = errorLogs.filter(l => l.severity === 'error' || l.severity === 'critical').length;
  const warningCount = errorLogs.filter(l => l.severity === 'warning').length;
  const connectedCount = connections.filter(c => c.status === 'connected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando diagnósticos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bug className="w-6 h-6 text-primary" />
            </div>
            Diagnóstico do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento em tempo real · Última atualização: {format(lastRefresh, 'HH:mm:ss', { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="w-3.5 h-3.5" />
              {errorCount} erro(s)
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warningCount} aviso(s)
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 border-b border-border/30">
        <MetricCard
          icon={Wifi}
          label="Conexões ativas"
          value={`${connectedCount}/${connections.length}`}
          sub={connectedCount === connections.length ? 'Todas conectadas' : 'Atenção necessária'}
        />
        <MetricCard
          icon={Send}
          label="Taxa de entrega (24h)"
          value={`${messageDiag?.deliveryRate || 0}%`}
          sub={`${messageDiag?.failed || 0} falhas`}
        />
        <MetricCard
          icon={Database}
          label="Latência do banco"
          value={`${health?.dbLatency || 0}ms`}
          sub={health?.database === 'healthy' ? 'Normal' : 'Lento'}
        />
        <MetricCard
          icon={Bug}
          label="Problemas detectados"
          value={errorLogs.length}
          sub={errorCount > 0 ? `${errorCount} críticos` : 'Nenhum crítico'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 bg-muted/50 p-1">
          <TabsTrigger value="connections" className="gap-2">
            <Wifi className="w-4 h-4" />
            Conexões
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Server className="w-4 h-4" />
            Health Check
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 relative">
            <FileWarning className="w-4 h-4" />
            Logs de Erros
            {errorLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {errorLogs.length > 9 ? '9+' : errorLogs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* ── Tab: Conexões ── */}
          <TabsContent value="connections" className="px-6 py-4 space-y-4">
            {connections.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">Nenhuma conexão encontrada</p>
                  <p className="text-sm text-muted-foreground">Configure uma conexão WhatsApp para começar.</p>
                </CardContent>
              </Card>
            ) : (
              connections.map((conn, i) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <StatusDot status={conn.status} />
                        <div>
                          <p className="font-semibold text-foreground">{conn.instance_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {conn.phone_number || 'Sem número vinculado'} · Criada {formatDistanceToNow(new Date(conn.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(
                          conn.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          conn.status === 'connecting' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        )}>
                          {conn.status === 'connected' ? 'Conectado' : conn.status === 'connecting' ? 'Conectando' : conn.status || 'Desconectado'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Atualizado {formatDistanceToNow(new Date(conn.updated_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ── Tab: Mensagens ── */}
          <TabsContent value="messages" className="px-6 py-4 space-y-6">
            {messageDiag && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricCard icon={Send} label="Total enviadas" value={messageDiag.total} sub="Últimas 24h" />
                  <MetricCard icon={CheckCircle2} label="Enviadas" value={messageDiag.sent} />
                  <MetricCard icon={ArrowUpDown} label="Entregues" value={messageDiag.delivered} />
                  <MetricCard icon={CheckCircle2} label="Lidas" value={messageDiag.read} />
                  <MetricCard icon={XCircle} label="Falharam" value={messageDiag.failed} className={messageDiag.failed > 0 ? 'border-destructive/30' : ''} />
                  <MetricCard icon={Clock} label="Pendentes" value={messageDiag.pending} className={messageDiag.pending > 0 ? 'border-amber-500/30' : ''} />
                </div>

                {/* Delivery rate bar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Taxa de entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${messageDiag.deliveryRate}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            messageDiag.deliveryRate >= 90 ? 'bg-emerald-500' :
                            messageDiag.deliveryRate >= 70 ? 'bg-amber-500' : 'bg-destructive'
                          )}
                        />
                      </div>
                      <span className="text-lg font-bold text-foreground">{messageDiag.deliveryRate}%</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>🟢 Entregues + Lidas: {messageDiag.delivered + messageDiag.read}</span>
                      <span>🔴 Falhas: {messageDiag.failed}</span>
                      <span>🟡 Taxa de falha: {messageDiag.failureRate}%</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent failures */}
                {messageDiag.recentFailures.length > 0 && (
                  <Card className="border-destructive/20">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <XCircle className="w-5 h-5" />
                        Falhas recentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {messageDiag.recentFailures.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.contact_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{f.content.slice(0, 60)}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                            {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab: Health Check ── */}
          <TabsContent value="health" className="px-6 py-4 space-y-4">
            {health && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'database' as const, label: 'Banco de Dados', icon: Database, detail: `Latência: ${health.dbLatency}ms · ${health.contactsCount} contatos · ${health.messagesCount} mensagens` },
                    { key: 'storage' as const, label: 'Armazenamento', icon: HardDrive, detail: `Latência: ${health.storageLatency}ms` },
                    { key: 'realtime' as const, label: 'Realtime', icon: Zap, detail: 'Canal de tempo real ativo' },
                    { key: 'edgeFunctions' as const, label: 'Backend Functions', icon: Server, detail: `${health.connectionsCount} conexão(ões) configurada(s)` },
                  ].map(({ key, label, icon: Icon, detail }, i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card>
                        <CardContent className="flex items-center justify-between p-5">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              'p-2.5 rounded-xl',
                              health[key] === 'healthy' ? 'bg-emerald-500/10' :
                              health[key] === 'degraded' ? 'bg-amber-500/10' : 'bg-destructive/10'
                            )}>
                              <Icon className={cn(
                                'w-5 h-5',
                                health[key] === 'healthy' ? 'text-emerald-500' :
                                health[key] === 'degraded' ? 'text-amber-500' : 'text-destructive'
                              )} />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">{detail}</p>
                            </div>
                          </div>
                          <HealthBadge status={health[key]} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Overall status */}
                <Card className="bg-card/50">
                  <CardContent className="flex items-center gap-4 p-5">
                    <Shield className={cn(
                      'w-8 h-8',
                      Object.values({ db: health.database, st: health.storage, rt: health.realtime, ef: health.edgeFunctions }).every(s => s === 'healthy')
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    )} />
                    <div>
                      <p className="font-semibold text-foreground">
                        {Object.values({ db: health.database, st: health.storage, rt: health.realtime, ef: health.edgeFunctions }).every(s => s === 'healthy')
                          ? '✅ Todos os sistemas operacionais'
                          : '⚠️ Alguns sistemas precisam de atenção'}
                      </p>
                      <p className="text-xs text-muted-foreground">Auto-refresh a cada 30 segundos</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Tab: Logs de Erros ── */}
          <TabsContent value="logs" className="px-6 py-4 space-y-3">
            {errorLogs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                  <p className="text-lg font-medium text-foreground">Nenhum problema detectado</p>
                  <p className="text-sm text-muted-foreground">Todos os sistemas estão funcionando normalmente.</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {errorLogs.map((log, i) => {
                  const sev = severityConfig[log.severity];
                  const SevIcon = sev.icon;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card className={cn('border', sev.border)}>
                        <CardContent className="flex items-start gap-4 p-4">
                          <div className={cn('p-2 rounded-lg mt-0.5', sev.bg)}>
                            <SevIcon className={cn('w-4 h-4', sev.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{log.type}</Badge>
                              <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider', sev.bg, sev.color, sev.border)}>
                                {log.severity}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground">{log.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: ptBR })}
                          </span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
