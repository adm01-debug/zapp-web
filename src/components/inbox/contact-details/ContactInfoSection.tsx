import { Phone, Mail, Calendar, User, Copy, Building, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { EnrichedContactData } from '@/hooks/useContactEnrichedData';

interface ContactInfoSectionProps {
  contact: {
    phone: string;
    email?: string;
    createdAt: Date;
  };
  enrichedData: EnrichedContactData | null | undefined;
}

export function ContactInfoSection({ contact, enrichedData }: ContactInfoSectionProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        Informações
      </h5>

      <div className="space-y-2">
        <div
          className="flex items-center justify-between gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors group cursor-pointer"
          onClick={() => copyToClipboard(contact.phone, 'Telefone')}
        >
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-foreground">{contact.phone}</span>
          </div>
          <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {contact.email && (
          <div
            className="flex items-center justify-between gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors group cursor-pointer"
            onClick={() => copyToClipboard(contact.email!, 'Email')}
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-foreground">{contact.email}</span>
            </div>
            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {enrichedData?.company && (
          <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
            <Building className="w-4 h-4 text-primary" />
            <span className="text-foreground">{enrichedData.company}</span>
          </div>
        )}

        {enrichedData?.job_title && (
          <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-foreground">{enrichedData.job_title}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-foreground">
            Cliente desde {format(contact.createdAt, "MMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}
