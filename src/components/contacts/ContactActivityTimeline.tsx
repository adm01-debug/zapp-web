import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { MessageSquare, StickyNote, ShoppingBag, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContactActivityTimelineProps {
  contactId: string;
}

interface Activity {
  id: string;
  type: 'message' | 'note' | 'purchase';
  title: string;
  description?: string;
  date: string;
}

export function ContactActivityTimeline({ contactId }: ContactActivityTimelineProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['contact-activity', contactId],
    queryFn: async () => {
      const results: Activity[] = [];

      // Recent messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, sender, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(5);

      (msgs || []).forEach(m => results.push({
        id: `msg-${m.id}`,
        type: 'message',
        title: m.sender === 'agent' ? 'Mensagem enviada' : 'Mensagem recebida',
        description: m.content?.slice(0, 80),
        date: m.created_at,
      }));

      // Notes
      const { data: notes } = await supabase
        .from('contact_notes')
        .select('id, content, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(3);

      (notes || []).forEach(n => results.push({
        id: `note-${n.id}`,
        type: 'note',
        title: 'Nota adicionada',
        description: n.content?.slice(0, 80),
        date: n.created_at,
      }));

      // Purchases
      const { data: purchases } = await supabase
        .from('contact_purchases')
        .select('id, title, amount, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(3);

      (purchases || []).forEach(p => results.push({
        id: `purchase-${p.id}`,
        type: 'purchase',
        title: p.title,
        description: p.amount ? `R$ ${p.amount.toLocaleString('pt-BR')}` : undefined,
        date: p.created_at,
      }));

      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    },
    enabled: !!contactId,
  });

  const ICONS = {
    message: MessageSquare,
    note: StickyNote,
    purchase: ShoppingBag,
  };

  const COLORS = {
    message: 'text-primary bg-primary/10',
    note: 'text-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%)]/10',
    purchase: 'text-[hsl(142_71%_45%)] bg-[hsl(142_71%_45%)]/10',
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-2 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Nenhuma atividade recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const Icon = ICONS[activity.type];
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 py-2 group"
          >
            <div className="flex flex-col items-center">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', COLORS[activity.type])}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-xs font-medium text-foreground leading-tight">{activity.title}</p>
              {activity.description && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{activity.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
