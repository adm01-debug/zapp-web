/**
 * ExternalContact360Panel
 * 
 * Renders the full 360° view of a contact from the external CRM database.
 * Designed to be embedded inside ContactDetails as an accordion section.
 * 
 * Sections:
 * 1. Company card (logo, name, CNPJ, ramo, website)
 * 2. Customer profile (vendedor, compras, ticket médio)
 * 3. RFM Score visual
 * 4. Contact enrichment (cargo, DISC, behavior)
 * 5. Interactions timeline (last 10)
 * 6. Social media links
 * 7. Company address
 */
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { useExternalContact360 } from '@/hooks/useExternalContact360';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Building,
  Globe,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  User,
  Calendar,
  MessageSquare,
  Instagram,
  Linkedin,
  Facebook,
  ExternalLink,
  CircleDollarSign,
  Target,
  Heart,
  Briefcase,
  Award,
  BarChart3,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  Contact360Data,
  Contact360RFM,
  Contact360Customer,
  Contact360Company,
  Contact360Interaction,
} from '@/types/contact360';

interface ExternalContact360PanelProps {
  phone: string;
}

// ========================
// Sub-components
// ========================

function RFMBadge({ rfm }: { rfm: Contact360RFM }) {
  const segmentColors: Record<string, string> = {
    Champions: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    'Loyal Customers': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'Potential Loyalist': 'bg-sky-500/15 text-sky-600 border-sky-500/30',
    'Recent Customers': 'bg-violet-500/15 text-violet-600 border-violet-500/30',
    Promising: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
    'Need Attention': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    'About to Sleep': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    'At Risk': 'bg-red-500/15 text-red-600 border-red-500/30',
    Hibernating: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
    Lost: 'bg-gray-400/15 text-gray-400 border-gray-400/30',
    "Can't Lose Them": 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  };

  const color = segmentColors[rfm.segment_code || ''] || 'bg-muted/30 text-muted-foreground border-border/30';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn('text-xs', color)}>
          {rfm.segment_code || 'Sem segmento'}
        </Badge>
        {rfm.combined_score && (
          <span className="text-xs text-muted-foreground">
            Score: {rfm.combined_score.toFixed(1)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'R', value: rfm.recency_score, tip: 'Recência' },
          { label: 'F', value: rfm.frequency_score, tip: 'Frequência' },
          { label: 'M', value: rfm.monetary_score, tip: 'Monetário' },
        ].map(({ label, value, tip }) => (
          <div
            key={label}
            title={tip}
            className="flex flex-col items-center bg-muted/20 rounded-lg p-1.5"
          >
            <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
            <span className="text-sm font-medium">{value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyCard({ company }: { company: Contact360Company }) {
  const displayName = company.nome_fantasia || company.nome_crm || company.razao_social;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={displayName || ''}
            className="w-10 h-10 rounded-lg object-contain bg-white border border-border/30"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {company.cnpj && (
            <p className="text-[10px] text-muted-foreground font-mono">
              {company.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {company.ramo_atividade && (
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/20 rounded-md p-1.5">
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="truncate">{company.ramo_atividade}</span>
          </div>
        )}
        {company.porte_rf && (
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/20 rounded-md p-1.5">
            <Award className="w-3 h-3 shrink-0" />
            <span className="truncate">{company.porte_rf}</span>
          </div>
        )}
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline col-span-2 bg-primary/5 rounded-md p-1.5"
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{company.website.replace(/https?:\/\/(www\.)?/, '')}</span>
            <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
          </a>
        )}
      </div>
    </div>
  );
}

function CustomerProfile({ customer }: { customer: Contact360Customer }) {
  const formatCurrency = (v: number | null) =>
    v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Vendedor:</span>
          <span className="text-xs font-medium">{customer.vendedor_nome || '—'}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px]',
            customer.cliente_ativado
              ? 'bg-success/15 text-success border-success/30'
              : 'bg-destructive/15 text-destructive border-destructive/30'
          )}
        >
          {customer.cliente_ativado ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-muted/20 rounded-lg p-2 text-center">
          <ShoppingCart className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-sm font-medium">{customer.total_pedidos}</p>
          <p className="text-[10px] text-muted-foreground">Pedidos</p>
        </div>
        <div className="bg-muted/20 rounded-lg p-2 text-center">
          <CircleDollarSign className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-sm font-medium">{formatCurrency(customer.ticket_medio)}</p>
          <p className="text-[10px] text-muted-foreground">Ticket médio</p>
        </div>
        <div className="bg-muted/20 rounded-lg p-2 text-center col-span-2">
          <TrendingUp className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-sm font-medium">{formatCurrency(customer.valor_total_compras)}</p>
          <p className="text-[10px] text-muted-foreground">Total compras</p>
        </div>
      </div>

      {(customer.data_primeira_compra || customer.data_ultima_compra) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/10 rounded-md p-1.5">
          {customer.data_primeira_compra && (
            <span>
              1ª compra:{' '}
              {format(new Date(customer.data_primeira_compra), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
          {customer.data_ultima_compra && (
            <span>
              Última:{' '}
              {format(new Date(customer.data_ultima_compra), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function InteractionsTimeline({ interactions }: { interactions: Contact360Interaction[] }) {
  if (!interactions.length) return null;

  const channelEmoji: Record<string, string> = {
    whatsapp: '💬',
    email: '📧',
    phone: '📞',
    presencial: '🤝',
    chat: '💻',
  };

  const sentimentColor: Record<string, string> = {
    positive: 'text-success',
    neutral: 'text-muted-foreground',
    negative: 'text-warning',
    critical: 'text-destructive',
  };

  return (
    <div className="space-y-1.5">
      {interactions.slice(0, 5).map((interaction) => (
        <div
          key={interaction.id}
          className="flex items-start gap-2 text-xs bg-muted/10 rounded-md p-1.5"
        >
          <span className="shrink-0 text-base leading-none mt-0.5">
            {channelEmoji[interaction.channel] || '📝'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">
              {interaction.assunto || interaction.type || 'Interação'}
            </p>
            {interaction.resumo && (
              <p className="text-muted-foreground truncate">{interaction.resumo}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-muted-foreground">
              {format(new Date(interaction.data_interacao), 'dd/MM', { locale: ptBR })}
            </p>
            {interaction.sentiment && (
              <span className={cn('text-[10px]', sentimentColor[interaction.sentiment])}>
                {interaction.sentiment === 'positive' && '😊'}
                {interaction.sentiment === 'neutral' && '😐'}
                {interaction.sentiment === 'negative' && '😟'}
                {interaction.sentiment === 'critical' && '🔴'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialLinks({ social }: { social: { plataforma: string; url: string | null; handle: string | null }[] }) {
  if (!social.length) return null;

  const icons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="w-3.5 h-3.5" />,
    linkedin: <Linkedin className="w-3.5 h-3.5" />,
    facebook: <Facebook className="w-3.5 h-3.5" />,
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {social.map((s, i) => (
        <a
          key={i}
          href={s.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1 transition-colors"
          title={`${s.plataforma}: ${s.handle || ''}`}
        >
          {icons[s.plataforma] || <Globe className="w-3.5 h-3.5" />}
          <span className="truncate max-w-[100px]">{s.handle || s.plataforma}</span>
        </a>
      ))}
    </div>
  );
}

function AddressLine({ address }: { address: Contact360Data['company_address'] }) {
  if (!address) return null;
  const parts = [
    address.logradouro,
    address.numero && `nº ${address.numero}`,
    address.bairro,
    address.cidade && address.estado && `${address.cidade}/${address.estado}`,
    address.cep,
  ].filter(Boolean);

  const mapsUrl = address.latitude && address.longitude
    ? `https://www.google.com/maps?q=${address.latitude},${address.longitude}`
    : null;

  return (
    <div className="text-xs text-muted-foreground bg-muted/10 rounded-md p-2">
      <div className="flex items-start gap-1.5">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
        <div>
          <p>{parts.join(', ')}</p>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
            >
              Ver no mapa <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================
// Main Component
// ========================

function ExternalContact360PanelInner({ phone }: ExternalContact360PanelProps) {
  const { data, isLoading, error } = useExternalContact360(phone);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-20" />
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently hide if external DB not configured or error
  }

  if (!data.found) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/10 rounded-lg p-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Contato não encontrado no CRM ({data.searched_phone})</span>
      </div>
    );
  }

  const allSocial = [
    ...(data.contact_social || []),
    ...(data.company_social || []),
  ].filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Visão 360° CRM</span>
        {data.contact?.relationship_score != null && data.contact.relationship_score > 0 && (
          <Badge variant="outline" className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/30">
            Score: {data.contact.relationship_score}
          </Badge>
        )}
      </div>

      {/* Company */}
      {data.company && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-primary" />
            Empresa
          </h5>
          <CompanyCard company={data.company} />
        </div>
      )}

      {/* Customer profile */}
      {data.customer && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            Perfil comercial
          </h5>
          <CustomerProfile customer={data.customer} />
        </div>
      )}

      {/* RFM */}
      {data.rfm && data.rfm.segment_code && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            Segmento RFM
          </h5>
          <RFMBadge rfm={data.rfm} />
        </div>
      )}

      {/* Contact enrichment — cargo, behavior highlights */}
      {data.contact?.behavior && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-primary" />
            Perfil comportamental
          </h5>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {data.contact.behavior.discProfile && (
              <div className="bg-muted/20 rounded-md p-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">DISC</p>
                <p className="font-medium">{data.contact.behavior.discProfile}</p>
              </div>
            )}
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <p className="text-[10px] text-muted-foreground">Canal preferido</p>
              <p className="font-medium capitalize">{data.contact.behavior.preferredChannel}</p>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <p className="text-[10px] text-muted-foreground">Poder decisão</p>
              <p className="font-medium">{data.contact.behavior.decisionPower}/10</p>
            </div>
            <div className="bg-muted/20 rounded-md p-1.5 text-center">
              <p className="text-[10px] text-muted-foreground">Formalidade</p>
              <p className="font-medium">{data.contact.behavior.formalityLevel}/5</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactions timeline */}
      {data.contact_interactions && data.contact_interactions.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            Últimas interações ({data.contact_interactions.length})
          </h5>
          <InteractionsTimeline interactions={data.contact_interactions} />
        </div>
      )}

      {/* Social media */}
      {allSocial.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Redes sociais
          </h5>
          <SocialLinks social={allSocial} />
        </div>
      )}

      {/* Address */}
      {data.company_address && <AddressLine address={data.company_address} />}

      {/* Extra phones & emails */}
      {(data.company_phones?.length > 0 || data.company_emails?.length > 0) && (
        <div className="space-y-1 text-xs">
          {data.company_phones?.slice(0, 3).map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(p.numero_e164 || p.numero);
                toast.success('Telefone copiado!');
              }}
              title="Clique para copiar"
            >
              <Phone className="w-3 h-3" />
              <span>{p.numero_e164 || p.numero}</span>
              {p.is_whatsapp && <Badge variant="outline" className="text-[9px] py-0 px-1">WhatsApp</Badge>}
              {p.departamento && <span className="text-[10px]">({p.departamento})</span>}
              <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
            </div>
          ))}
          {data.company_emails?.slice(0, 3).map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(e.email);
                toast.success('Email copiado!');
              }}
              title="Clique para copiar"
            >
              <Mail className="w-3 h-3" />
              <span className="truncate">{e.email}</span>
              <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export const ExternalContact360Panel = memo(ExternalContact360PanelInner);
