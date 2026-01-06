import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Trophy,
  Star,
  Medal,
  Target,
  Zap,
  Crown,
  Award,
  Flame,
  MessageSquare,
  Clock,
  Users,
  ThumbsUp,
  Sparkles,
  Gift,
  Lock,
  Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: 'trophy' | 'star' | 'medal' | 'target' | 'zap' | 'crown' | 'flame' | 'award';
  category: 'messages' | 'speed' | 'satisfaction' | 'streak' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  target: number;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  isNew?: boolean;
}

interface AchievementsSystemProps {
  userId?: string;
  showCompact?: boolean;
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  medal: Medal,
  target: Target,
  zap: Zap,
  crown: Crown,
  flame: Flame,
  award: Award,
};

const rarityConfig = {
  common: { label: 'Comum', color: 'bg-gray-500', border: 'border-gray-500/30' },
  rare: { label: 'Raro', color: 'bg-blue-500', border: 'border-blue-500/30' },
  epic: { label: 'Épico', color: 'bg-purple-500', border: 'border-purple-500/30' },
  legendary: { label: 'Lendário', color: 'bg-yellow-500', border: 'border-yellow-500/30' },
};

const categoryConfig = {
  messages: { label: 'Mensagens', icon: MessageSquare },
  speed: { label: 'Velocidade', icon: Clock },
  satisfaction: { label: 'Satisfação', icon: ThumbsUp },
  streak: { label: 'Sequência', icon: Flame },
  special: { label: 'Especial', icon: Sparkles },
};

