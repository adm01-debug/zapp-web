import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, Check, RefreshCw, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface AIResponseCardProps {
  response: string;
  onUse?: (text: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const AIResponseCard = memo(function AIResponseCard({
  response,
  onUse,
  onRegenerate,
  isRegenerating,
}: AIResponseCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    onUse?.(response);
    toast.success('Resposta inserida no chat!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-primary flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Resposta sugerida
        </span>
        <div className="flex gap-1">
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-full"
              onClick={onRegenerate}
              disabled={isRegenerating}
              title="Regenerar resposta"
            >
              {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-full"
            onClick={handleCopy}
            title="Copiar"
          >
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">{response.length} caracteres</span>
        {onUse && (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs font-medium gap-1.5 px-4"
            onClick={handleUse}
          >
            <Send className="w-3 h-3" />
            Usar resposta
          </Button>
        )}
      </div>
    </motion.div>
  );
});
