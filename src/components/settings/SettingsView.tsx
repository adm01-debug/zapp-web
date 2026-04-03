import { motion } from '@/components/ui/motion';
import { NPSDashboard } from '@/components/nps/NPSDashboard';
import { FollowUpSequences } from '@/components/settings/FollowUpSequences';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, MessageSquare, Bell, Palette, Save, RefreshCw, Loader2,
  Keyboard, Volume2, ArrowRight, Package, Globe, TrendingUp,
} from 'lucide-react';
import { SoundCustomizationPanel } from '@/components/settings/SoundCustomizationPanel';
import { MediaLibraryAdmin } from '@/components/settings/MediaLibraryAdmin';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { KeyboardShortcutsSettings } from '@/components/settings/KeyboardShortcutsSettings';
import { GlobalSettingsSection } from '@/components/settings/GlobalSettingsSection';
import { IntegrationKeysSection } from '@/components/settings/IntegrationKeysSection';
import { ScheduleSettings } from '@/components/settings/ScheduleSettings';
import { MessagesSettings } from '@/components/settings/MessagesSettings';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';

export function SettingsView() {
  const { settings, isLoading, isSaving, updateSettings, saveSettings, toggleWorkDay } = useUserSettings();
  const { resetOnboarding } = useOnboarding();

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success('Tour de onboarding reiniciado! Volte ao Dashboard para iniciar o tour.');
  };

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
          <Button onClick={saveSettings} disabled={isSaving} className="bg-whatsapp hover:bg-whatsapp-dark text-primary-foreground">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="schedule" className="gap-2"><Clock className="w-4 h-4" />Horário</TabsTrigger>
          <TabsTrigger value="messages" className="gap-2"><MessageSquare className="w-4 h-4" />Mensagens</TabsTrigger>
          <TabsTrigger value="automation" className="gap-2"><RefreshCw className="w-4 h-4" />Automação</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" />Notificações</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="w-4 h-4" />Aparência</TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2"><Keyboard className="w-4 h-4" />Atalhos</TabsTrigger>
          <TabsTrigger value="sounds" className="gap-2"><Volume2 className="w-4 h-4" />Sons</TabsTrigger>
          <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4" />Global</TabsTrigger>
          <TabsTrigger value="followup" className="gap-2"><ArrowRight className="w-4 h-4" />Follow-up</TabsTrigger>
          <TabsTrigger value="media" className="gap-2"><Package className="w-4 h-4" />Mídia</TabsTrigger>
          <TabsTrigger value="nps" className="gap-2"><TrendingUp className="w-4 h-4" />NPS</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleSettings settings={settings} updateSettings={updateSettings} toggleWorkDay={toggleWorkDay} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesSettings settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationSettings settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <NotificationSettingsPanel />
          </motion.div>
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings settings={settings} updateSettings={updateSettings} onResetOnboarding={handleResetOnboarding} />
        </TabsContent>

        <TabsContent value="shortcuts">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <KeyboardShortcutsSettings />
          </motion.div>
        </TabsContent>

        <TabsContent value="sounds">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SoundCustomizationPanel />
            <ElevenLabsDialogue />
            <ElevenLabsVoiceDesign />
          </motion.div>
        </TabsContent>

        <TabsContent value="global">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlobalSettingsSection />
            <IntegrationKeysSection />
          </motion.div>
        </TabsContent>

        <TabsContent value="followup">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <FollowUpSequences />
          </motion.div>
        </TabsContent>

        <TabsContent value="media">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <MediaLibraryAdmin />
          </motion.div>
        </TabsContent>

        <TabsContent value="nps">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <NPSDashboard />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
