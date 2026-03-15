import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Mic,
  Search,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Download,
  Play,
  Volume2,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TranscriptionRecord {
  id: string;
  content: string;
  transcription: string;
  media_url: string | null;
  created_at: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_avatar: string | null;
}

interface GroupedTranscriptions {
  [contactId: string]: {
    contact: {
      id: string;
      name: string;
      phone: string;
      avatar: string | null;
    };
    transcriptions: TranscriptionRecord[];
  };
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function TranscriptionsHistoryView() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Fetch transcriptions
  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const fetchTranscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          transcription,
          media_url,
          created_at,
          contact_id,
          contacts!inner (
            id,
            name,
            phone,
            avatar_url
          )
        `)
        .eq('message_type', 'audio')
        .not('transcription', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: TranscriptionRecord[] = (data || []).map((item: { id: string; content: string; transcription: string | null; media_url: string | null; created_at: string; contact_id: string | null; contacts?: { name?: string; phone?: string; avatar_url?: string | null } | null }) => ({
        id: item.id,
        content: item.content,
        transcription: item.transcription,
        media_url: item.media_url,
        created_at: item.created_at,
        contact_id: item.contact_id,
        contact_name: item.contacts?.name || 'Desconhecido',
        contact_phone: item.contacts?.phone || '',
        contact_avatar: item.contacts?.avatar_url || null,
      }));

      setTranscriptions(formattedData);
    } catch (error) {
      log.error('Error fetching transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter transcriptions
  const filteredTranscriptions = useMemo(() => {
    let filtered = transcriptions;

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter((t) => {
        const date = new Date(t.created_at);
        switch (dateFilter) {
          case 'today':
            return isToday(date);
          case 'week':
            return isThisWeek(date);
          case 'month':
            return isThisMonth(date);
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.transcription.toLowerCase().includes(query) ||
          t.contact_name.toLowerCase().includes(query) ||
          t.contact_phone.includes(query)
      );
    }

    return filtered;
  }, [transcriptions, dateFilter, searchQuery]);

  // Group by contact
  const groupedByContact = useMemo(() => {
    const grouped: GroupedTranscriptions = {};

    filteredTranscriptions.forEach((t) => {
      if (!grouped[t.contact_id]) {
        grouped[t.contact_id] = {
          contact: {
            id: t.contact_id,
            name: t.contact_name,
            phone: t.contact_phone,
            avatar: t.contact_avatar,
          },
          transcriptions: [],
        };
      }
      grouped[t.contact_id].transcriptions.push(t);
    });

    return grouped;
  }, [filteredTranscriptions]);

  // Group by date within each contact
  const groupByDate = (items: TranscriptionRecord[]) => {
    const groups: { [key: string]: TranscriptionRecord[] } = {};

    items.forEach((item) => {
      const date = startOfDay(new Date(item.created_at));
      const key = date.toISOString();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateKey, items]) => ({
        date: new Date(dateKey),
        items,
      }));
  };

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const toggleContact = (contactId: string) => {
    setExpandedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedContacts(new Set(Object.keys(groupedByContact)));
  };

  const collapseAll = () => {
    setExpandedContacts(new Set());
  };

  const totalTranscriptions = filteredTranscriptions.length;
  const totalContacts = Object.keys(groupedByContact).length;

  if (loading) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
        <AuroraBorealis />
        <FloatingParticles />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between relative z-10"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
            Histórico de Transcrições
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalTranscriptions} transcrições de {totalContacts} contatos
          </p>
        </div>

        <Button onClick={fetchTranscriptions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 relative z-10"
      >
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em transcrições..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expandir todos
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Recolher todos
          </Button>
        </div>
      </motion.div>

      {/* Transcriptions List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-4 relative z-10 pr-4">
          <AnimatePresence>
            {Object.entries(groupedByContact).length === 0 ? (
              <EmptyState
                icon={Mic}
                title={searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma transcrição ainda'}
                description={
                  searchQuery
                    ? 'Tente ajustar os termos da busca ou filtros'
                    : 'Transcrições de áudios aparecerão aqui automaticamente'
                }
                illustration="transcriptions"
                secondaryActionLabel={searchQuery ? 'Limpar busca' : undefined}
                onSecondaryAction={searchQuery ? () => setSearchQuery('') : undefined}
              />
            ) : (
              Object.entries(groupedByContact).map(([contactId, { contact, transcriptions }], index) => {
                const isExpanded = expandedContacts.has(contactId);
                const dateGroups = groupByDate(transcriptions);

                return (
                  <motion.div
                    key={contactId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleContact(contactId)}>
                      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-colors">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={contact.avatar || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {contact.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                  <CardTitle className="text-base font-medium">
                                    {contact.name}
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="gap-1">
                                  <FileText className="w-3 h-3" />
                                  {transcriptions.length} transcrições
                                </Badge>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                            {dateGroups.map(({ date, items }) => (
                              <div key={date.toISOString()} className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-medium">{formatDateLabel(date)}</span>
                                </div>

                                <div className="space-y-2 pl-4 border-l-2 border-border/50">
                                  {items.map((item) => (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="bg-muted/30 rounded-lg p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {format(new Date(item.created_at), 'HH:mm', { locale: ptBR })}
                                          </span>
                                          <span className="text-muted-foreground/50">•</span>
                                          <span>
                                            {formatDistanceToNow(new Date(item.created_at), {
                                              addSuffix: true,
                                              locale: ptBR,
                                            })}
                                          </span>
                                        </div>

                                        {item.media_url && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1"
                                            onClick={() => {
                                              if (playingAudio === item.id) {
                                                setPlayingAudio(null);
                                              } else {
                                                setPlayingAudio(item.id);
                                              }
                                            }}
                                          >
                                            {playingAudio === item.id ? (
                                              <>
                                                <Volume2 className="w-3 h-3" />
                                                Pausar
                                              </>
                                            ) : (
                                              <>
                                                <Play className="w-3 h-3" />
                                                Ouvir
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>

                                      <p className="text-sm text-foreground/90 italic leading-relaxed">
                                        "{item.transcription}"
                                      </p>

                                      {/* Hidden audio player */}
                                      {playingAudio === item.id && item.media_url && (
                                        <audio
                                          src={item.media_url}
                                          autoPlay
                                          onEnded={() => setPlayingAudio(null)}
                                          className="hidden"
                                        />
                                      )}
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
