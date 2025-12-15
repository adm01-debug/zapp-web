import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Zap,
  Target,
  MessageSquare,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';

interface LeaderboardAgent {
  id: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  streak: number;
  messagesHandled: number;
  avgResponseTime: string;
  satisfaction: number;
  rank: number;
  previousRank: number;
  achievements: string[];
  isOnline: boolean;
}

const mockLeaderboardData: LeaderboardAgent[] = [
  {
    id: '1',
    name: 'Ana Silva',
    xp: 12450,
    level: 24,
    streak: 15,
    messagesHandled: 342,
    avgResponseTime: '1.2min',
    satisfaction: 98,
    rank: 1,
    previousRank: 2,
    achievements: ['speed-demon', 'customer-hero', 'streak-master'],
    isOnline: true,
  },
  {
    id: '2',
    name: 'Carlos Santos',
    xp: 11200,
    level: 22,
    streak: 12,
    messagesHandled: 298,
    avgResponseTime: '1.5min',
    satisfaction: 96,
    rank: 2,
    previousRank: 1,
    achievements: ['team-player', 'problem-solver'],
    isOnline: true,
  },
  {
    id: '3',
    name: 'Maria Oliveira',
    xp: 10800,
    level: 21,
    streak: 8,
    messagesHandled: 276,
    avgResponseTime: '1.8min',
    satisfaction: 95,
    rank: 3,
    previousRank: 3,
    achievements: ['rising-star', 'quick-learner'],
    isOnline: false,
  },
  {
    id: '4',
    name: 'Pedro Costa',
    xp: 9500,
    level: 19,
    streak: 5,
    messagesHandled: 234,
    avgResponseTime: '2.1min',
    satisfaction: 92,
    rank: 4,
    previousRank: 6,
    achievements: ['comeback-kid'],
    isOnline: true,
  },
  {
    id: '5',
    name: 'Julia Ferreira',
    xp: 8900,
    level: 18,
    streak: 3,
    messagesHandled: 212,
    avgResponseTime: '2.0min',
    satisfaction: 94,
    rank: 5,
    previousRank: 4,
    achievements: ['consistent'],
    isOnline: true,
  },
];

const achievementIcons: Record<string, { icon: typeof Trophy; color: string; label: string }> = {
  'speed-demon': { icon: Zap, color: 'text-yellow-400', label: 'Speed Demon' },
  'customer-hero': { icon: Award, color: 'text-purple-400', label: 'Customer Hero' },
  'streak-master': { icon: Flame, color: 'text-orange-400', label: 'Streak Master' },
  'team-player': { icon: Star, color: 'text-blue-400', label: 'Team Player' },
  'problem-solver': { icon: Target, color: 'text-green-400', label: 'Problem Solver' },
  'rising-star': { icon: TrendingUp, color: 'text-pink-400', label: 'Rising Star' },
  'quick-learner': { icon: Sparkles, color: 'text-cyan-400', label: 'Quick Learner' },
  'comeback-kid': { icon: Trophy, color: 'text-amber-400', label: 'Comeback Kid' },
  'consistent': { icon: Medal, color: 'text-emerald-400', label: 'Consistent' },
};

function RankBadge({ rank, previousRank }: { rank: number; previousRank: number }) {
  const rankChange = previousRank - rank;
  
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500',
          shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
          icon: Crown,
          iconColor: 'text-yellow-100',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-br from-slate-300 via-gray-400 to-slate-500',
          shadow: 'shadow-[0_0_15px_rgba(148,163,184,0.4)]',
          icon: Medal,
          iconColor: 'text-slate-100',
        };
      case 3:
        return {
          bg: 'bg-gradient-to-br from-amber-600 via-orange-700 to-amber-800',
          shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.4)]',
          icon: Medal,
          iconColor: 'text-amber-100',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-muted to-muted/80',
          shadow: '',
          icon: null,
          iconColor: '',
        };
    }
  };

  const style = getRankStyle();
  const Icon = style.icon;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`relative w-10 h-10 rounded-full ${style.bg} ${style.shadow} flex items-center justify-center`}
      >
        {Icon ? (
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        ) : (
          <span className="text-sm font-bold text-foreground">{rank}</span>
        )}
        {rank <= 3 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251,191,36,0)',
                '0 0 0 8px rgba(251,191,36,0.1)',
                '0 0 0 0 rgba(251,191,36,0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      
      {rankChange !== 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center gap-0.5 text-xs font-medium ${
            rankChange > 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {rankChange > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(rankChange)}</span>
        </motion.div>
      )}
      {rankChange === 0 && rank > 3 && (
        <Minus className="w-3 h-3 text-muted-foreground" />
      )}
    </div>
  );
}

