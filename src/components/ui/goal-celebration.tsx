import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Trophy, Star, Target, Zap, TrendingUp, Award, Crown, Rocket, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

// Particle types for different celebrations
type ParticleType = 'confetti' | 'star' | 'circle' | 'sparkle' | 'emoji';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  type: ParticleType;
  emoji?: string;
}

const CELEBRATION_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(142 76% 36%)', // green
  'hsl(45 93% 47%)',  // gold
  'hsl(280 87% 65%)', // purple
  'hsl(199 89% 48%)', // cyan
  'hsl(340 82% 52%)', // pink
  'hsl(24 95% 53%)',  // orange
];

const CELEBRATION_EMOJIS = ['🎉', '⭐', '🏆', '💫', '✨', '🔥', '💪', '🚀'];

interface CelebrationConfig {
  title: string;
  subtitle: string;
  emoji: string;
  icon: typeof Trophy;
  particleCount?: number;
  duration?: number;
  includeEmojis?: boolean;
}

const CELEBRATION_PRESETS: Record<string, CelebrationConfig> = {
  goalReached: {
    title: 'Meta Alcançada!',
    subtitle: 'Parabéns pelo excelente trabalho!',
    emoji: '🎯',
    icon: Target,
    particleCount: 150,
    includeEmojis: true,
  },
  dailyGoal: {
    title: 'Meta Diária Batida!',
    subtitle: 'Continue assim!',
    emoji: '🏆',
    icon: Trophy,
    particleCount: 100,
  },
  weeklyGoal: {
    title: 'Meta Semanal Concluída!',
    subtitle: 'Semana incrível!',
    emoji: '⭐',
    icon: Star,
    particleCount: 120,
    includeEmojis: true,
  },
  levelUp: {
    title: 'Level Up!',
    subtitle: 'Você subiu de nível!',
    emoji: '🚀',
    icon: Rocket,
    particleCount: 180,
    duration: 4000,
    includeEmojis: true,
  },
  achievement: {
    title: 'Conquista Desbloqueada!',
    subtitle: 'Você ganhou uma medalha!',
    emoji: '🏅',
    icon: Award,
    particleCount: 100,
  },
  streak: {
    title: 'Sequência Mantida!',
    subtitle: 'Você está em uma boa sequência!',
    emoji: '🔥',
    icon: Zap,
    particleCount: 80,
  },
  record: {
    title: 'Novo Recorde!',
    subtitle: 'Você bateu seu recorde pessoal!',
    emoji: '👑',
    icon: Crown,
    particleCount: 200,
    duration: 5000,
    includeEmojis: true,
  },
  milestone: {
    title: 'Marco Importante!',
    subtitle: 'Você alcançou um marco!',
    emoji: '🎊',
    icon: PartyPopper,
    particleCount: 150,
    includeEmojis: true,
  },
};

interface GoalCelebrationProps {
  type?: keyof typeof CELEBRATION_PRESETS;
  custom?: Partial<CelebrationConfig>;
  isActive: boolean;
  onComplete?: () => void;
}

