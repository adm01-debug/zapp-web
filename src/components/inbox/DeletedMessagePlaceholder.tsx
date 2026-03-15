import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeletedMessagePlaceholderProps {
  isSent: boolean;
}

export function DeletedMessagePlaceholder({ isSent }: DeletedMessagePlaceholderProps) {
  return (
    <div
      className={cn(
        'relative px-4 py-2.5 rounded-2xl shadow-sm italic',
        isSent
          ? 'rounded-br-md bg-primary/50 text-primary-foreground/70'
          : 'rounded-bl-md bg-card/50 border border-border/20 text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-2">
        <Ban className="w-3.5 h-3.5" />
        <span className="text-sm">Mensagem apagada</span>
      </div>
    </div>
  );
}
