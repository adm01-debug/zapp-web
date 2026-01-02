import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';
import { useDuplicate } from '@/hooks/useDuplicate';

interface DuplicateButtonProps<T extends { id: string }> {
  item: T;
  tableName: string;
  queryKey: string[];
  onSuccess?: (newItem: T) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function DuplicateButton<T extends { id: string }>({
  item, tableName, queryKey, onSuccess, variant = 'ghost', size = 'icon'
}: DuplicateButtonProps<T>) {
  const { mutate, isPending } = useDuplicate<T>({ tableName, queryKey });

  return (
    <Button variant={variant} size={size} onClick={() => mutate(item, { onSuccess })} disabled={isPending} title="Duplicar">
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
