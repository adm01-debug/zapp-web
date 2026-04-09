import React, { useEffect, useState } from 'react';
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

/** Animated number counter */
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    const start = Date.now();
    const startVal = displayed;
    const diff = value - startVal;
    
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(Math.round(startVal + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{displayed.toLocaleString('pt-BR')}</>;
}

export function ContactStatsCards({
  totalCount, contactCountByType, uniqueCompanies, contacts,
}: ContactStatsCardsProps) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = contacts.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

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

  // Calculate trend (percentage of recent vs total)
  const recentPct = totalCount > 0 ? Math.round((recentCount / totalCount) * 100) : 0;

  const stats = [
    {
      label: 'Total de Contatos',
      value: totalCount,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      trend: null as string | null,
    },
    {
      label: 'Novos (30 dias)',
      value: recentCount,
      icon: UserPlus,
      color: 'text-[hsl(142_71%_45%)]',
      bg: 'bg-[hsl(142_71%_45%)]/10',
      border: 'border-[hsl(142_71%_45%)]/20',
      trend: recentPct > 0 ? `+${recentPct}% do total` : null,
    },
    {
      label: 'Empresas',
      value: uniqueCompanies.length,
      icon: Building,
      color: 'text-[hsl(270_60%_60%)]',
      bg: 'bg-[hsl(270_60%_60%)]/10',
      border: 'border-[hsl(270_60%_60%)]/20',
      trend: null,
    },
    {
      label: topType ? TYPE_LABELS[topType[0]] || topType[0] : 'Tipo principal',
      value: topType?.[1] || 0,
      icon: TrendingUp,
      color: 'text-[hsl(38_92%_50%)]',
      bg: 'bg-[hsl(38_92%_50%)]/10',
      border: 'border-[hsl(38_92%_50%)]/20',
      trend: topType ? 'tipo predominante' : null,
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
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className={cn(
            "relative rounded-xl border bg-card p-4 overflow-hidden group hover:shadow-lg transition-shadow duration-200",
            stat.border
          )}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                <AnimatedCounter value={stat.value} />
              </p>
              {stat.trend && (
                <p className="text-[10px] text-muted-foreground/70 font-medium">{stat.trend}</p>
              )}
            </div>
            <motion.div
              className={cn("rounded-lg p-2.5", stat.bg)}
              whileHover={{ rotate: 8, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </motion.div>
          </div>
          {/* Decorative glow */}
          <div className={cn(
            "absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-[0.05] blur-2xl group-hover:opacity-[0.12] transition-opacity duration-500",
            stat.bg.replace('/10', '')
          )} />
        </motion.div>
      ))}
    </motion.div>
  );
}
