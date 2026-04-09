import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldQuestion, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Objection {
  objection: string;
  counterArgument: string;
  confidence: number;
}

interface ObjectionDetectorProps {
  contactId: string;
  lastMessages: string[];
}

export function ObjectionDetector({ contactId, lastMessages }: ObjectionDetectorProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const analyze = async () => {
    if (lastMessages.length === 0) return;
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em vendas e atendimento. Analise as mensagens do cliente e identifique objeções. Para cada objeção, sugira um contra-argumento persuasivo.
Responda APENAS em JSON válido com este formato:
[{"objection":"texto da objeção","counterArgument":"sugestão de resposta","confidence":0.85}]
Se não houver objeções, retorne []`,
            },
            {
              role: 'user',
              content: `Mensagens do cliente:\n${lastMessages.join('\n')}`,
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      const content = response.data?.content || response.data?.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setObjections(parsed);
      }
    } catch {
      setObjections([]);
    }

    setAnalyzed(true);
    setLoading(false);
  };

  if (!analyzed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 text-xs text-muted-foreground hover:text-primary"
        onClick={analyze}
        disabled={loading || lastMessages.length === 0}
      >
        {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldQuestion className="w-3 h-3 mr-1" />}
        Detectar objeções
      </Button>
    );
  }

  if (objections.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">Nenhuma objeção detectada</p>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] mt-1" onClick={analyze}>
          Reanalisar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldQuestion className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium">Objeções detectadas</span>
          <Badge variant="outline" className="text-[10px]">{objections.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={analyze} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </Button>
      </div>
      <AnimatePresence>
        {objections.map((obj, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/30"
          >
            <div className="flex items-start gap-1.5">
              <ShieldQuestion className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">{obj.objection}</p>
            </div>
            <div className="flex items-start gap-1.5 pl-5">
              <Lightbulb className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">{obj.counterArgument}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
