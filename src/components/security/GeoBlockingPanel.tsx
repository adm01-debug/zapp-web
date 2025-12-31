import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, Trash2, Search, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedCountry {
  id: string;
  country_code: string;
  country_name: string;
  reason: string | null;
  blocked_by: string | null;
  created_at: string;
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
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [reason, setReason] = useState('');
  const [countryToRemove, setCountryToRemove] = useState<BlockedCountry | null>(null);

  useEffect(() => {
    fetchBlockedCountries();
  }, []);

  const fetchBlockedCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_countries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedCountries(data || []);
    } catch (error) {
      console.error('Error fetching blocked countries:', error);
      toast.error('Erro ao carregar países bloqueados');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCountry = async () => {
    if (!selectedCountry) {
      toast.error('Selecione um país');
      return;
    }

    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (!country) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('blocked_countries')
        .insert({
          country_code: country.code,
          country_name: country.name,
          reason: reason || null,
          blocked_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este país já está bloqueado');
          return;
        }
        throw error;
      }

      toast.success(`${country.name} bloqueado com sucesso`);
      setDialogOpen(false);
      setSelectedCountry('');
      setReason('');
      fetchBlockedCountries();
    } catch (error) {
      console.error('Error blocking country:', error);
      toast.error('Erro ao bloquear país');
    }
  };

  const handleUnblockCountry = async () => {
    if (!countryToRemove) return;

    try {
      const { error } = await supabase
        .from('blocked_countries')
        .delete()
        .eq('id', countryToRemove.id);

      if (error) throw error;

      toast.success(`${countryToRemove.country_name} desbloqueado`);
      setCountryToRemove(null);
      fetchBlockedCountries();
    } catch (error) {
      console.error('Error unblocking country:', error);
      toast.error('Erro ao desbloquear país');
    }
  };

  const filteredCountries = blockedCountries.filter(country =>
    country.country_name.toLowerCase().includes(search.toLowerCase()) ||
    country.country_code.toLowerCase().includes(search.toLowerCase())
  );

  const availableCountries = COUNTRIES.filter(
    country => !blockedCountries.some(bc => bc.country_code === country.code)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Globe className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Bloqueio Geográfico</CardTitle>
              <CardDescription>
                Bloqueie acessos de países específicos
              </CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Bloquear País
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bloquear País</DialogTitle>
                <DialogDescription>
                  Selecione um país para bloquear todos os acessos originados dele.
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
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Alto índice de tentativas de fraude"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Todos os usuários deste país serão bloqueados. Use com cautela.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleBlockCountry} variant="destructive">
                  Bloquear País
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
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
              {search ? 'Nenhum país encontrado' : 'Nenhum país bloqueado'}
            </p>
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
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <MapPin className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{country.country_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {country.country_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          Bloqueado {formatDistanceToNow(new Date(country.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                        {country.reason && (
                          <>
                            <span>•</span>
                            <span>{country.reason}</span>
                          </>
                        )}
                      </div>
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

        {/* Stats */}
        {blockedCountries.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>{blockedCountries.length}</strong> {blockedCountries.length === 1 ? 'país bloqueado' : 'países bloqueados'}
            </p>
          </div>
        )}
      </CardContent>

      {/* Unblock Confirmation */}
      <AlertDialog open={!!countryToRemove} onOpenChange={() => setCountryToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear País</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desbloquear <strong>{countryToRemove?.country_name}</strong>?
              Acessos deste país serão permitidos novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockCountry}>
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
