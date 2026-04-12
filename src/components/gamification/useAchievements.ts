import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useCelebration } from '@/components/effects/Confetti';

export interface Achievement {
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

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'Primeiro Contato', description: 'Envie sua primeira mensagem', icon: 'star', category: 'messages', rarity: 'common', progress: 1, target: 1, xpReward: 50, isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 5) },
  { id: '2', name: 'Comunicador', description: 'Envie 100 mensagens', icon: 'trophy', category: 'messages', rarity: 'common', progress: 100, target: 100, xpReward: 100, isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 3) },
  { id: '3', name: 'Velocista', description: 'Responda 10 conversas em menos de 1 minuto', icon: 'zap', category: 'speed', rarity: 'rare', progress: 7, target: 10, xpReward: 200, isUnlocked: false },
  { id: '4', name: 'Herói do Cliente', description: 'Receba 5 avaliações 5 estrelas', icon: 'medal', category: 'satisfaction', rarity: 'rare', progress: 3, target: 5, xpReward: 250, isUnlocked: false },
  { id: '5', name: 'Sequência Imparável', description: 'Mantenha uma sequência de 7 dias', icon: 'flame', category: 'streak', rarity: 'epic', progress: 4, target: 7, xpReward: 500, isUnlocked: false },
  { id: '6', name: 'Mestre das Conversas', description: 'Resolva 500 conversas', icon: 'crown', category: 'messages', rarity: 'epic', progress: 234, target: 500, xpReward: 750, isUnlocked: false },
  { id: '7', name: 'Lenda do Suporte', description: 'Alcance o nível 50', icon: 'award', category: 'special', rarity: 'legendary', progress: 12, target: 50, xpReward: 2000, isUnlocked: false, isNew: true },
  { id: '8', name: 'Raio', description: 'Responda 50 conversas em menos de 30 segundos', icon: 'zap', category: 'speed', rarity: 'legendary', progress: 15, target: 50, xpReward: 1500, isUnlocked: false },
  { id: '9', name: 'Perfeccionista', description: 'Mantenha 100% de satisfação por 30 dias', icon: 'target', category: 'satisfaction', rarity: 'legendary', progress: 12, target: 30, xpReward: 3000, isUnlocked: false },
  { id: '10', name: 'Veterano', description: 'Complete 1000 atendimentos', icon: 'medal', category: 'messages', rarity: 'epic', progress: 456, target: 1000, xpReward: 1000, isUnlocked: false },
];

export function useAchievements(_userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>(MOCK_ACHIEVEMENTS);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const { celebrate } = useCelebration();

  const filtered = filter === 'all' ? achievements :
    filter === 'unlocked' ? achievements.filter(a => a.isUnlocked) :
    filter === 'locked' ? achievements.filter(a => !a.isUnlocked) :
    achievements.filter(a => a.category === filter);

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.isUnlocked).length,
    totalXp: achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.xpReward, 0),
    completionRate: Math.round((achievements.filter(a => a.isUnlocked).length / achievements.length) * 100),
  };

  const handleClaim = useCallback((achievement: Achievement) => {
    if (!achievement.isUnlocked) {
      toast({ title: '🔒 Conquista bloqueada', description: 'Complete o objetivo para desbloquear!', variant: 'destructive' });
      return;
    }
    celebrate();
    toast({ title: '🎉 XP Resgatado!', description: `+${achievement.xpReward} XP de "${achievement.name}"` });
  }, [celebrate]);

  return { achievements: filtered, selectedAchievement, setSelectedAchievement, filter, setFilter, stats, handleClaim };
}
