import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Mail, Link2, CheckCircle2, XCircle, RefreshCw, Shield,
  Clock, Inbox, Send, Tag, Bell, Loader2, Trash2
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';

export function GmailIntegration() {
  const {
    accounts,
    accountsLoading,
    connectGmail,
    disconnectGmail,
    syncInbox,
    syncLabels,
  } = useGmail();

  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5);
  const [notifyNewEmails, setNotifyNewEmails] = useState(true);

  const handleConnect = () => {
    connectGmail.mutate();
  };

  const handleDisconnect = (accountId: string) => {
    disconnectGmail.mutate(accountId);
  };

  const handleSync = (accountId: string) => {
    syncInbox.mutate({ query: 'in:inbox', maxResults: 50 });
  };

  const handleSyncLabels = () => {
    syncLabels.mutate();
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Mail className="w-6 h-6 text-destructive" />
          Gmail
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Integre seu Gmail para receber e enviar emails diretamente do Zapp
        </p>
      </motion.div>

      {/* Connected Accounts */}
      <Card className="border-secondary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contas Conectadas</CardTitle>
            <Badge variant={accounts.length > 0 ? 'default' : 'secondary'}>
              {accounts.length > 0 ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> {accounts.length} conectada{accounts.length > 1 ? 's' : ''}</>
              ) : 'Nenhuma conta'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando contas...
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{account.email_address}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {account.sync_status === 'synced' && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-success" />}
                          {account.sync_status === 'syncing' && <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />}
                          {account.sync_status === 'error' && <XCircle className="w-2.5 h-2.5 mr-0.5 text-destructive" />}
                          {account.sync_status}
                        </Badge>
                        {account.last_sync_at && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(account.last_sync_at).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(account.id)}
                      disabled={syncInbox.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncInbox.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Conecte sua conta Gmail para comecar a receber e enviar emails
              </p>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={connectGmail.isPending}
            className="w-full"
          >
            {connectGmail.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Conectar conta Gmail
          </Button>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card className="border-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sincronizacao
          </CardTitle>
          <CardDescription>Configure como os emails sao sincronizados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Sincronizacao automatica</Label>
              <p className="text-xs text-muted-foreground">Buscar novos emails periodicamente</p>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Notificar novos emails</Label>
              <p className="text-xs text-muted-foreground">Receber alertas quando chegar email novo</p>
            </div>
            <Switch checked={notifyNewEmails} onCheckedChange={setNotifyNewEmails} />
          </div>

          {accounts.length > 0 && (
            <>
              <Separator />
              <Button variant="outline" size="sm" onClick={handleSyncLabels} className="w-full">
                <Tag className="w-4 h-4 mr-2" />
                Sincronizar Labels do Gmail
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card className="border-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recursos da Integracao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Inbox, label: 'Inbox unificado', desc: 'Emails no mesmo painel dos chats' },
              { icon: Send, label: 'Enviar emails', desc: 'Componha e responda emails' },
              { icon: Tag, label: 'Labels & Tags', desc: 'Sincronize labels do Gmail' },
              { icon: Bell, label: 'Notificacoes', desc: 'Alertas em tempo real' },
              { icon: Link2, label: 'Contatos vinculados', desc: 'Match automatico por email' },
              { icon: Shield, label: 'OAuth seguro', desc: 'Autenticacao via Google OAuth 2.0' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 p-2 rounded-md bg-secondary/10">
                <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
