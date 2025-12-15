import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGamification } from './GamificationProvider';
import { Zap, Flame, Target, Star, Crown, Trophy, Rocket, MessageSquare } from 'lucide-react';

export function DemoAchievements() {
  const { 
    triggerFastResponse, 
    triggerStreak, 
    triggerResolution, 
    triggerPerfectRating,
    triggerLevelUp,
    triggerDailyGoal,
    showAchievement
  } = useGamification();

  const demos = [
    {
      label: 'Resposta < 30s',
      icon: Rocket,
      action: () => triggerFastResponse(25),
      gradient: 'from-red-500 to-orange-400',
    },
    {
      label: 'Resposta < 2min',
      icon: Zap,
      action: () => triggerFastResponse(90),
      gradient: 'from-primary to-teal-400',
    },
    {
      label: 'Streak 5',
      icon: Flame,
      action: () => triggerStreak(5),
      gradient: 'from-orange-500 to-yellow-400',
    },
    {
      label: 'Streak 10',
      icon: Flame,
      action: () => triggerStreak(10),
      gradient: 'from-orange-600 to-red-500',
    },
    {
      label: 'Resolução',
      icon: Target,
      action: () => triggerResolution(),
      gradient: 'from-green-500 to-emerald-400',
    },
    {
      label: 'Nota 5 ⭐',
      icon: Star,
      action: () => triggerPerfectRating(),
      gradient: 'from-yellow-400 to-amber-400',
    },
    {
      label: 'Level Up!',
      icon: Crown,
      action: () => triggerLevelUp(15),
      gradient: 'from-purple-500 to-fuchsia-400',
    },
    {
      label: 'Meta Diária',
      icon: Trophy,
      action: () => triggerDailyGoal('50 atendimentos'),
      gradient: 'from-teal-400 to-cyan-400',
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-card border border-border"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-display font-bold text-foreground">Demo de Gamificação</h3>
          <p className="text-sm text-muted-foreground">Teste as conquistas do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {demos.map((demo, index) => (
          <motion.button
            key={demo.label}
            onClick={demo.action}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative overflow-hidden p-3 rounded-xl
              bg-gradient-to-br ${demo.gradient}
              text-white font-semibold text-sm
              shadow-lg hover:shadow-xl transition-shadow
            `}
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
            <div className="relative flex items-center gap-2 justify-center">
              <demo.icon className="w-4 h-4" />
              <span>{demo.label}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
