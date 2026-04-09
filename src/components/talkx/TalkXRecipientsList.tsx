import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTalkX } from '@/hooks/useTalkX';

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground' },
  sending: { label: 'Enviando', icon: Loader2, color: 'text-amber-500' },
  sent: { label: 'Enviada', icon: CheckCircle2, color: 'text-green-500' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'text-blue-500' },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-destructive' },
  skipped: { label: 'Pulado', icon: SkipForward, color: 'text-muted-foreground' },
};

interface Props {
  campaignId: string;
}

export function TalkXRecipientsList({ campaignId }: Props) {
  const { recipients, recipientsLoading, setSelectedCampaignId } = useTalkX();

  React.useEffect(() => {
    setSelectedCampaignId(campaignId);
  }, [campaignId, setSelectedCampaignId]);

  if (recipientsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum destinatário adicionado
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {recipients.map((r) => {
        const cfg = STATUS_MAP[r.status] || STATUS_MAP.pending;
        const Icon = cfg.icon;

        return (
          <div
            key={r.id}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
              {(r.contacts?.name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {r.contacts?.name || 'Desconhecido'}
                {r.contacts?.nickname && (
                  <span className="text-muted-foreground ml-1">({r.contacts.nickname})</span>
                )}
              </p>
              {r.personalized_message && (
                <p className="text-xs text-muted-foreground truncate">{r.personalized_message}</p>
              )}
              {r.error_message && (
                <p className="text-xs text-destructive truncate">{r.error_message}</p>
              )}
            </div>
            <Badge variant="outline" className={`gap-1 shrink-0 ${cfg.color}`}>
              <Icon className={`w-3 h-3 ${r.status === 'sending' ? 'animate-spin' : ''}`} />
              {cfg.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
