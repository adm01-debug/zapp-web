import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, BellOff, BellRing, Smartphone, 
  AlertCircle, CheckCircle2, Info, Loader2,
  MessageSquare, Users, Clock, TrendingDown
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    toggleSubscription,
    showNotification,
  } = usePushNotifications();

  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'messages',
      name: 'Novas mensagens',
      description: 'Receba notificações quando novas mensagens chegarem',
      icon: <MessageSquare className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'mentions',
      name: 'Menções',
      description: 'Quando alguém mencionar você em uma conversa',
      icon: <Users className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'sla',
      name: 'Alertas de SLA',
      description: 'Quando um SLA estiver próximo de ser violado',
      icon: <Clock className="w-4 h-4" />,
      enabled: true,
    },
    {
      id: 'sentiment',
      name: 'Alertas de Sentimento',
      description: 'Quando detectar sentimento negativo em conversas',
      icon: <TrendingDown className="w-4 h-4" />,
      enabled: false,
    },
  ]);

  const [isToggling, setIsToggling] = useState(false);

  const handleToggleSubscription = async () => {
    setIsToggling(true);
    await toggleSubscription();
    setIsToggling(false);
  };

  const handleToggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const handleTestNotification = async () => {
    await showNotification({
      title: 'Teste de Notificação',
      body: 'Esta é uma notificação de teste do sistema!',
      icon: '/favicon.ico',
      tag: 'test',
      data: { type: 'test' },
    });
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Não suportado
        </Badge>
      );
    }

    if (permission === 'denied') {
      return (
        <Badge variant="destructive" className="gap-1">
          <BellOff className="w-3 h-3" />
          Bloqueado
        </Badge>
      );
    }

    if (isSubscribed) {
      return (
        <Badge className="gap-1 bg-success text-success-foreground">
          <CheckCircle2 className="w-3 h-3" />
          Ativo
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
        <Bell className="w-3 h-3" />
        Desativado
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-secondary/20 bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-secondary/20 bg-card hover:border-secondary/30 transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-whatsapp" />
            <CardTitle>Notificações Push</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Receba notificações mesmo quando o aplicativo estiver em segundo plano
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <motion.div
          layout
          className={cn(
            "flex items-center justify-between p-4 rounded-xl transition-all",
            isSubscribed 
              ? "bg-success/10 border border-success/20" 
              : "bg-muted/50 border border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: isSubscribed ? 1.1 : 1 }}
              className={cn(
                "p-2 rounded-lg",
                isSubscribed ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
              )}
            >
              {isSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </motion.div>
            <div>
              <p className="font-medium">
                {isSubscribed ? 'Notificações ativadas' : 'Ativar notificações push'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? 'Você receberá notificações em tempo real' 
                  : 'Clique para habilitar notificações'}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggleSubscription}
            disabled={!isSupported || permission === 'denied' || isToggling}
          />
        </motion.div>

        {/* Permission Warning */}
        <AnimatePresence>
          {permission === 'denied' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Permissão bloqueada</p>
                <p className="text-sm text-muted-foreground">
                  As notificações foram bloqueadas. Para ativá-las, acesse as configurações 
                  do seu navegador e permita notificações para este site.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browser Support Warning */}
        <AnimatePresence>
          {!isSupported && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20"
            >
              <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning dark:text-warning">Navegador não suportado</p>
                <p className="text-sm text-muted-foreground">
                  Seu navegador não suporta notificações push. Tente usar Chrome, Firefox, 
                  Edge ou Safari.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        <AnimatePresence>
          {isSubscribed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Tipos de notificação</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      layout
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors",
                        category.enabled ? "bg-muted/50" : "bg-muted/20 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-md",
                          category.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {category.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={() => handleToggleCategory(category.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Button */}
        <AnimatePresence>
          {isSubscribed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Separator className="my-4" />
              <Button
                variant="outline"
                onClick={handleTestNotification}
                className="w-full gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Testar Notificação
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
