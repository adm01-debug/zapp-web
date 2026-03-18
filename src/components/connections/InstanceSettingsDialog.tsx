import { useState, useEffect } from 'react';
import { log } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { toast } from 'sonner';
import { Loader2, Settings, Shield, User, Tag } from 'lucide-react';

interface InstanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
  connectionName: string;
}

export function InstanceSettingsDialog({
  open,
  onOpenChange,
  instanceName,
  connectionName,
}: InstanceSettingsDialogProps) {
  const {
    getSettings,
    setSettings,
    fetchProfile,
    updateProfileName,
    updateProfileStatus,
    updateProfilePicture,
    removeProfilePicture,
    updatePrivacySettings,
    findLabels,
    handleLabel,
    isLoading,
  } = useEvolutionApi();

  // Settings state
  const [settingsData, setSettingsData] = useState({
    rejectCall: false,
    msgCall: '',
    groupsIgnore: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
  });

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    status: '',
    pictureUrl: '',
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({
    readreceipts: 'all',
    profile: 'all',
    status: 'contacts',
    online: 'all',
    last: 'contacts',
    groupadd: 'contacts',
  });

  // Labels state
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loadingTab, setLoadingTab] = useState('');

  useEffect(() => {
    if (open && instanceName) {
      loadSettings();
      loadProfile();
    }
  }, [open, instanceName]);

  const loadSettings = async () => {
    setLoadingTab('settings');
    try {
      const data = await getSettings(instanceName);
      if (data) {
        setSettingsData({
          rejectCall: data.rejectCall ?? false,
          msgCall: data.msgCall ?? '',
          groupsIgnore: data.groupsIgnore ?? false,
          alwaysOnline: data.alwaysOnline ?? false,
          readMessages: data.readMessages ?? false,
          readStatus: data.readStatus ?? false,
          syncFullHistory: data.syncFullHistory ?? false,
        });
      }
    } catch (err) { log.debug('Failed to load instance data:', err); }
    setLoadingTab('');
  };

  const loadProfile = async () => {
    try {
      const data = await fetchProfile(instanceName);
      if (data) {
        setProfile({
          name: data.name ?? '',
          status: data.status ?? '',
          pictureUrl: data.profilePictureUrl ?? '',
        });
      }
    } catch (err) { log.debug('Failed to load instance data:', err); }
  };

  const loadLabels = async () => {
    setLoadingTab('labels');
    try {
      const data = await findLabels(instanceName);
      if (Array.isArray(data)) {
        setLabels(data);
      }
    } catch (err) { log.debug('Failed to load instance data:', err); }
    setLoadingTab('');
  };

  const handleSaveSettings = async () => {
    try {
      await setSettings({ instanceName, ...settingsData });
      toast.success('Configurações salvas!');
    } catch (err) {
      log.error('Error saving settings:', err);
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (profile.name) await updateProfileName(instanceName, profile.name);
      if (profile.status) await updateProfileStatus(instanceName, profile.status);
      toast.success('Perfil atualizado!');
    } catch (err) {
      log.error('Error updating profile:', err);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacySettings({ instanceName, ...privacy });
      toast.success('Privacidade atualizada!');
    } catch (err) {
      log.error('Error updating privacy:', err);
      toast.error('Erro ao atualizar privacidade');
    }
  };

  const settingsItems = [
    { key: 'rejectCall', label: 'Rejeitar chamadas', desc: 'Rejeita chamadas automaticamente' },
    { key: 'groupsIgnore', label: 'Ignorar grupos', desc: 'Não processar mensagens de grupos' },
    { key: 'alwaysOnline', label: 'Sempre online', desc: 'Mantém o status como online' },
    { key: 'readMessages', label: 'Leitura automática', desc: 'Marca mensagens como lidas automaticamente' },
    { key: 'readStatus', label: 'Ver status', desc: 'Marca status/stories como visualizados' },
    { key: 'syncFullHistory', label: 'Sincronizar histórico', desc: 'Baixa todo o histórico de mensagens' },
  ] as const;

  const privacyOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'contacts', label: 'Contatos' },
    { value: 'contact_blacklist', label: 'Contatos exceto...' },
    { value: 'none', label: 'Ninguém' },
  ];

  const privacyItems = [
    { key: 'readreceipts', label: 'Confirmação de leitura' },
    { key: 'profile', label: 'Foto de perfil' },
    { key: 'status', label: 'Status/recado' },
    { key: 'online', label: 'Online' },
    { key: 'last', label: 'Visto por último' },
    { key: 'groupadd', label: 'Adicionar em grupos' },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações — {connectionName}
          </DialogTitle>
          <DialogDescription>
            Gerencie configurações, perfil, privacidade e etiquetas da instância
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" onValueChange={(v) => { if (v === 'labels') loadLabels(); }}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Config</TabsTrigger>
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-1" /> Perfil</TabsTrigger>
            <TabsTrigger value="privacy"><Shield className="w-4 h-4 mr-1" /> Privacidade</TabsTrigger>
            <TabsTrigger value="labels"><Tag className="w-4 h-4 mr-1" /> Etiquetas</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            {settingsItems.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border/20 hover:bg-muted/10 transition-colors">
                <div>
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={settingsData[key] as boolean}
                  onCheckedChange={(checked) => setSettingsData((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
            {settingsData.rejectCall && (
              <div className="p-3 rounded-lg border border-border/20">
                <Label>Mensagem ao rejeitar</Label>
                <Input
                  value={settingsData.msgCall}
                  onChange={(e) => setSettingsData((prev) => ({ ...prev, msgCall: e.target.value }))}
                  placeholder="Não posso atender. Envie mensagem."
                  className="mt-1"
                />
              </div>
            )}
            <Button onClick={handleSaveSettings} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            {profile.pictureUrl && (
              <div className="flex justify-center">
                <img src={profile.pictureUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-primary/30" />
              </div>
            )}
            <div>
              <Label>Nome</Label>
              <Input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Nome do perfil" />
            </div>
            <div>
              <Label>Recado (Status)</Label>
              <Input value={profile.status} onChange={(e) => setProfile(p => ({ ...p, status: e.target.value }))} placeholder="Seu recado aqui..." />
            </div>
            <div>
              <Label>Nova foto de perfil (URL)</Label>
              <div className="flex gap-2">
                <Input
                  value={profile.pictureUrl}
                  onChange={(e) => setProfile(p => ({ ...p, pictureUrl: e.target.value }))}
                  placeholder="https://exemplo.com/foto.jpg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      if (profile.pictureUrl) {
                        await updateProfilePicture(instanceName, profile.pictureUrl);
                        toast.success('Foto atualizada!');
                      }
                    } catch (err) { log.error('Error updating photo:', err); toast.error('Erro ao atualizar foto'); }
                  }}
                >
                  Aplicar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    try {
                      await removeProfilePicture(instanceName);
                      setProfile(p => ({ ...p, pictureUrl: '' }));
                      toast.success('Foto removida');
                    } catch (err) { log.error('Error removing photo:', err); toast.error('Erro ao remover foto'); }
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Perfil
            </Button>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4 mt-4">
            {privacyItems.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border/20">
                <Label className="text-sm">{label}</Label>
                <select
                  value={privacy[key]}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm bg-background border border-border rounded-md px-2 py-1"
                >
                  {privacyOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
            <Button onClick={handleSavePrivacy} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Privacidade
            </Button>
          </TabsContent>

          {/* Labels Tab */}
          <TabsContent value="labels" className="space-y-4 mt-4">
            {loadingTab === 'labels' ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : labels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma etiqueta encontrada. Etiquetas são criadas no WhatsApp Business.
              </div>
            ) : (
              <div className="space-y-2">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/20">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="text-sm font-medium flex-1">{label.name}</span>
                    <span className="text-xs text-muted-foreground">ID: {label.id}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
