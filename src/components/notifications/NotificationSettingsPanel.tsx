import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  Moon, 
  AlertTriangle, 
  MessageSquare,
  AtSign,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useNotificationSettings, NotificationSettings } from '@/hooks/useNotificationSettings';
import { previewSound, requestNotificationPermission, SoundType } from '@/utils/notificationSounds';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SOUND_TYPES: { value: SoundType; label: string; description: string }[] = [
  { value: 'chime', label: 'Chime', description: 'Tom suave e harmonioso' },
  { value: 'beep', label: 'Beep', description: 'Som eletrônico clássico' },
  { value: 'bell', label: 'Sino', description: 'Som de campainha' },
  { value: 'alert', label: 'Alerta', description: 'Som mais chamativo' },
  { value: 'soft', label: 'Suave', description: 'Notificação discreta' },
];

export function NotificationSettingsPanel() {
  const { settings, updateSettings, resetSettings, isQuietHours } = useNotificationSettings();
  const [isTestingSound, setIsTestingSound] = useState(false);

  const handleTestSound = async () => {
    setIsTestingSound(true);
    previewSound(settings.soundType, settings.soundVolume);
    setTimeout(() => setIsTestingSound(false), 1000);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast({
        title: '✅ Permissão concedida',
        description: 'Você receberá notificações do navegador.',
      });
    } else {
      toast({
        title: '⚠️ Permissão negada',
        description: 'Ative as notificações nas configurações do navegador.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    resetSettings();
    toast({
      title: '🔄 Configurações resetadas',
      description: 'As preferências de notificação foram restauradas ao padrão.',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Master Sound Control */}
      <Card className="border-secondary/20 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Sons de Notificação</CardTitle>
                <CardDescription>Configurações globais de áudio</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>
        </CardHeader>
        
        {settings.soundEnabled && (
          <CardContent className="space-y-6">
            {/* Sound Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Som</Label>
              <div className="flex gap-3 items-center">
                <Select
                  value={settings.soundType}
                  onValueChange={(value: SoundType) => updateSettings({ soundType: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o tipo de som" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleTestSound}
                  disabled={isTestingSound}
                  className={cn(
                    "transition-all",
                    isTestingSound && "bg-primary/10"
                  )}
                >
                  <Play className={cn("w-4 h-4", isTestingSound && "animate-pulse")} />
                </Button>
              </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Volume</Label>
                <Badge variant="secondary" className="font-mono">
                  {settings.soundVolume}%
                </Badge>
              </div>
              <Slider
                value={[settings.soundVolume]}
                onValueChange={([value]) => updateSettings({ soundVolume: value })}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notification Types */}
      <Card className="border-secondary/20 bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-info" />
            </div>
            <div>
              <CardTitle className="text-lg">Tipos de Notificação</CardTitle>
              <CardDescription>Escolha quais eventos devem notificar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Message */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium">Novas Mensagens</p>
                <p className="text-sm text-muted-foreground">Receber quando chegar nova mensagem</p>
              </div>
            </div>
            <Switch
              checked={settings.newMessageSound}
              onCheckedChange={(checked) => updateSettings({ newMessageSound: checked })}
            />
          </div>

          <Separator />

          {/* Mentions */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-secondary" />
              <div>
                <p className="font-medium">Menções</p>
                <p className="text-sm text-muted-foreground">Quando alguém mencionar você</p>
              </div>
            </div>
            <Switch
              checked={settings.mentionSound}
              onCheckedChange={(checked) => updateSettings({ mentionSound: checked })}
            />
          </div>

          <Separator />

          {/* SLA Breach */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium">Violação de SLA</p>
                <p className="text-sm text-muted-foreground">Alerta quando SLA for violado</p>
              </div>
            </div>
            <Switch
              checked={settings.slaBreachSound}
              onCheckedChange={(checked) => updateSettings({ slaBreachSound: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Browser Notifications */}
      <Card className="border-secondary/20 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-lg">Notificações do Navegador</CardTitle>
                <CardDescription>Pop-ups mesmo com a aba minimizada</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.browserNotifications}
              onCheckedChange={(checked) => updateSettings({ browserNotifications: checked })}
            />
          </div>
        </CardHeader>
        {settings.browserNotifications && (
          <CardContent>
            <Button
              variant="outline"
              onClick={handleRequestPermission}
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Solicitar Permissão do Navegador
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Quiet Hours */}
      <Card className="border-secondary/20 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Moon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Horário Silencioso</CardTitle>
                <CardDescription>Desativar sons em horários específicos</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isQuietHours() && (
                <Badge variant="secondary" className="bg-muted">
                  Ativo agora
                </Badge>
              )}
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(checked) => updateSettings({ quietHoursEnabled: checked })}
              />
            </div>
          </div>
        </CardHeader>
        {settings.quietHoursEnabled && (
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Início</Label>
                <Input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Fim</Label>
                <Input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={handleReset}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Restaurar Configurações Padrão
      </Button>
    </motion.div>
  );
}
