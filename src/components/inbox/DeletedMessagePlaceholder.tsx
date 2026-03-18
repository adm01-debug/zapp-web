import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeletedMessagePlaceholderProps {
  isSent: boolean;
  content?: string;
}

export function DeletedMessagePlaceholder({ isSent, content }: DeletedMessagePlaceholderProps) {
  const hasOriginalContent = content && content !== '[Mensagem apagada]';

  return (
    <div
      className={cn(
        'relative px-3.5 py-2.5 rounded-2xl shadow-sm border-2 border-dashed',
        isSent
          ? 'rounded-br-md bg-primary/15 border-primary/30 text-primary/60'
          : 'rounded-bl-md bg-destructive/5 border-destructive/20 text-muted-foreground'
      )}
    >
      {/* Deleted indicator badge */}
      <div className={cn(
        'flex items-center gap-1.5 mb-1.5 text-[11px] font-medium',
        isSent ? 'text-primary/50' : 'text-destructive/60'
      )}>
        <Ban className="w-3 h-3" />
        <span>Mensagem apagada pelo contato</span>
      </div>

      {/* Original content preserved */}
      {hasOriginalContent ? (
        <p className={cn(
          'text-sm leading-relaxed whitespace-pre-wrap break-words line-through decoration-1',
          isSent ? 'text-primary/40' : 'text-muted-foreground/50'
        )}>
          {content}
        </p>
      ) : (
        <p className={cn(
          'text-sm italic',
          isSent ? 'text-primary/30' : 'text-muted-foreground/40'
        )}>
          Conteúdo original não disponível
        </p>
      )}
    </div>
  );
}
