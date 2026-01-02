import { useVersions } from '@/hooks/useVersions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VersionHistoryProps { entityType: string; entityId: string; }

export function VersionHistory({ entityType, entityId }: VersionHistoryProps) {
  const { versions, isLoading, restoreVersion } = useVersions(entityType, entityId);

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  if (versions.length === 0) return <div className="p-4 text-center text-muted-foreground">Sem histórico</div>;

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2 p-2">
        {versions.map((v, i) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Versão {v.version_number}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(v.changed_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            </div>
            {i > 0 && (
              <Button variant="ghost" size="sm" onClick={() => restoreVersion(v.id)}>
                <RotateCcw className="h-4 w-4 mr-1" /> Restaurar
              </Button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
