import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock, MessageSquare, Save, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BusinessHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  connectionName: string;
}

interface BusinessHour {
  id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface AwayMessage {
  id?: string;
  message: string;
  is_enabled: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const DEFAULT_HOURS: BusinessHour[] = DAYS_OF_WEEK.map((day) => ({
  day_of_week: day.value,
  is_open: day.value >= 1 && day.value <= 5, // Mon-Fri open by default
  open_time: '08:00',
  close_time: '18:00',
}));

const DEFAULT_AWAY_MESSAGE: AwayMessage = {
  message: 'Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos assim que possível!',
  is_enabled: true,
};

export function BusinessHoursDialog({
  open,
  onOpenChange,
  connectionId,
  connectionName,
}: BusinessHoursDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(DEFAULT_HOURS);
  const [awayMessage, setAwayMessage] = useState<AwayMessage>(DEFAULT_AWAY_MESSAGE);

  useEffect(() => {
    if (open && connectionId) {
      fetchSettings();
    }
  }, [open, connectionId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch business hours - using any to bypass type issues with new tables
      const { data: hoursData, error: hoursError } = await (supabase as any)
        .from('business_hours')
        .select('*')
        .eq('whatsapp_connection_id', connectionId);

      if (hoursError) throw hoursError;

      if (hoursData && hoursData.length > 0) {
        // Merge with defaults for any missing days
        const mergedHours = DEFAULT_HOURS.map((defaultHour) => {
          const existing = hoursData.find((h: any) => h.day_of_week === defaultHour.day_of_week);
          return existing
            ? {
                id: existing.id,
                day_of_week: existing.day_of_week,
                is_open: existing.is_open,
                open_time: existing.open_time,
                close_time: existing.close_time,
              }
            : defaultHour;
        });
        setBusinessHours(mergedHours);
      } else {
        setBusinessHours(DEFAULT_HOURS);
      }

      // Fetch away message
      const { data: awayData, error: awayError } = await (supabase as any)
        .from('away_messages')
        .select('*')
        .eq('whatsapp_connection_id', connectionId)
        .single();

      if (awayError && awayError.code !== 'PGRST116') throw awayError;

      if (awayData) {
        setAwayMessage({
          id: awayData.id,
          message: awayData.message,
          is_enabled: awayData.is_enabled,
        });
      } else {
        setAwayMessage(DEFAULT_AWAY_MESSAGE);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar as configurações de horário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert business hours
      for (const hour of businessHours) {
        const { error } = await (supabase as any).from('business_hours').upsert(
          {
            id: hour.id,
            whatsapp_connection_id: connectionId,
            day_of_week: hour.day_of_week,
            is_open: hour.is_open,
            open_time: hour.open_time,
            close_time: hour.close_time,
          },
          { onConflict: 'whatsapp_connection_id,day_of_week' }
        );

        if (error) throw error;
      }

      // Upsert away message
      const { error: awayError } = await (supabase as any).from('away_messages').upsert(
        {
          id: awayMessage.id,
          whatsapp_connection_id: connectionId,
          message: awayMessage.message,
          is_enabled: awayMessage.is_enabled,
        },
        { onConflict: 'whatsapp_connection_id' }
      );

      if (awayError) throw awayError;

      toast({
        title: 'Configurações salvas!',
        description: 'O horário de atendimento foi atualizado com sucesso.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setBusinessHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h))
    );
  };

  const copyToAllDays = (sourceDayOfWeek: number) => {
    const source = businessHours.find((h) => h.day_of_week === sourceDayOfWeek);
    if (!source) return;

    setBusinessHours((prev) =>
      prev.map((h) => ({
        ...h,
        is_open: source.is_open,
        open_time: source.open_time,
        close_time: source.close_time,
      }))
    );
    toast({ title: 'Horário copiado para todos os dias' });
  };

  const applyWeekdayTemplate = () => {
    setBusinessHours((prev) =>
      prev.map((h) => ({
        ...h,
        is_open: h.day_of_week >= 1 && h.day_of_week <= 5,
        open_time: '08:00',
        close_time: '18:00',
      }))
    );
    toast({ title: 'Template de dias úteis aplicado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Horário de Atendimento - {connectionName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="hours" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hours" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="message" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensagem Ausente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hours" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Configure o horário de funcionamento para cada dia da semana.
                </p>
                <Button variant="outline" size="sm" onClick={applyWeekdayTemplate}>
                  Dias úteis (8h-18h)
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {businessHours.map((hour) => {
                    const day = DAYS_OF_WEEK.find((d) => d.value === hour.day_of_week);
                    return (
                      <motion.div
                        key={hour.day_of_week}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: hour.day_of_week * 0.05 }}
                        className={cn(
                          'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                          hour.is_open
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border bg-muted/30'
                        )}
                      >
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={hour.is_open}
                              onCheckedChange={(checked) =>
                                updateHour(hour.day_of_week, 'is_open', checked)
                              }
                            />
                            <span
                              className={cn(
                                'font-medium',
                                !hour.is_open && 'text-muted-foreground'
                              )}
                            >
                              {day?.label}
                            </span>
                          </div>
                        </div>

                        {hour.is_open ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">De</Label>
                              <Input
                                type="time"
                                value={hour.open_time}
                                onChange={(e) =>
                                  updateHour(hour.day_of_week, 'open_time', e.target.value)
                                }
                                className="w-28"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Até</Label>
                              <Input
                                type="time"
                                value={hour.close_time}
                                onChange={(e) =>
                                  updateHour(hour.day_of_week, 'close_time', e.target.value)
                                }
                                className="w-28"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto"
                              onClick={() => copyToAllDays(hour.day_of_week)}
                              title="Copiar para todos os dias"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Fechado</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="message" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mensagem automática fora do horário</Label>
                  <p className="text-xs text-muted-foreground">
                    Esta mensagem será enviada automaticamente quando clientes entrarem em contato
                    fora do expediente.
                  </p>
                </div>
                <Switch
                  checked={awayMessage.is_enabled}
                  onCheckedChange={(checked) =>
                    setAwayMessage((prev) => ({ ...prev, is_enabled: checked }))
                  }
                />
              </div>

              <Textarea
                placeholder="Digite a mensagem de ausência..."
                value={awayMessage.message}
                onChange={(e) =>
                  setAwayMessage((prev) => ({ ...prev, message: e.target.value }))
                }
                disabled={!awayMessage.is_enabled}
                className="min-h-[150px]"
              />

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Variáveis disponíveis:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['{nome}', '{horario_abertura}', '{horario_fechamento}'].map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() =>
                        setAwayMessage((prev) => ({
                          ...prev,
                          message: prev.message + ' ' + v,
                        }))
                      }
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
