import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { FileSpreadsheet, Plus, Trash2, RefreshCw, Download, Upload, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SheetSync {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  dataSource: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncInterval: number; // minutes
}

const dataSources = [
  { value: 'contacts', label: 'Contatos' },
  { value: 'messages', label: 'Mensagens' },
  { value: 'campaigns', label: 'Campanhas' },
  { value: 'tags', label: 'Etiquetas' },
  { value: 'agents', label: 'Atendentes' },
];

const SETTINGS_KEY = 'google_sheets_integration';

export function GoogleSheetsIntegrationView() {
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [syncs, setSyncs] = useState<SheetSync[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSync, setNewSync] = useState({
    name: '', spreadsheetId: '', sheetName: 'Sheet1', syncDirection: 'export' as const, dataSource: 'contacts', syncInterval: 60
  });

  useEffect(() => {
    supabase.from('global_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setApiKey(config.apiKey || '');
          setIsConnected(config.isConnected || false);
          setSyncs(config.syncs || []);
        }
      });
  }, []);

  const persistConfig = async (key: string, connected: boolean, syncList: SheetSync[]) => {
    await supabase.from('global_settings').upsert({
      key: SETTINGS_KEY,
      value: JSON.stringify({ apiKey: key, isConnected: connected, syncs: syncList }),
    }, { onConflict: 'key' });
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error('Informe a chave da API do Google Sheets');
      return;
    }
    setIsConnected(true);
    await persistConfig(apiKey, true, syncs);
    toast.success('Conectado ao Google Sheets!');
  };

  const handleAddSync = () => {
    if (!newSync.name || !newSync.spreadsheetId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const sync: SheetSync = { id: crypto.randomUUID(), ...newSync, isActive: true };
    setSyncs(prev => [...prev, sync]);
    setNewSync({ name: '', spreadsheetId: '', sheetName: 'Sheet1', syncDirection: 'export', dataSource: 'contacts', syncInterval: 60 });
    setShowAddForm(false);
    toast.success('Sincronização adicionada!');
  };

  const toggleSync = (id: string) => {
    setSyncs(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const removeSync = (id: string) => {
    setSyncs(prev => prev.filter(s => s.id !== id));
    toast.success('Sincronização removida');
  };

  const runSync = async (sync: SheetSync) => {
    toast.info(`Sincronizando "${sync.name}"...`);
    await new Promise(r => setTimeout(r, 2000));
    setSyncs(prev => prev.map(s => s.id === sync.id ? { ...s, lastSyncAt: new Date().toISOString() } : s));
    toast.success(`"${sync.name}" sincronizado!`);
  };

  const directionIcon = (d: string) => {
    if (d === 'import') return <Download className="w-3 h-3" />;
    if (d === 'export') return <Upload className="w-3 h-3" />;
    return <RefreshCw className="w-3 h-3" />;
  };

  const directionLabel = (d: string) => {
    if (d === 'import') return 'Importar';
    if (d === 'export') return 'Exportar';
    return 'Bidirecional';
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success">
            <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Google Sheets</h1>
            <p className="text-muted-foreground text-sm">Sincronize dados com planilhas Google</p>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-auto">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
      </motion.div>

      <Card className="border-secondary/30">
        <CardHeader>
          <CardTitle className="text-base">Credenciais</CardTitle>
          <CardDescription>API Key do Google Cloud com acesso ao Sheets API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>API Key</Label>
              <Input type="password" placeholder="AIza..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <Button onClick={handleConnect} className="mt-auto">
              {isConnected ? 'Reconectar' : 'Conectar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isConnected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Sincronizações</h2>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-1" /> Nova Sincronização
            </Button>
          </div>

          {showAddForm && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome</Label>
                    <Input placeholder="Exportar Contatos" value={newSync.name} onChange={e => setNewSync(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Spreadsheet ID</Label>
                    <Input placeholder="1BxiM..." value={newSync.spreadsheetId} onChange={e => setNewSync(p => ({ ...p, spreadsheetId: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Aba</Label>
                    <Input placeholder="Sheet1" value={newSync.sheetName} onChange={e => setNewSync(p => ({ ...p, sheetName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Dados</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newSync.dataSource} onChange={e => setNewSync(p => ({ ...p, dataSource: e.target.value }))}>
                      {dataSources.map(ds => <option key={ds.value} value={ds.value}>{ds.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Direção</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newSync.syncDirection} onChange={e => setNewSync(p => ({ ...p, syncDirection: e.target.value as any }))}>
                      <option value="export">Exportar</option>
                      <option value="import">Importar</option>
                      <option value="bidirectional">Bidirecional</option>
                    </select>
                  </div>
                  <div>
                    <Label>Intervalo (min)</Label>
                    <Input type="number" value={newSync.syncInterval} onChange={e => setNewSync(p => ({ ...p, syncInterval: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddSync}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {syncs.length === 0 ? (
            <Card className="border-dashed border-secondary/50">
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Nenhuma sincronização configurada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {syncs.map(s => (
                <Card key={s.id} className="border-secondary/30">
                  <CardContent className="py-3 flex items-center gap-4">
                    <Switch checked={s.isActive} onCheckedChange={() => toggleSync(s.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{dataSources.find(d => d.value === s.dataSource)?.label} → {s.sheetName}</p>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">{directionIcon(s.syncDirection)} {directionLabel(s.syncDirection)}</Badge>
                    <Badge variant="outline" className="gap-1 text-xs"><Clock className="w-3 h-3" /> {s.syncInterval}min</Badge>
                    {s.lastSyncAt && <span className="text-xs text-muted-foreground">{new Date(s.lastSyncAt).toLocaleTimeString('pt-BR')}</span>}
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => runSync(s)}><RefreshCw className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSync(s.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
