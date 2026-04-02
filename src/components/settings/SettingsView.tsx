import { motion } from '@/components/ui/motion';
import { AvatarUpload } from '@/components/settings/AvatarUpload';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  MessageSquare,
  Bell,
  Palette,
  Save,
  RefreshCw,
  Loader2,
  Mic,
  GraduationCap,
  Keyboard,
  Volume2,
} from 'lucide-react';
import { SoundCustomizationPanel } from '@/components/settings/SoundCustomizationPanel';
import { AutoCloseSettings } from '@/components/settings/AutoCloseSettings';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { KeyboardShortcutsSettings } from '@/components/settings/KeyboardShortcutsSettings';
import { GlobalSettingsSection } from '@/components/settings/GlobalSettingsSection';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Globe, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { WavoipSettings } from '@/components/settings/WavoipSettings';

export function SettingsView() {
  const { settings, isLoading, isSaving, updateSettings, saveSettings, toggleWorkDay } = useUserSettings();
  const { resetOnboarding } = useOnboarding();

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success('Tour de onboarding reiniciado! Volte ao Dashboard para iniciar o tour.');
  };

  const workDays = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
        <AuroraBorealis />
        <FloatingParticles />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full relative bg-background">
      <AuroraBorealis />
      <FloatingParticles />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between relative z-10"
      >
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl font-bold text-foreground neon-underline"
          >
            Configurações
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-muted-foreground"
          >
            Configure o comportamento da plataforma
          </motion.p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }}
        >
          <Button onClick={saveSettings} disabled={isSaving} className="bg-whatsapp hover:bg-whatsapp-dark text-white">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="w-4 h-4" />
            Horário
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2">
            <Keyboard className="w-4 h-4" />
            Atalhos
          </TabsTrigger>
          <TabsTrigger value="sounds" className="gap-2">
            <Volume2 className="w-4 h-4" />
            Sons
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Globe className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="voip" className="gap-2">
            <Phone className="w-4 h-4" />
            Chamadas
          </TabsTrigger>
        </TabsList>

        {/* Horário de Atendimento */}
        <TabsContent value="schedule">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-whatsapp" />
                  Horário de Atendimento
                </CardTitle>
                <CardDescription>
                  Configure o horário de funcionamento do atendimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Habilitar horário de atendimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Fora do horário, uma mensagem de ausência será enviada
                    </p>
                  </div>
                  <Switch
                    checked={settings.business_hours_enabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ business_hours_enabled: checked })
                    }
                  />
                </div>

                {settings.business_hours_enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário de início</Label>
                        <Input
                          type="time"
                          value={settings.business_hours_start}
                          onChange={(e) =>
                            updateSettings({ business_hours_start: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário de término</Label>
                        <Input
                          type="time"
                          value={settings.business_hours_end}
                          onChange={(e) =>
                            updateSettings({ business_hours_end: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Dias de atendimento</Label>
                      <div className="flex gap-2">
                        {workDays.map((day) => (
                          <motion.button
                            key={day.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleWorkDay(day.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              settings.work_days.includes(day.id)
                                ? 'bg-whatsapp text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {day.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Mensagens Automáticas */}
        <TabsContent value="messages">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle>Mensagem de Boas-Vindas</CardTitle>
                <CardDescription>
                  Enviada automaticamente ao início de um novo atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.welcome_message}
                  onChange={(e) =>
                    updateSettings({ welcome_message: e.target.value })
                  }
                  rows={4}
                  placeholder="Olá! Como podemos ajudar?"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Variáveis disponíveis: {"{{nome}}"}, {"{{saudacao}}"}, {"{{protocolo}}"}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle>Mensagem de Ausência</CardTitle>
                <CardDescription>
                  Enviada fora do horário de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.away_message}
                  onChange={(e) =>
                    updateSettings({ away_message: e.target.value })
                  }
                  rows={4}
                  placeholder="No momento estamos fora do horário de atendimento..."
                />
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle>Mensagem de Encerramento</CardTitle>
                <CardDescription>
                  Enviada ao finalizar um atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.closing_message}
                  onChange={(e) =>
                    updateSettings({ closing_message: e.target.value })
                  }
                  rows={4}
                  placeholder="Obrigado pelo contato!"
                />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Automação */}
        <TabsContent value="automation">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-whatsapp" />
                  Atribuição Automática
                </CardTitle>
                <CardDescription>
                  Configure como os chats são distribuídos entre os atendentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Habilitar atribuição automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Distribui chats automaticamente entre os atendentes online
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_assignment_enabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ auto_assignment_enabled: checked })
                    }
                  />
                </div>

                {settings.auto_assignment_enabled && (
                  <div className="space-y-2">
                    <Label>Método de distribuição</Label>
                    <Select
                      value={settings.auto_assignment_method}
                      onValueChange={(value) =>
                        updateSettings({ auto_assignment_method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roundrobin">Round-robin (sequencial)</SelectItem>
                        <SelectItem value="random">Aleatório</SelectItem>
                        <SelectItem value="least-busy">Menor carga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tempo de inatividade (minutos)</Label>
                  <p className="text-sm text-muted-foreground">
                    Fechar chat automaticamente após inatividade
                  </p>
                  <Input
                    type="number"
                    value={settings.inactivity_timeout}
                    onChange={(e) =>
                      updateSettings({ inactivity_timeout: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    max={1440}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-whatsapp" />
                  Transcrição de Áudio
                </CardTitle>
                <CardDescription>
                  Configure a transcrição automática de mensagens de áudio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Transcrição automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Transcreve automaticamente áudios recebidos para texto
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_transcription_enabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ auto_transcription_enabled: checked })
                    }
                  />
                </div>
                {settings.auto_transcription_enabled && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    💡 Os áudios serão transcritos automaticamente assim que chegarem, 
                    facilitando a busca e análise por IA.
                  </p>
                )}
              </CardContent>
            </Card>

            <AutoCloseSettings />
          </motion.div>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <NotificationSettingsPanel />
          </motion.div>
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-whatsapp" />
                  Aparência
                </CardTitle>
                <CardDescription>
                  Personalize a aparência da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>Foto do Perfil</Label>
                  <AvatarUpload />
                </div>

                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) =>
                      updateSettings({ theme: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      updateSettings({ language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Modo compacto</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduz espaçamentos para mostrar mais conteúdo
                    </p>
                  </div>
                  <Switch
                    checked={settings.compact_mode}
                    onCheckedChange={(checked) =>
                      updateSettings({ compact_mode: checked })
                    }
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-whatsapp" />
                        Tour de Onboarding
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Reinicie o tour guiado para conhecer todas as funcionalidades
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleResetOnboarding}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reiniciar Tour
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Atalhos de Teclado */}
        <TabsContent value="shortcuts">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <KeyboardShortcutsSettings />
          </motion.div>
        </TabsContent>

        {/* Sons Personalizados */}
        <TabsContent value="sounds">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SoundCustomizationPanel />
          </motion.div>
        </TabsContent>

        {/* Global Settings */}
        <TabsContent value="global">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlobalSettingsSection />
          </motion.div>
        </TabsContent>

        {/* VoIP / Wavoip Settings */}
        <TabsContent value="voip">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WavoipSettings />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
