import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  setLoadMoreRef: (node: HTMLDivElement | null) => void;
  emptyMessage?: string;
  className?: string;
}

export function InfiniteScrollList<T>({
  items, renderItem, isLoading, isFetchingNextPage, hasNextPage, setLoadMoreRef, emptyMessage = 'Nenhum item encontrado', className
}: InfiniteScrollListProps<T>) {
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (items.length === 0) return <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>;

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, i) => renderItem(item, i))}
      <div ref={setLoadMoreRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
        {!hasNextPage && items.length > 0 && <span className="text-xs text-muted-foreground">Todos os itens carregados</span>}
      </div>
    </div>
  );
}
