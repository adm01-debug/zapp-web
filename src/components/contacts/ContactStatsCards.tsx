import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Building, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactStatsCardsProps {
  totalCount: number;
  contactCountByType: Record<string, number>;
  uniqueCompanies: string[];
  contacts: { created_at: string }[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function ContactStatsCards({
  totalCount, contactCountByType, uniqueCompanies, contacts,
}: ContactStatsCardsProps) {
  // Count contacts created in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = contacts.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

  // Find top type
  const topType = Object.entries(contactCountByType)
    .filter(([key]) => key !== 'all')
    .sort(([, a], [, b]) => b - a)[0];

  const TYPE_LABELS: Record<string, string> = {
    cliente: 'Clientes',
    fornecedor: 'Fornecedores',
    colaborador: 'Colaboradores',
    prestador_servico: 'Prestadores',
    lead: 'Leads',
    parceiro: 'Parceiros',
    sicoob_gifts: 'Sicoob Gifts',
    transportadora: 'Transportadoras',
    outros: 'Outros',
  };

  const stats = [
    {
      label: 'Total de Contatos',
      value: totalCount,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
    {
      label: 'Novos (30 dias)',
      value: recentCount,
      icon: UserPlus,
      color: 'text-[hsl(142_71%_45%)]',
      bg: 'bg-[hsl(142_71%_45%)]/10',
      border: 'border-[hsl(142_71%_45%)]/20',
    },
    {
      label: 'Empresas',
      value: uniqueCompanies.length,
      icon: Building,
      color: 'text-[hsl(270_60%_60%)]',
      bg: 'bg-[hsl(270_60%_60%)]/10',
      border: 'border-[hsl(270_60%_60%)]/20',
    },
    {
      label: topType ? TYPE_LABELS[topType[0]] || topType[0] : 'Tipo principal',
      value: topType?.[1] || 0,
      icon: TrendingUp,
      color: 'text-[hsl(38_92%_50%)]',
      bg: 'bg-[hsl(38_92%_50%)]/10',
      border: 'border-[hsl(38_92%_50%)]/20',
      suffix: topType ? 'contatos' : '',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={item}
          className={cn(
            "relative rounded-xl border bg-card p-4 overflow-hidden group hover:shadow-md transition-shadow duration-200",
            stat.border
          )}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value.toLocaleString('pt-BR')}
              </p>
              {stat.suffix && (
                <p className="text-[10px] text-muted-foreground">{stat.suffix}</p>
              )}
            </div>
            <div className={cn("rounded-lg p-2.5", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
          </div>
          {/* Decorative glow */}
          <div className={cn(
            "absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.07] blur-2xl",
            stat.bg.replace('/10', '')
          )} />
        </motion.div>
      ))}
    </motion.div>
  );
}
