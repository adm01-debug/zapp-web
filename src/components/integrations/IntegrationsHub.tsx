import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, FileSpreadsheet, Bug, CreditCard, ArrowRight, Calendar } from 'lucide-react';
import { N8nIntegrationView } from './N8nIntegrationView';
import { GoogleSheetsIntegrationView } from './GoogleSheetsIntegrationView';
import { SentryIntegrationView } from './SentryIntegrationView';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';

type IntegrationView = 'hub' | 'n8n' | 'google-sheets' | 'sentry' | 'google-calendar';

const integrations = [
  {
    id: 'n8n' as const,
    name: 'n8n',
    description: 'Automação de workflows via webhooks. Conecte eventos do sistema a fluxos n8n.',
    icon: Zap,
    color: 'bg-warning',
    status: 'available' as const,
  },
  {
    id: 'google-sheets' as const,
    name: 'Google Sheets',
    description: 'Sincronize contatos, mensagens e relatórios com planilhas Google.',
    icon: FileSpreadsheet,
    color: 'bg-success',
    status: 'available' as const,
  },
  {
    id: 'sentry' as const,
    name: 'Sentry',
    description: 'Monitoramento de erros, performance e session replays em tempo real.',
    icon: Bug,
    color: 'bg-[#362D59]',
    status: 'available' as const,
  },
  {
    id: 'google-calendar' as const,
    name: 'Google Calendar',
    description: 'Sincronize agendamentos e follow-ups com o Google Calendar.',
    icon: Calendar,
    color: 'bg-[#4285F4]',
    status: 'available' as const,
  },
  {
    id: 'stripe' as const,
    name: 'Stripe',
    description: 'Pagamentos, assinaturas e faturamento. Requer chave API.',
    icon: CreditCard,
    color: 'bg-[#635BFF]',
    status: 'coming-soon' as const,
  },
];

export function IntegrationsHub() {
  const [currentView, setCurrentView] = useState<IntegrationView>('hub');

  if (currentView === 'n8n') return (
    <div>
      <div className="p-4 pb-0">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('hub')}>← Voltar</Button>
      </div>
      <N8nIntegrationView />
    </div>
  );

  if (currentView === 'google-sheets') return (
    <div>
      <div className="p-4 pb-0">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('hub')}>← Voltar</Button>
      </div>
      <GoogleSheetsIntegrationView />
    </div>
  );

  if (currentView === 'sentry') return (
    <div>
      <div className="p-4 pb-0">
        <Button variant="ghost" size="sm" onClick={() => setCurrentView('hub')}>← Voltar</Button>
      </div>
      <SentryIntegrationView />
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground text-sm">Conecte ferramentas externas ao seu sistema</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration, i) => (
          <motion.div key={integration.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-secondary/30 hover:border-primary/30 transition-colors h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.color}`}>
                    <integration.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <Badge variant={integration.status === 'available' ? 'default' : 'secondary'}>
                    {integration.status === 'available' ? 'Disponível' : 'Em Breve'}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{integration.name}</CardTitle>
                <CardDescription className="text-xs">{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={integration.status === 'available' ? 'default' : 'outline'}
                  disabled={integration.status !== 'available'}
                  onClick={() => integration.status === 'available' && setCurrentView(integration.id as IntegrationView)}
                >
                  {integration.status === 'available' ? (
                    <>Configurar <ArrowRight className="w-4 h-4 ml-1" /></>
                  ) : 'Em Breve'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
