import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  description: string;
  payment_method?: string;
  payment_url?: string;
  pix_code?: string;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

interface PaymentMessageProps {
  payment: PaymentData;
  isSent: boolean;
  onViewDetails?: () => void;
  onCopyPixCode?: () => void;
}

const statusConfig = {
  pending: {
    label: 'Aguardando Pagamento',
    icon: Clock,
    variant: 'outline' as const,
    className: 'text-warning border-warning/50 bg-warning/10',
  },
  paid: {
    label: 'Pago',
    icon: CheckCircle2,
    variant: 'outline' as const,
    className: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10',
  },
  failed: {
    label: 'Falhou',
    icon: XCircle,
    variant: 'destructive' as const,
    className: 'text-destructive border-destructive/50 bg-destructive/10',
  },
  expired: {
    label: 'Expirado',
    icon: Clock,
    variant: 'outline' as const,
    className: 'text-muted-foreground border-muted-foreground/50 bg-muted/50',
  },
  refunded: {
    label: 'Reembolsado',
    icon: CreditCard,
    variant: 'outline' as const,
    className: 'text-info border-info/50 bg-info/10',
  },
};

export const PaymentMessage: React.FC<PaymentMessageProps> = ({
  payment,
  isSent,
  onViewDetails,
  onCopyPixCode,
}) => {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const config = statusConfig[payment.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl overflow-hidden max-w-[300px] border shadow-sm',
        isSent
          ? 'bg-primary/10 border-primary/30'
          : 'bg-card border-border/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30 bg-muted/30">
        <CreditCard className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Pagamento</span>
        <Badge className={cn('ml-auto text-[10px] px-1.5 py-0', config.className)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Descrição</p>
          <p className="text-sm font-medium text-foreground">{payment.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-xl font-bold text-primary">
              {formatPrice(payment.amount, payment.currency)}
            </p>
          </div>
          {payment.payment_method && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Método</p>
              <p className="text-sm font-medium text-foreground capitalize">
                {payment.payment_method}
              </p>
            </div>
          )}
        </div>

        {/* PIX Code */}
        {payment.pix_code && payment.status === 'pending' && (
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground mb-1">Código PIX</p>
            <p className="text-xs font-mono text-foreground break-all line-clamp-2">
              {payment.pix_code}
            </p>
            {onCopyPixCode && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs"
                onClick={onCopyPixCode}
              >
                Copiar código PIX
              </Button>
            )}
          </div>
        )}

        {/* Expiration */}
        {payment.expires_at && payment.status === 'pending' && (
          <p className="text-xs text-muted-foreground">
            Expira em: {new Date(payment.expires_at).toLocaleString('pt-BR')}
          </p>
        )}

        {/* Paid at */}
        {payment.paid_at && payment.status === 'paid' && (
          <p className="text-xs text-muted-foreground">
            Pago em: {new Date(payment.paid_at).toLocaleString('pt-BR')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {payment.payment_url && payment.status === 'pending' && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => window.open(payment.payment_url, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Pagar agora
            </Button>
          )}
          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={onViewDetails}
            >
              Detalhes
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
