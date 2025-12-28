import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Bot, 
  BarChart3, 
  Users, 
  Clock, 
  Shield 
} from 'lucide-react';

const benefits = [
  {
    icon: MessageCircle,
    title: 'Inbox Unificado',
    description: 'Todas conversas em um só lugar'
  },
  {
    icon: Bot,
    title: 'IA Integrada',
    description: 'Respostas automáticas inteligentes'
  },
  {
    icon: BarChart3,
    title: 'Analytics Avançado',
    description: 'Métricas em tempo real'
  },
  {
    icon: Users,
    title: 'Multi-agentes',
    description: 'Colaboração de equipe eficiente'
  },
  {
    icon: Clock,
    title: 'SLA Tracking',
    description: 'Monitore tempos de resposta'
  },
  {
    icon: Shield,
    title: 'Segurança Total',
    description: 'Dados criptografados'
  },
];

export function HeroBenefits() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="hidden lg:flex flex-col justify-center px-12 py-8"
    >
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Tudo que você precisa para
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8"
      >
        atender com excelência
      </motion.p>

      <div className="grid grid-cols-2 gap-4">
        {benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30 hover:border-primary/30 transition-all cursor-default"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <benefit.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{benefit.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Testimonial */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="mt-8 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20"
      >
        <p className="text-sm italic text-muted-foreground">
          "Reduzimos o tempo de resposta em 60% e aumentamos a satisfação do cliente para 98%."
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-bold">
            JM
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">João Mendes</p>
            <p className="text-[10px] text-muted-foreground">Head de Suporte, TechCorp</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