export function GoalCelebration({
  type = 'goalReached',
  custom,
  isActive,
  onComplete,
}: GoalCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);

  const config = { ...CELEBRATION_PRESETS[type], ...custom };
  const { title, subtitle, emoji, icon: Icon, particleCount = 100, duration = 3500, includeEmojis = false } = config;

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const types: ParticleType[] = includeEmojis 
        ? ['confetti', 'confetti', 'star', 'circle', 'sparkle', 'emoji']
        : ['confetti', 'confetti', 'star', 'circle', 'sparkle'];
      
      const particleType = types[Math.floor(Math.random() * types.length)];

      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 30,
        rotation: Math.random() * 360,
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        size: 6 + Math.random() * 10,
        velocityX: (Math.random() - 0.5) * 6,
        velocityY: 2 + Math.random() * 4,
        type: particleType,
        emoji: particleType === 'emoji' ? CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)] : undefined,
      });
    }

    return newParticles;
  }, [particleCount, includeEmojis]);

  useEffect(() => {
    if (isActive) {
      setParticles(createParticles());
      setShowOverlay(true);

      // Play sound if available
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 100, 30, 150]);
      }

      const timer = setTimeout(() => {
        setShowOverlay(false);
        setParticles([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration, createParticles, onComplete]);

  if (!showOverlay) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.x + particle.velocityX * 15}vw`,
              y: '120vh',
              rotate: particle.rotation + 720,
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: 2.5 + Math.random() * 2,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{
              width: particle.size,
              height: particle.size,
            }}
          >
            {particle.type === 'emoji' ? (
              <span className="text-xl">{particle.emoji}</span>
            ) : particle.type === 'confetti' ? (
              <div
                className="w-full h-full"
                style={{
                  backgroundColor: particle.color,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 80%)',
                }}
              />
            ) : particle.type === 'star' ? (
              <svg viewBox="0 0 24 24" className="w-full h-full" style={{ fill: particle.color }}>
                <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9" />
              </svg>
            ) : particle.type === 'sparkle' ? (
              <svg viewBox="0 0 24 24" className="w-full h-full" style={{ fill: particle.color }}>
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            ) : (
              <div
                className="w-full h-full rounded-full"
                style={{ backgroundColor: particle.color }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Center celebration card */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              className="relative"
            >
              {/* Glow effect */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-primary/30 rounded-full blur-3xl"
                style={{ transform: 'scale(2.5)' }}
              />

              {/* Main card */}
              <motion.div
                className="relative bg-card/95 backdrop-blur-xl border border-primary/30 rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4"
                style={{
                  boxShadow: '0 0 80px hsl(var(--primary) / 0.4), 0 0 160px hsl(var(--primary) / 0.15)',
                }}
              >
                {/* Animated emoji */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 15, -15, 0],
                  }}
                  transition={{ duration: 0.6, repeat: 3 }}
                  className="text-7xl mb-4"
                >
                  {emoji}
                </motion.div>

                {/* Icon with pulse */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-primary/20"
                >
                  <Icon className="w-5 h-5 text-primary" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display text-2xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
                >
                  {title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground"
                >
                  {subtitle}
                </motion.p>

                {/* Orbiting sparkles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-secondary rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                    }}
                    animate={{
                      x: [0, Math.cos((i * 45 * Math.PI) / 180) * 140],
                      y: [0, Math.sin((i * 45 * Math.PI) / 180) * 140],
                      scale: [0, 1.8, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: 0.3 + i * 0.06,
                      repeat: 2,
                      repeatDelay: 0.5,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Context for triggering celebrations from anywhere
interface CelebrationContextType {
  celebrate: (type: keyof typeof CELEBRATION_PRESETS, custom?: Partial<CelebrationConfig>) => void;
  celebrateCustom: (config: CelebrationConfig) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [activeCelebration, setActiveCelebration] = useState<{
    type: keyof typeof CELEBRATION_PRESETS;
    custom?: Partial<CelebrationConfig>;
  } | null>(null);

  const celebrate = useCallback((type: keyof typeof CELEBRATION_PRESETS, custom?: Partial<CelebrationConfig>) => {
    setActiveCelebration({ type, custom });
  }, []);

  const celebrateCustom = useCallback((config: CelebrationConfig) => {
    setActiveCelebration({ type: 'goalReached', custom: config });
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate, celebrateCustom }}>
      {children}
      {activeCelebration && (
        <GoalCelebration
          type={activeCelebration.type}
          custom={activeCelebration.custom}
          isActive={true}
          onComplete={() => setActiveCelebration(null)}
        />
      )}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  
  if (!context) {
    return {
      celebrate: () => {},
      celebrateCustom: () => {},
    };
  }

  return context;
}

// Quick celebration components
export function QuickCelebrate({ 
  type, 
  trigger 
}: { 
  type: keyof typeof CELEBRATION_PRESETS;
  trigger: boolean;
}) {
  const { celebrate } = useCelebration();

  useEffect(() => {
    if (trigger) {
      celebrate(type);
    }
  }, [trigger, type, celebrate]);

  return null;
}
