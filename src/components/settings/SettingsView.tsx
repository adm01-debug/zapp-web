import { useState } from 'react';
import { motion } from '@/components/ui/motion';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
  Palette,
  Globe,
  Save,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function SettingsView() {
  const [settings, setSettings] = useState({
    // Horário de Atendimento
    businessHoursEnabled: true,
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
    workDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
    
    // Mensagens Automáticas
    welcomeMessage: 'Olá {{nome}}! 👋\nBem-vindo ao nosso atendimento.\nEm que podemos ajudar?',
    awayMessage: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.\nDeixe sua mensagem que retornaremos assim que possível!',
    closingMessage: 'Obrigado pelo contato! Seu atendimento foi finalizado.\nSe precisar de algo mais, é só chamar! 😊',
    
    // Chatbot
    autoAssignEnabled: true,
    autoAssignMethod: 'round-robin',
    inactivityTimeout: 30,
    
    // Notificações
    desktopNotifications: true,
    soundEnabled: true,
    notificationSound: 'default',
    
    // Aparência
    theme: 'dark',
    language: 'pt-BR',
    compactMode: false,
  });

  const handleSave = () => {
    toast({
      title: 'Configurações salvas!',
      description: 'Suas configurações foram atualizadas com sucesso.',
    });
  };

  const workDays = [
    { id: 'dom', label: 'Dom' },
    { id: 'seg', label: 'Seg' },
    { id: 'ter', label: 'Ter' },
    { id: 'qua', label: 'Qua' },
    { id: 'qui', label: 'Qui' },
    { id: 'sex', label: 'Sex' },
    { id: 'sab', label: 'Sáb' },
  ];

  const toggleWorkDay = (day: string) => {
    setSettings((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }));
  };

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
          <Button onClick={handleSave} className="bg-whatsapp hover:bg-whatsapp-dark text-white">
            <Save className="w-4 h-4 mr-2" />
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
                    checked={settings.businessHoursEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, businessHoursEnabled: checked })
                    }
                  />
                </div>

                {settings.businessHoursEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário de início</Label>
                        <Input
                          type="time"
                          value={settings.businessHoursStart}
                          onChange={(e) =>
                            setSettings({ ...settings, businessHoursStart: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário de término</Label>
                        <Input
                          type="time"
                          value={settings.businessHoursEnd}
                          onChange={(e) =>
                            setSettings({ ...settings, businessHoursEnd: e.target.value })
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
                              settings.workDays.includes(day.id)
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
                  value={settings.welcomeMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeMessage: e.target.value })
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
                  value={settings.awayMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, awayMessage: e.target.value })
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
                  value={settings.closingMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, closingMessage: e.target.value })
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
                    checked={settings.autoAssignEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoAssignEnabled: checked })
                    }
                  />
                </div>

                {settings.autoAssignEnabled && (
                  <div className="space-y-2">
                    <Label>Método de distribuição</Label>
                    <Select
                      value={settings.autoAssignMethod}
                      onValueChange={(value) =>
                        setSettings({ ...settings, autoAssignMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round-robin">Round-robin (sequencial)</SelectItem>
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
                    value={settings.inactivityTimeout}
                    onChange={(e) =>
                      setSettings({ ...settings, inactivityTimeout: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    max={1440}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-whatsapp" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure as notificações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notificações desktop</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas de novas mensagens
                    </p>
                  </div>
                  <Switch
                    checked={settings.desktopNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, desktopNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Sons de notificação</Label>
                    <p className="text-sm text-muted-foreground">
                      Tocar som ao receber mensagens
                    </p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, soundEnabled: checked })
                    }
                  />
                </div>

                {settings.soundEnabled && (
                  <div className="space-y-2">
                    <Label>Som de notificação</Label>
                    <Select
                      value={settings.notificationSound}
                      onValueChange={(value) =>
                        setSettings({ ...settings, notificationSound: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Padrão</SelectItem>
                        <SelectItem value="ding">Ding</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                        <SelectItem value="chime">Chime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
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
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) =>
                      setSettings({ ...settings, theme: value })
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
                      setSettings({ ...settings, language: value })
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
                    checked={settings.compactMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, compactMode: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
