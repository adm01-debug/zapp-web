import { MessageSquare, Clock, Star, BarChart3, Users } from 'lucide-react';
import { useContactStats } from '@/hooks/useContactStats';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactStatsSectionProps {
  contactId: string;
}

export function ContactStatsSection({ contactId }: ContactStatsSectionProps) {
  const { data: stats, isLoading } = useContactStats(contactId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Estatísticas
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const items = [
    {
      icon: MessageSquare,
      label: 'Mensagens',
      value: stats?.totalMessages ?? 0,
    },
    {
      icon: Clock,
      label: 'Tempo médio',
      value: stats?.avgResponseTimeMinutes
        ? stats.avgResponseTimeMinutes >= 60
          ? `${Math.floor(stats.avgResponseTimeMinutes / 60)}h${stats.avgResponseTimeMinutes % 60}m`
          : `${stats.avgResponseTimeMinutes}min`
        : '—',
    },
    {
      icon: Users,
      label: 'Conversas',
      value: stats?.totalConversations ?? 0,
    },
    {
      icon: Star,
      label: 'CSAT',
      value: stats?.csatAverage !== null && stats?.csatAverage !== undefined
        ? `${stats.csatAverage.toFixed(1)}⭐`
        : '—',
      subtitle: stats?.csatCount ? `${stats.csatCount} avaliações` : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Estatísticas
      </h5>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-muted/20 rounded-lg p-3 border border-border/20 hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <item.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </div>
            <span className="text-lg font-semibold text-primary">{item.value}</span>
            {item.subtitle && (
              <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
