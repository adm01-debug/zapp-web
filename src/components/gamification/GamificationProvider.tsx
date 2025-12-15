import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AchievementToast, AchievementType } from './AchievementToast';

interface Achievement {
  type: AchievementType;
  message: string;
  xpReward?: number;
}

interface GamificationContextType {
  showAchievement: (type: AchievementType, message: string, xpReward?: number) => void;
  triggerFastResponse: (seconds: number) => void;
  triggerStreak: (count: number) => void;
  triggerResolution: () => void;
  triggerPerfectRating: () => void;
  triggerLevelUp: (level: number) => void;
  triggerDailyGoal: (goal: string) => void;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  const processQueue = useCallback(() => {
    if (queue.length > 0 && !currentAchievement) {
      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setQueue(rest);
    }
  }, [queue, currentAchievement]);

  const showAchievement = useCallback((type: AchievementType, message: string, xpReward?: number) => {
    const achievement = { type, message, xpReward };
    
    if (!currentAchievement) {
      setCurrentAchievement(achievement);
    } else {
      setQueue(prev => [...prev, achievement]);
    }
  }, [currentAchievement]);

  const handleClose = useCallback(() => {
    setCurrentAchievement(null);
    setTimeout(processQueue, 300);
  }, [processQueue]);

  // Convenience methods for common achievements
  const triggerFastResponse = useCallback((seconds: number) => {
    if (seconds <= 30) {
      showAchievement('speed_demon', `Incrível! Respondeu em ${seconds}s!`, 50);
    } else if (seconds <= 60) {
      showAchievement('fast_response', `Excelente! Respondeu em menos de 1 minuto!`, 30);
    } else if (seconds <= 120) {
      showAchievement('fast_response', `Parabéns! Respondeu em menos de 2 minutos!`, 20);
    }
  }, [showAchievement]);

  const triggerStreak = useCallback((count: number) => {
    if (count >= 10) {
      showAchievement('streak', `Streak de ${count}! Você está on fire! 🔥`, 100);
    } else if (count >= 5) {
      showAchievement('streak', `${count} respostas seguidas! Continue assim!`, 50);
    } else if (count >= 3) {
      showAchievement('streak', `Streak de ${count}! Mandando bem!`, 25);
    }
  }, [showAchievement]);

  const triggerResolution = useCallback(() => {
    showAchievement('resolution', 'Cliente satisfeito! Problema resolvido!', 40);
  }, [showAchievement]);

  const triggerPerfectRating = useCallback(() => {
    showAchievement('perfect_rating', 'O cliente deu nota máxima! ⭐⭐⭐⭐⭐', 75);
  }, [showAchievement]);

  const triggerLevelUp = useCallback((level: number) => {
    showAchievement('level_up', `Você alcançou o Nível ${level}!`, 100);
  }, [showAchievement]);

  const triggerDailyGoal = useCallback((goal: string) => {
    showAchievement('daily_goal', `Meta "${goal}" concluída!`, 60);
  }, [showAchievement]);

  return (
    <GamificationContext.Provider 
      value={{ 
        showAchievement, 
        triggerFastResponse,
        triggerStreak,
        triggerResolution,
        triggerPerfectRating,
        triggerLevelUp,
        triggerDailyGoal,
      }}
    >
      {children}
      {currentAchievement && (
        <AchievementToast
          type={currentAchievement.type}
          message={currentAchievement.message}
          xpReward={currentAchievement.xpReward}
          isVisible={true}
          onClose={handleClose}
        />
      )}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
