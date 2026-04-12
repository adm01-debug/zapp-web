import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, Clock, X } from 'lucide-react';
import { Message } from '@/types/chat';

export function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-[hsl(var(--info))]" />;
    case 'failed':
      return <X className="w-3 h-3 text-destructive" />;
    default:
      return <Clock className="w-3 h-3 animate-pulse" />;
  }
}
