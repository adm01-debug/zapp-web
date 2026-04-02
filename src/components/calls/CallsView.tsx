import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getLogger } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Search,
  Clock,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVoipContext } from '@/contexts/VoipContext';
import { CallDialog } from './CallDialog';

const log = getLogger('CallsView');

interface CallRecord {
  id: string;
  contact_id: string | null;
  agent_id: string | null;
  direction: string;
  status: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  contact?: { name: string; phone: string } | null;
  agent?: { name: string } | null;
}

export function CallsView() {
  const { isReady: isConnected, makeCall, activeCall } = useVoipContext();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialer, setShowDialer] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callContact, setCallContact] = useState({ name: '', phone: '' });

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*, contacts(name, phone), profiles!calls_agent_id_fkey(name)')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mapped = (data || []).map((c) => ({
        ...c,
        contact: c.contacts,
        agent: c.profiles,
      } as CallRecord));

      setCalls(mapped);
    } catch (error) {
      log.error('Error fetching calls:', error);
      toast({ title: 'Erro ao carregar chamadas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Refresh when active call ends
  useEffect(() => {
    if (!activeCall) {
      fetchCalls();
    }
  }, [activeCall, fetchCalls]);

  const filteredCalls = useMemo(() => calls.filter((call) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      call.contact?.name?.toLowerCase().includes(q) ||
      call.contact?.phone?.toLowerCase().includes(q) ||
      call.agent?.name?.toLowerCase().includes(q)
    );
  }), [calls, search]);

  const handleDial = useCallback(() => {
    if (!dialNumber.trim()) return;
    setCallContact({ name: dialNumber, phone: dialNumber });
    setShowDialer(false);
    setShowCallDialog(true);
    setDialNumber('');
  }, [dialNumber]);

  const handleCallFromHistory = useCallback((call: CallRecord) => {
    const phone = call.contact?.phone || '';
    if (!phone) return;
    setCallContact({
      name: call.contact?.name || phone,
      phone,
    });
    setShowCallDialog(true);
  }, []);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getCallIcon = (call: CallRecord) => {
    if (call.status === 'missed') return <PhoneMissed className="w-4 h-4 text-destructive" />;
    if (call.status === 'busy' || call.status === 'failed') return <PhoneOff className="w-4 h-4 text-muted-foreground" />;
    if (call.direction === 'inbound') return <PhoneIncoming className="w-4 h-4 text-whatsapp" />;
    return <PhoneOutgoing className="w-4 h-4 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
      case 'ended':
        return <Badge variant="outline" className="text-xs">Atendida</Badge>;
      case 'missed':
        return <Badge variant="destructive" className="text-xs">Perdida</Badge>;
      case 'busy':
        return <Badge variant="secondary" className="text-xs">Ocupado</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Falha</Badge>;
      case 'ringing':
        return <Badge className="text-xs bg-whatsapp">Tocando</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  // Stats — memoized to avoid recalculation on every render
  const { totalToday, answeredToday, missedToday, avgDuration } = useMemo(() => {
    const today = new Date().toDateString();
    const todayCalls = calls.filter(c => new Date(c.started_at).toDateString() === today);
    const answered = todayCalls.filter(c => c.status === 'answered' || c.status === 'ended').length;
    return {
      totalToday: todayCalls.length,
      answeredToday: answered,
      missedToday: todayCalls.filter(c => c.status === 'missed').length,
      avgDuration: todayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / (answered || 1),
    };
  }, [calls]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto h-full">
      <PageHeader
        title="Chamadas"
        subtitle="Realize e gerencie chamadas de voz via WhatsApp"
        breadcrumbs={[{ label: 'Comunicação' }, { label: 'Chamadas' }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'VoIP Conectado' : 'VoIP Offline'}
            </Badge>
            <Button
              onClick={() => setShowDialer(true)}
              disabled={!isConnected}
            >
              <Phone className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Chamada</span>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Hoje', value: totalToday, icon: Phone },
            { label: 'Atendidas', value: answeredToday, icon: PhoneIncoming },
            { label: 'Perdidas', value: missedToday, icon: PhoneMissed },
            { label: 'Duração Média', value: formatDuration(Math.round(avgDuration)), icon: Clock },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar chamadas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar chamadas"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearch('')}
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Call History */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filteredCalls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title={search ? 'Nenhuma chamada encontrada' : 'Nenhuma chamada registrada'}
          description={search ? 'Ajuste os termos da busca' : 'Suas chamadas de voz aparecerão aqui'}
          illustration="data"
        />
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-1">
            {filteredCalls.map((call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group',
                  call.status === 'missed' && 'bg-destructive/5'
                )}
                onClick={() => handleCallFromHistory(call)}
              >
                {/* Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-sm bg-muted">
                    {(call.contact?.name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Call info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getCallIcon(call)}
                    <span className="font-medium text-sm truncate">
                      {call.contact?.name || call.contact?.phone || 'Desconhecido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{call.contact?.phone}</span>
                    {call.agent?.name && (
                      <>
                        <span>|</span>
                        <span>{call.agent.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status & Time */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-2 justify-end">
                    {getStatusBadge(call.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {call.duration_seconds != null && call.duration_seconds > 0 && (
                      <span className="font-mono">{formatDuration(call.duration_seconds)}</span>
                    )}
                    <span>{formatDate(call.started_at)} {formatTime(call.started_at)}</span>
                  </div>
                </div>

                {/* Redial button on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCallFromHistory(call);
                  }}
                  disabled={!isConnected}
                  aria-label={`Ligar para ${call.contact?.name || 'contato'}`}
                >
                  <Phone className="w-4 h-4 text-whatsapp" />
                </Button>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialer Dialog */}
      <Dialog open={showDialer} onOpenChange={setShowDialer}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Chamada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="+55 11 99999-9999"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDial()}
              className="text-center text-lg font-mono"
              aria-label="Número de telefone"
              autoFocus
            />
            {/* Dial pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className="h-12 text-lg font-semibold"
                  onClick={() => setDialNumber((prev) => prev + key)}
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-whatsapp hover:bg-whatsapp-dark"
              onClick={handleDial}
              disabled={!dialNumber.trim()}
            >
              <Phone className="w-4 h-4 mr-2" />
              Ligar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Call Dialog */}
      <CallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        contact={callContact}
        direction="outbound"
        onEnd={() => {
          setShowCallDialog(false);
          fetchCalls();
        }}
      />
    </div>
  );
}
