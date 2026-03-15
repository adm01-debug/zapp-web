import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandMetal, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FarewellMessageConfigProps {
  connectionId: string;
  initialMessage?: string | null;
  initialEnabled?: boolean;
}

export function FarewellMessageConfig({ connectionId, initialMessage, initialEnabled }: FarewellMessageConfigProps) {
  const [message, setMessage] = useState(initialMessage || 'Obrigado pelo contato! Caso precise de algo mais, estamos à disposição. 😊');
  const [enabled, setEnabled] = useState(initialEnabled || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          farewell_message: message,
          farewell_enabled: enabled,
        } as any)
        .eq('id', connectionId);
      if (error) throw error;
      toast.success('Mensagem de despedida salva!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <HandMetal className="w-4 h-4 text-primary" />
          Mensagem de Despedida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="farewell-toggle" className="text-sm text-muted-foreground">
            Enviar ao resolver conversa
          </Label>
          <Switch
            id="farewell-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <Textarea
          placeholder="Mensagem enviada ao encerrar a conversa..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          disabled={!enabled}
          className="disabled:opacity-50"
        />

        <p className="text-[11px] text-muted-foreground">
          Variáveis: {'{{nome}}'} (nome do contato), {'{{atendente}}'} (nome do agente)
        </p>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