function AchievementBadge({ achievementKey }: { achievementKey: string }) {
  const achievement = achievementIcons[achievementKey];
  if (!achievement) return null;

  const Icon = achievement.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.2, rotate: 10 }}
      className={`w-6 h-6 rounded-full glass-soft flex items-center justify-center ${achievement.color}`}
      title={achievement.label}
    >
      <Icon className="w-3.5 h-3.5" />
    </motion.div>
  );
}

function CelebrationParticles({ isVisible }: { isVisible: boolean }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * -100 - 20,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 0.5,
    size: 4 + Math.random() * 8,
    color: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'][
      Math.floor(Math.random() * 5)
    ],
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, x: '50%', y: '50%', scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: `calc(50% + ${particle.x}px)`,
                y: `calc(50% + ${particle.y}px)`,
                scale: [0, 1, 0.5],
                rotate: [0, 360],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeOut',
              }}
              className="absolute"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: '50%',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

function LeaderboardRow({ agent, index }: { agent: LeaderboardAgent; index: number }) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (agent.rank === 1 && agent.previousRank !== 1) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [agent.rank, agent.previousRank]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className={`relative glass-soft rounded-xl p-4 border transition-all cursor-pointer group ${
        agent.rank === 1
          ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent'
          : agent.rank === 2
          ? 'border-slate-400/30 bg-gradient-to-r from-slate-400/5 to-transparent'
          : agent.rank === 3
          ? 'border-amber-600/30 bg-gradient-to-r from-amber-600/5 to-transparent'
          : 'border-border/30 hover:border-primary/30'
      }`}
    >
      <CelebrationParticles isVisible={showCelebration} />
      
      <div className="flex items-center gap-4">
        {/* Rank */}
        <RankBadge rank={agent.rank} previousRank={agent.previousRank} />

        {/* Avatar & Info */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                {agent.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {agent.isOnline && (
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate">{agent.name}</h4>
              {agent.streak >= 10 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex items-center gap-0.5 text-orange-400"
                >
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-medium">{agent.streak}</span>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Nível {agent.level}</span>
              <span>•</span>
              <span className="text-primary font-medium">{agent.xp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold">{agent.messagesHandled}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold">{agent.avgResponseTime}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Star className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold">{agent.satisfaction}%</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="flex items-center gap-1">
          {agent.achievements.slice(0, 3).map((achievement) => (
            <AchievementBadge key={achievement} achievementKey={achievement} />
          ))}
          {agent.achievements.length > 3 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              +{agent.achievements.length - 3}
            </Badge>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

export function Leaderboard() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  return (
    <div className="glass-strong rounded-2xl p-6 border border-border/50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20"
          >
            <Trophy className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Ranking de Atendentes
            </h3>
            <p className="text-sm text-muted-foreground">Top performers da equipe</p>
          </div>
        </div>

        <div className="flex items-center gap-1 glass-soft rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`text-xs transition-all ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === 'today' ? 'Hoje' : range === 'week' ? 'Semana' : 'Mês'}
            </Button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3 relative z-10">
        {mockLeaderboardData.map((agent, index) => (
          <LeaderboardRow key={agent.id} agent={agent} index={index} />
        ))}
      </div>

      {/* View All Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center relative z-10"
      >
        <Button
          variant="outline"
          className="glass border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all group"
        >
          Ver ranking completo
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}