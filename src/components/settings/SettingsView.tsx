import { NPSDashboard } from '@/components/nps/NPSDashboard';
import { FollowUpSequences } from '@/components/settings/FollowUpSequences';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, MessageSquare, Bell, Palette, Save, RefreshCw, Loader2,
  Keyboard, Volume2, ArrowRight, Package, Globe, TrendingUp, Settings,
} from 'lucide-react';
import { SoundCustomizationPanel } from '@/components/settings/SoundCustomizationPanel';
import { ElevenLabsDialogue } from '@/components/voice/ElevenLabsDialogue';
import { ElevenLabsVoiceDesign } from '@/components/voice/ElevenLabsVoiceDesign';
import { MediaLibraryAdmin } from '@/components/settings/MediaLibraryAdmin';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { KeyboardShortcutsSettings } from '@/components/settings/KeyboardShortcutsSettings';
import { GlobalSettingsSection } from '@/components/settings/GlobalSettingsSection';
import { IntegrationKeysSection } from '@/components/settings/IntegrationKeysSection';
import { ScheduleSettings } from '@/components/settings/ScheduleSettings';
import { MessagesSettings } from '@/components/settings/MessagesSettings';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { PageTemplate } from '@/components/layout/PageTemplate';
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

  return (
    <PageTemplate
      title="Configurações"
      subtitle="Configure o comportamento da plataforma"
      icon={<Settings className="w-5 h-5" />}
      actions={
        <Button onClick={saveSettings} disabled={isSaving || isLoading} className="bg-whatsapp hover:bg-whatsapp-dark text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Alterações
        </Button>
      }
    >
      <Tabs defaultValue="schedule" className="space-y-4">
        {/* Scrollable tabs with fade edges */}
        <div className="relative">
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <TabsList className="bg-muted/50 inline-flex w-max gap-1 p-1">
              <TabsTrigger value="schedule" className="gap-2 whitespace-nowrap"><Clock className="w-4 h-4" />Horário</TabsTrigger>
              <TabsTrigger value="messages" className="gap-2 whitespace-nowrap"><MessageSquare className="w-4 h-4" />Mensagens</TabsTrigger>
              <TabsTrigger value="automation" className="gap-2 whitespace-nowrap"><RefreshCw className="w-4 h-4" />Automação</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 whitespace-nowrap"><Bell className="w-4 h-4" />Notificações</TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2 whitespace-nowrap"><Palette className="w-4 h-4" />Aparência</TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-2 whitespace-nowrap"><Keyboard className="w-4 h-4" />Atalhos</TabsTrigger>
              <TabsTrigger value="sounds" className="gap-2 whitespace-nowrap"><Volume2 className="w-4 h-4" />Sons</TabsTrigger>
              <TabsTrigger value="global" className="gap-2 whitespace-nowrap"><Globe className="w-4 h-4" />Global</TabsTrigger>
              <TabsTrigger value="followup" className="gap-2 whitespace-nowrap"><ArrowRight className="w-4 h-4" />Follow-up</TabsTrigger>
              <TabsTrigger value="media" className="gap-2 whitespace-nowrap"><Package className="w-4 h-4" />Mídia</TabsTrigger>
              <TabsTrigger value="nps" className="gap-2 whitespace-nowrap"><TrendingUp className="w-4 h-4" />NPS</TabsTrigger>
            </TabsList>
          </div>
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
        </div>

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
          <NotificationSettingsPanel />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings settings={settings} updateSettings={updateSettings} onResetOnboarding={handleResetOnboarding} />
        </TabsContent>

        <TabsContent value="shortcuts">
          <KeyboardShortcutsSettings />
        </TabsContent>

        <TabsContent value="sounds">
          <div className="space-y-6">
            <SoundCustomizationPanel />
            <ElevenLabsDialogue />
            <ElevenLabsVoiceDesign />
          </div>
        </TabsContent>

        <TabsContent value="global">
          <div className="space-y-6">
            <GlobalSettingsSection />
            <IntegrationKeysSection />
          </div>
        </TabsContent>

        <TabsContent value="followup">
          <FollowUpSequences />
        </TabsContent>

        <TabsContent value="media">
          <MediaLibraryAdmin />
        </TabsContent>

        <TabsContent value="nps">
          <NPSDashboard />
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}