export const AchievementsSystem = ({ userId, showCompact = false }: AchievementsSystemProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load achievements
    const timer = setTimeout(() => {
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          name: 'Primeiro Contato',
          description: 'Responda sua primeira mensagem',
          icon: 'star',
          category: 'messages',
          rarity: 'common',
          progress: 1,
          target: 1,
          xpReward: 50,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 86400000 * 30),
        },
        {
          id: '2',
          name: 'Comunicador',
          description: 'Envie 100 mensagens',
          icon: 'trophy',
          category: 'messages',
          rarity: 'common',
          progress: 100,
          target: 100,
          xpReward: 100,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 86400000 * 20),
        },
        {
          id: '3',
          name: 'Velocista',
          description: 'Responda em menos de 1 minuto 50 vezes',
          icon: 'zap',
          category: 'speed',
          rarity: 'rare',
          progress: 42,
          target: 50,
          xpReward: 200,
          isUnlocked: false,
        },
        {
          id: '4',
          name: 'Maratonista',
          description: 'Mantenha uma sequência de 7 dias ativos',
          icon: 'flame',
          category: 'streak',
          rarity: 'rare',
          progress: 7,
          target: 7,
          xpReward: 250,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 86400000 * 5),
          isNew: true,
        },
        {
          id: '5',
          name: 'Favorito dos Clientes',
          description: 'Alcance 95% de satisfação em 100 avaliações',
          icon: 'crown',
          category: 'satisfaction',
          rarity: 'epic',
          progress: 67,
          target: 100,
          xpReward: 500,
          isUnlocked: false,
        },
        {
          id: '6',
          name: 'Mestre do Atendimento',
          description: 'Resolva 1000 conversas',
          icon: 'medal',
          category: 'messages',
          rarity: 'epic',
          progress: 756,
          target: 1000,
          xpReward: 750,
          isUnlocked: false,
        },
        {
          id: '7',
          name: 'Lenda Viva',
          description: 'Complete todas as conquistas',
          icon: 'award',
          category: 'special',
          rarity: 'legendary',
          progress: 5,
          target: 10,
          xpReward: 2000,
          isUnlocked: false,
        },
        {
          id: '8',
          name: 'Flash',
          description: 'Tempo médio de resposta menor que 30 segundos por uma semana',
          icon: 'zap',
          category: 'speed',
          rarity: 'legendary',
          progress: 3,
          target: 7,
          xpReward: 1500,
          isUnlocked: false,
        },
      ];

      setAchievements(mockAchievements);
      
      const unlockedXP = mockAchievements
        .filter(a => a.isUnlocked)
        .reduce((sum, a) => sum + a.xpReward, 0);
      setTotalXP(unlockedXP);
      setLevel(Math.floor(unlockedXP / 500) + 1);
      
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [userId]);

  const handleClaimAchievement = useCallback((achievement: Achievement) => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    toast({
      title: '🎉 Conquista Desbloqueada!',
      description: `${achievement.name} - +${achievement.xpReward} XP`,
    });

    // Update achievements
    setAchievements(prev =>
      prev.map(a =>
        a.id === achievement.id ? { ...a, isNew: false } : a
      )
    );
  }, []);

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const xpToNextLevel = (level * 500) - totalXP;
  const xpProgress = ((totalXP % 500) / 500) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando conquistas...</div>
        </CardContent>
      </Card>
    );
  }

  if (showCompact) {
    const recentAchievements = achievements.filter(a => a.isUnlocked).slice(0, 3);
    const nearComplete = achievements.filter(a => !a.isUnlocked && a.progress / a.target >= 0.7).slice(0, 2);

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Conquistas</CardTitle>
            </div>
            <Badge variant="secondary">
              {unlockedCount}/{achievements.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            {recentAchievements.map(a => {
              const Icon = iconMap[a.icon];
              return (
                <div
                  key={a.id}
                  className={`p-2 rounded-lg border ${rarityConfig[a.rarity].border} bg-muted/50 relative`}
                >
                  <Icon className="h-6 w-6" />
                  {a.isNew && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
          
          {nearComplete.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quase lá:</p>
              {nearComplete.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="text-xs truncate flex-1">{a.name}</span>
                  <Progress value={(a.progress / a.target) * 100} className="w-16 h-1" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Conquistas</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3" />
                Nível {level}
              </Badge>
              <Badge variant="secondary">
                {unlockedCount}/{achievements.length}
              </Badge>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{totalXP} XP</span>
              <span className="text-muted-foreground">{xpToNextLevel} XP para nível {level + 1}</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(categoryConfig).map(([category, config]) => {
                const categoryAchievements = achievements.filter(a => a.category === category);
                if (categoryAchievements.length === 0) return null;

                const CategoryIcon = config.icon;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      {config.label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryAchievements.map((achievement, index) => {
                        const Icon = iconMap[achievement.icon];
                        const rarity = rarityConfig[achievement.rarity];
                        const progressPercent = Math.min(100, (achievement.progress / achievement.target) * 100);

                        return (
                          <motion.button
                            key={achievement.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedAchievement(achievement)}
                            className={`relative p-3 rounded-lg border text-left transition-all ${
                              achievement.isUnlocked
                                ? `${rarity.border} hover:shadow-md`
                                : 'border-border opacity-60 hover:opacity-80'
                            }`}
                          >
                            {achievement.isNew && (
                              <span className="absolute -top-1 -right-1 px-2 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                                NOVO
                              </span>
                            )}

                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${achievement.isUnlocked ? rarity.color + '/20' : 'bg-muted'}`}>
                                {achievement.isUnlocked ? (
                                  <Icon className={`h-6 w-6 ${rarity.color.replace('bg-', 'text-')}`} />
                                ) : (
                                  <Lock className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{achievement.name}</span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {rarity.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {achievement.description}
                                </p>

                                {!achievement.isUnlocked && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                      <span>{achievement.progress}/{achievement.target}</span>
                                      <span>{Math.round(progressPercent)}%</span>
                                    </div>
                                    <Progress value={progressPercent} className="h-1" />
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Gift className="h-2 w-2 mr-1" />
                                    {achievement.xpReward} XP
                                  </Badge>
                                  {achievement.isUnlocked && (
                                    <Check className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        {selectedAchievement && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = iconMap[selectedAchievement.icon];
                  const rarity = rarityConfig[selectedAchievement.rarity];
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${rarity.color}/20`}>
                        <Icon className={`h-6 w-6 ${rarity.color.replace('bg-', 'text-')}`} />
                      </div>
                      {selectedAchievement.name}
                    </>
                  );
                })()}
              </DialogTitle>
              <DialogDescription>{selectedAchievement.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Raridade</span>
                <Badge className={rarityConfig[selectedAchievement.rarity].color}>
                  {rarityConfig[selectedAchievement.rarity].label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recompensa</span>
                <Badge variant="secondary">
                  <Gift className="h-3 w-3 mr-1" />
                  {selectedAchievement.xpReward} XP
                </Badge>
              </div>

              {!selectedAchievement.isUnlocked && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span>{selectedAchievement.progress}/{selectedAchievement.target}</span>
                  </div>
                  <Progress
                    value={(selectedAchievement.progress / selectedAchievement.target) * 100}
                    className="h-3"
                  />
                </div>
              )}

              {selectedAchievement.isUnlocked && selectedAchievement.isNew && (
                <Button
                  className="w-full"
                  onClick={() => {
                    handleClaimAchievement(selectedAchievement);
                    setSelectedAchievement(null);
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Reivindicar Recompensa
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};
