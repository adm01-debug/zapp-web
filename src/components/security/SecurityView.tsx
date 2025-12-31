import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Users, Activity, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecuritySettingsPanel } from './SecuritySettingsPanel';
import { BlockedIPsPanel } from './BlockedIPsPanel';
import { IPWhitelistPanel } from './IPWhitelistPanel';
import { RateLimitRealtimeAlerts } from './RateLimitRealtimeAlerts';
import { useUserRole } from '@/hooks/useUserRole';

export function SecurityView() {
  const { hasRole } = useUserRole();
  const isAdmin = hasRole('admin');

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Central de Segurança</h1>
            <p className="text-muted-foreground">
              Gerencie todas as configurações de segurança da sua conta e sistema
            </p>
          </div>
        </div>

        {/* Realtime Alerts for Admin */}
        {isAdmin && <RateLimitRealtimeAlerts />}

        {/* Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="account" className="gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Minha Conta</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="blocked" className="gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">IPs Bloqueados</span>
                </TabsTrigger>
                <TabsTrigger value="whitelist" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Whitelist</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="account">
            <SecuritySettingsPanel />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="blocked">
                <BlockedIPsPanel />
              </TabsContent>

              <TabsContent value="whitelist">
                <IPWhitelistPanel />
              </TabsContent>

              <TabsContent value="overview">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Alertas Recentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Visualize alertas de segurança recentes no Dashboard de Rate Limit
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => window.location.href = '/admin/rate-limit'}
                      >
                        Ver Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Gerenciamento de Roles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Configure roles e permissões para usuários do sistema
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => window.location.href = '/admin/roles'}
                      >
                        Gerenciar Roles
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </motion.div>
    </div>
  );
}
