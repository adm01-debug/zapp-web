import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, Trash2, Search, MapPin, AlertTriangle, Shield, ShieldOff, ShieldCheck } from 'lucide-react';
import { log } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Country {
  id: string;
  country_code: string;
  country_name: string;
  added_by?: string | null;
  blocked_by?: string | null;
  reason?: string | null;
  created_at: string;
}

interface GeoSettings {
  id: string;
  mode: 'disabled' | 'whitelist' | 'blacklist';
}

// Common countries list
const COUNTRIES = [
  { code: 'AF', name: 'Afeganistão' },
  { code: 'AL', name: 'Albânia' },
  { code: 'DZ', name: 'Argélia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Austrália' },
  { code: 'AT', name: 'Áustria' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BY', name: 'Bielorrússia' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'BO', name: 'Bolívia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'BG', name: 'Bulgária' },
  { code: 'CA', name: 'Canadá' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'HR', name: 'Croácia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CZ', name: 'República Tcheca' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'EC', name: 'Equador' },
  { code: 'EG', name: 'Egito' },
  { code: 'FI', name: 'Finlândia' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'GR', name: 'Grécia' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungria' },
  { code: 'IN', name: 'Índia' },
  { code: 'ID', name: 'Indonésia' },
  { code: 'IR', name: 'Irã' },
  { code: 'IQ', name: 'Iraque' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Itália' },
  { code: 'JP', name: 'Japão' },
  { code: 'KZ', name: 'Cazaquistão' },
  { code: 'KE', name: 'Quênia' },
  { code: 'KP', name: 'Coreia do Norte' },
  { code: 'KR', name: 'Coreia do Sul' },
  { code: 'MY', name: 'Malásia' },
  { code: 'MX', name: 'México' },
  { code: 'MA', name: 'Marrocos' },
  { code: 'NL', name: 'Holanda' },
  { code: 'NZ', name: 'Nova Zelândia' },
  { code: 'NG', name: 'Nigéria' },
  { code: 'NO', name: 'Noruega' },
  { code: 'PK', name: 'Paquistão' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'PL', name: 'Polônia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romênia' },
  { code: 'RU', name: 'Rússia' },
  { code: 'SA', name: 'Arábia Saudita' },
  { code: 'SG', name: 'Singapura' },
  { code: 'ZA', name: 'África do Sul' },
  { code: 'ES', name: 'Espanha' },
  { code: 'SE', name: 'Suécia' },
  { code: 'CH', name: 'Suíça' },
  { code: 'SY', name: 'Síria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Tailândia' },
  { code: 'TR', name: 'Turquia' },
  { code: 'UA', name: 'Ucrânia' },
  { code: 'AE', name: 'Emirados Árabes Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnã' },
];

export function GeoBlockingPanel() {
  const [settings, setSettings] = useState<GeoSettings | null>(null);
  const [allowedCountries, setAllowedCountries] = useState<Country[]>([]);
  const [blockedCountries, setBlockedCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryToRemove, setCountryToRemove] = useState<Country | null>(null);
  const [activeTab, setActiveTab] = useState<'whitelist' | 'blacklist'>('whitelist');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('geo_blocking_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsData) {
        setSettings(settingsData as GeoSettings);
      }

      // Fetch allowed countries
      const { data: allowedData } = await supabase
        .from('allowed_countries')
        .select('*')
        .order('created_at', { ascending: false });

      setAllowedCountries(allowedData || []);

      // Fetch blocked countries
      const { data: blockedData } = await supabase
        .from('blocked_countries')
        .select('*')
        .order('created_at', { ascending: false });

      setBlockedCountries(blockedData || []);
    } catch (error) {
      log.error('Error fetching geo data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (mode: 'disabled' | 'whitelist' | 'blacklist') => {
    if (!settings) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('geo_blocking_settings')
        .update({ mode, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, mode });
      
      const modeLabels = {
        disabled: 'Desativado',
        whitelist: 'Whitelist (apenas permitidos)',
        blacklist: 'Blacklist (bloqueados)'
      };
      
      toast.success(`Modo alterado para: ${modeLabels[mode]}`);
    } catch (error) {
      log.error('Error updating mode:', error);
      toast.error('Erro ao alterar modo');
    }
  };

  const handleAddCountry = async () => {
    if (!selectedCountry) {
      toast.error('Selecione um país');
      return;
    }

    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (!country) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const table = activeTab === 'whitelist' ? 'allowed_countries' : 'blocked_countries';
      const userField = activeTab === 'whitelist' ? 'added_by' : 'blocked_by';

      const { error } = await supabase
        .from(table)
        .insert({
          country_code: country.code,
          country_name: country.name,
          [userField]: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este país já está na lista');
          return;
        }
        throw error;
      }

      toast.success(`${country.name} adicionado à ${activeTab === 'whitelist' ? 'whitelist' : 'blacklist'}`);
      setDialogOpen(false);
      setSelectedCountry('');
      fetchData();
    } catch (error) {
      log.error('Error adding country:', error);
      toast.error('Erro ao adicionar país');
    }
  };

  const handleRemoveCountry = async () => {
    if (!countryToRemove) return;

    try {
      const table = activeTab === 'whitelist' ? 'allowed_countries' : 'blocked_countries';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', countryToRemove.id);

      if (error) throw error;

      toast.success(`${countryToRemove.country_name} removido`);
      setCountryToRemove(null);
      fetchData();
    } catch (error) {
      log.error('Error removing country:', error);
      toast.error('Erro ao remover país');
    }
  };

  const currentList = activeTab === 'whitelist' ? allowedCountries : blockedCountries;
  const filteredCountries = currentList.filter(country =>
    country.country_name.toLowerCase().includes(search.toLowerCase()) ||
    country.country_code.toLowerCase().includes(search.toLowerCase())
  );

  const availableCountries = COUNTRIES.filter(
    country => !currentList.some(c => c.country_code === country.code)
  );

  const getModeIcon = () => {
    switch (settings?.mode) {
      case 'whitelist':
        return <ShieldCheck className="w-5 h-5 text-green-500" />;
      case 'blacklist':
        return <Shield className="w-5 h-5 text-destructive" />;
      default:
        return <ShieldOff className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getModeLabel = () => {
    switch (settings?.mode) {
      case 'whitelist':
        return 'Whitelist Ativa';
      case 'blacklist':
        return 'Blacklist Ativa';
      default:
        return 'Desativado';
    }
  };

  const getModeDescription = () => {
    switch (settings?.mode) {
      case 'whitelist':
        return 'Apenas países na whitelist podem acessar';
      case 'blacklist':
        return 'Países na blacklist são bloqueados';
      default:
        return 'Todos os países podem acessar';
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {getModeIcon()}
              </div>
              <div>
                <CardTitle>Modo de Bloqueio Geográfico</CardTitle>
                <CardDescription>{getModeDescription()}</CardDescription>
              </div>
            </div>
            <Badge 
              variant={settings?.mode === 'disabled' ? 'secondary' : settings?.mode === 'whitelist' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {getModeLabel()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={settings?.mode === 'disabled' ? 'default' : 'outline'}
              className="flex-col h-auto py-4 gap-2"
              onClick={() => handleModeChange('disabled')}
            >
              <ShieldOff className="w-5 h-5" />
              <span className="text-xs">Desativado</span>
            </Button>
            <Button
              variant={settings?.mode === 'whitelist' ? 'default' : 'outline'}
              className="flex-col h-auto py-4 gap-2"
              onClick={() => handleModeChange('whitelist')}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs">Whitelist</span>
            </Button>
            <Button
              variant={settings?.mode === 'blacklist' ? 'default' : 'outline'}
              className="flex-col h-auto py-4 gap-2"
              onClick={() => handleModeChange('blacklist')}
            >
              <Shield className="w-5 h-5" />
              <span className="text-xs">Blacklist</span>
            </Button>
          </div>

          {settings?.mode === 'whitelist' && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Modo Whitelist Ativo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas usuários de países na whitelist ({allowedCountries.length}) podem acessar o sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings?.mode === 'blacklist' && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Modo Blacklist Ativo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuários de países bloqueados ({blockedCountries.length}) não podem acessar o sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Countries Lists */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Listas de Países</CardTitle>
                <CardDescription>Gerencie whitelist e blacklist de países</CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar País
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Adicionar à {activeTab === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                  </DialogTitle>
                  <DialogDescription>
                    {activeTab === 'whitelist' 
                      ? 'Países na whitelist terão acesso permitido.'
                      : 'Países na blacklist terão acesso bloqueado.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um país" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableCountries.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {activeTab === 'blacklist' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Todos os usuários deste país serão bloqueados.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddCountry}
                    variant={activeTab === 'blacklist' ? 'destructive' : 'default'}
                  >
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'whitelist' | 'blacklist')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="whitelist" className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                Whitelist ({allowedCountries.length})
              </TabsTrigger>
              <TabsTrigger value="blacklist" className="gap-2">
                <Shield className="w-4 h-4" />
                Blacklist ({blockedCountries.length})
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Countries List */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : filteredCountries.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {search ? 'Nenhum país encontrado' : `Nenhum país na ${activeTab}`}
                  </p>
                  {activeTab === 'whitelist' && settings?.mode === 'whitelist' && allowedCountries.length === 0 && (
                    <p className="text-xs text-amber-500 mt-2">
                      ⚠️ Atenção: com whitelist ativa e vazia, ninguém poderá acessar!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredCountries.map((country) => (
                      <motion.div
                        key={country.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${activeTab === 'whitelist' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                            <MapPin className={`w-4 h-4 ${activeTab === 'whitelist' ? 'text-green-500' : 'text-destructive'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{country.country_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {country.country_code}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Adicionado {formatDistanceToNow(new Date(country.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCountryToRemove(country)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Remove Confirmation */}
      <AlertDialog open={!!countryToRemove} onOpenChange={() => setCountryToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover País</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{countryToRemove?.country_name}</strong> da {activeTab}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCountry}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
