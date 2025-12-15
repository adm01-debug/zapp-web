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
  'speed-demon': { icon: Zap, color: 'text-primary', label: 'Speed Demon' },
  'customer-hero': { icon: Award, color: 'text-info', label: 'Customer Hero' },
  'streak-master': { icon: Flame, color: 'text-primary', label: 'Streak Master' },
  'team-player': { icon: Star, color: 'text-coins', label: 'Team Player' },
  'problem-solver': { icon: Target, color: 'text-success', label: 'Problem Solver' },
  'rising-star': { icon: TrendingUp, color: 'text-primary', label: 'Rising Star' },
  'quick-learner': { icon: Sparkles, color: 'text-info', label: 'Quick Learner' },
  'comeback-kid': { icon: Trophy, color: 'text-coins', label: 'Comeback Kid' },
  'consistent': { icon: Medal, color: 'text-success', label: 'Consistent' },
};

function RankBadge({ rank, previousRank }: { rank: number; previousRank: number }) {
  const rankChange = previousRank - rank;
  
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-br from-primary to-amber-500',
          shadow: 'shadow-[0_0_15px_hsl(var(--primary)/0.4)]',
          icon: Crown,
          iconColor: 'text-primary-foreground',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-br from-slate-400 to-slate-500',
          shadow: '',
          icon: Medal,
          iconColor: 'text-slate-100',
        };
      case 3:
        return {
          bg: 'bg-gradient-to-br from-amber-600 to-amber-700',
          shadow: '',
          icon: Medal,
          iconColor: 'text-amber-100',
        };
      default:
        return {
          bg: 'bg-muted',
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
        className={`relative w-9 h-9 rounded-full ${style.bg} ${style.shadow} flex items-center justify-center`}
      >
        {Icon ? (
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        ) : (
          <span className="text-sm font-bold text-foreground">{rank}</span>
        )}
      </motion.div>
      
      {rankChange !== 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center gap-0.5 text-xs font-medium ${
            rankChange > 0 ? 'text-success' : 'text-destructive'
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
      whileHover={{ scale: 1.15 }}
      className={`w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center ${achievement.color}`}
      title={achievement.label}
    >
      <Icon className="w-3 h-3" />
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
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
      whileHover={{ x: 2 }}
      className={`relative rounded-xl p-3 border transition-all cursor-pointer group ${
        agent.rank === 1
          ? 'border-primary/30 bg-primary/5'
          : agent.rank === 2
          ? 'border-slate-400/20 bg-slate-400/5'
          : agent.rank === 3
          ? 'border-amber-600/20 bg-amber-600/5'
          : 'border-border/20 bg-muted/10 hover:border-primary/20 hover:bg-muted/20'
      }`}
    >
      <CelebrationParticles isVisible={showCelebration} />
      
      <div className="flex items-center gap-3">
        {/* Rank */}
        <RankBadge rank={agent.rank} previousRank={agent.previousRank} />

        {/* Avatar & Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-border/30">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {agent.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {agent.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm text-foreground truncate">{agent.name}</h4>
              {agent.streak >= 10 && (
                <div className="flex items-center gap-0.5 text-primary">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{agent.streak}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Nv {agent.level}</span>
              <span>•</span>
              <span className="text-primary font-medium">{agent.xp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="flex items-center gap-1">
          {agent.achievements.slice(0, 2).map((achievement) => (
            <AchievementBadge key={achievement} achievementKey={achievement} />
          ))}
          {agent.achievements.length > 2 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted/50">
              +{agent.achievements.length - 2}
            </Badge>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

export function Leaderboard() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  return (
    <div className="rounded-2xl p-5 border border-border/30 bg-card relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Ranking
            </h3>
            <p className="text-xs text-muted-foreground">Top performers</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setTimeRange(range)}
              className={`text-xs h-7 px-2.5 transition-all ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
              }`}
            >
              {range === 'today' ? 'Hoje' : range === 'week' ? 'Semana' : 'Mês'}
            </Button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {mockLeaderboardData.map((agent, index) => (
          <LeaderboardRow key={agent.id} agent={agent} index={index} />
        ))}
      </div>

      {/* View All Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary text-xs"
        >
          Ver ranking completo
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </motion.div>
    </div>
  );
}