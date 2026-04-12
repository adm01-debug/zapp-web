import { Ban, Eye } from 'lucide-react';
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
          : 'rounded-bl-md bg-amber-500/5 border-amber-500/25 text-muted-foreground'
      )}
    >
      {/* Deleted indicator badge */}
      <div className={cn(
        'flex items-center gap-1.5 mb-1.5 text-[11px] font-medium',
        isSent ? 'text-primary/50' : 'text-amber-600 dark:text-amber-400'
      )}>
        <Ban className="w-3 h-3" />
        <span>{isSent ? 'Você apagou esta mensagem' : 'O contato apagou esta mensagem'}</span>
      </div>

      {/* Original content preserved */}
      {hasOriginalContent ? (
        <div>
          {!isSent && (
            <div className="flex items-center gap-1 mb-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Eye className="w-2.5 h-2.5" />
              <span>Conteúdo original preservado</span>
            </div>
          )}
          <p className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap break-words',
            isSent
              ? 'line-through decoration-1 text-primary/40'
              : 'text-muted-foreground/70 italic'
          )}>
            {content}
          </p>
        </div>
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
