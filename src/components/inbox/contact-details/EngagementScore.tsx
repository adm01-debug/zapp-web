import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EngagementScoreProps {
  score: number; // 0-100
  label?: string;
}

export function EngagementScore({ score, label = 'Engajamento' }: EngagementScoreProps) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--success))';
    if (s >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getLabel = (s: number) => {
    if (s >= 80) return 'Alto';
    if (s >= 50) return 'Médio';
    return 'Baixo';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24" cy="24" r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="24" cy="24" r={radius}
                  fill="none"
                  stroke={getColor(score)}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: progress }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                {score}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {getLabel(score)} engajamento ({score}/100)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
