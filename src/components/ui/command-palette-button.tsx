import { Command, Search } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface CommandPaletteButtonProps {
  onClick: () => void;
  className?: string;
}

export function CommandPaletteButton({ onClick, className }: CommandPaletteButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-9 px-3 gap-2 text-muted-foreground hover:text-foreground",
        "bg-muted/30 hover:bg-muted/50 border-border/50",
        "transition-all duration-200",
        className
      )}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline text-sm">Buscar...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background/80 rounded text-[10px] font-mono text-muted-foreground border border-border/50">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </Button>
  );
}
