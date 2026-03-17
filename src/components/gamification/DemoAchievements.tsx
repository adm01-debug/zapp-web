import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGamification } from './GamificationProvider';
import { Zap, Flame, Target, Star, Crown, Trophy, Rocket, TrendingUp, Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function DemoAchievements() {
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  const {
    triggerFastResponse, 
    triggerStreak, 
    triggerResolution, 
    triggerPerfectRating,
    triggerLevelUp,
    triggerDailyGoal,
    stats,
    isLoading,
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
      action: () => triggerLevelUp((stats?.level || 1) + 1),
      gradient: 'from-purple-500 to-fuchsia-400',
    },
    {
      label: 'Meta Diária',
      icon: Trophy,
      action: () => triggerDailyGoal('50 atendimentos'),
      gradient: 'from-teal-400 to-cyan-400',
    },
  ];

  if (showAchievementsPanel) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAchievementsPanel(false)}
          className="mb-2"
        >
          ← Voltar para Gamificação
        </Button>
        <div className="p-6 rounded-2xl bg-card border border-border text-center">
          <Award className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h3 className="font-bold text-foreground mb-1">Suas Conquistas</h3>
          <p className="text-sm text-muted-foreground">
            {stats ? `${stats.achievementsCount} conquistas desbloqueadas` : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-card border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Sistema de Gamificação</h3>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : 'Suas conquistas são salvas automaticamente'}
            </p>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="flex items-center gap-2">
          {!isLoading && stats && (
            <>
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
                <TrendingUp className="w-3 h-3" />
                Nv {stats.level}
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-xp/10 text-xp border-0">
                <Zap className="w-3 h-3" />
                {stats.xp.toLocaleString()} XP
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-coins/10 text-coins border-0">
                <Award className="w-3 h-3" />
                {stats.achievementsCount}
              </Badge>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAchievementsPanel(true)}
            className="gap-1 ml-2"
          >
            Ver Conquistas
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Streak Atual</p>
            <p className="text-lg font-bold text-foreground flex items-center gap-1">
              <Flame className={cn("w-4 h-4", stats.streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
              {stats.streak}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Mensagens</p>
            <p className="text-lg font-bold text-foreground">{stats.messagesHandled}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Resoluções</p>
            <p className="text-lg font-bold text-foreground">{stats.resolutions}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Conquistas</p>
            <p className="text-lg font-bold text-foreground">{stats.achievementsCount}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">
        Teste as conquistas clicando nos botões abaixo:
      </p>

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
