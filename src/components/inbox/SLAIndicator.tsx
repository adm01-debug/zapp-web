import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SLAIndicatorProps {
  firstMessageAt: Date;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  className?: string;
  compact?: boolean;
}

type SLAStatus = 'ok' | 'warning' | 'breached';

interface SLAState {
  firstResponse: {
    status: SLAStatus;
    remainingMs: number;
    breached: boolean;
  };
  resolution: {
    status: SLAStatus;
    remainingMs: number;
    breached: boolean;
  };
}

function formatTimeRemaining(ms: number): string {
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function calculateSLAState(
  firstMessageAt: Date,
  firstResponseAt: Date | null | undefined,
  resolvedAt: Date | null | undefined,
  firstResponseMinutes: number,
  resolutionMinutes: number
): SLAState {
  const now = new Date();
  const firstResponseDeadline = new Date(firstMessageAt.getTime() + firstResponseMinutes * 60 * 1000);
  const resolutionDeadline = new Date(firstMessageAt.getTime() + resolutionMinutes * 60 * 1000);

  // First Response SLA
  let firstResponseStatus: SLAStatus = 'ok';
  let firstResponseRemaining = firstResponseDeadline.getTime() - now.getTime();
  let firstResponseBreached = false;

  if (firstResponseAt) {
    // Already responded
    firstResponseBreached = firstResponseAt > firstResponseDeadline;
    firstResponseStatus = firstResponseBreached ? 'breached' : 'ok';
    firstResponseRemaining = 0;
  } else {
    // Still waiting for response
    const warningThreshold = firstResponseMinutes * 60 * 1000 * 0.3; // 30% remaining
    if (firstResponseRemaining <= 0) {
      firstResponseStatus = 'breached';
      firstResponseBreached = true;
    } else if (firstResponseRemaining <= warningThreshold) {
      firstResponseStatus = 'warning';
    }
  }

  // Resolution SLA
  let resolutionStatus: SLAStatus = 'ok';
  let resolutionRemaining = resolutionDeadline.getTime() - now.getTime();
  let resolutionBreached = false;

  if (resolvedAt) {
    // Already resolved
    resolutionBreached = resolvedAt > resolutionDeadline;
    resolutionStatus = resolutionBreached ? 'breached' : 'ok';
    resolutionRemaining = 0;
  } else {
    // Still open
    const warningThreshold = resolutionMinutes * 60 * 1000 * 0.3; // 30% remaining
    if (resolutionRemaining <= 0) {
      resolutionStatus = 'breached';
      resolutionBreached = true;
    } else if (resolutionRemaining <= warningThreshold) {
      resolutionStatus = 'warning';
    }
  }

  return {
    firstResponse: {
      status: firstResponseStatus,
      remainingMs: firstResponseRemaining,
      breached: firstResponseBreached,
    },
    resolution: {
      status: resolutionStatus,
      remainingMs: resolutionRemaining,
      breached: resolutionBreached,
    },
  };
}

const statusStyles = {
  ok: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    icon: CheckCircle,
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    icon: Clock,
  },
  breached: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
    icon: AlertTriangle,
  },
};

export const SLAIndicator = React.memo(function SLAIndicator({
  firstMessageAt,
  firstResponseAt,
  resolvedAt,
  firstResponseMinutes,
  resolutionMinutes,
  className,
  compact = false,
}: SLAIndicatorProps) {
  const [slaState, setSlaState] = useState<SLAState>(() =>
    calculateSLAState(firstMessageAt, firstResponseAt, resolvedAt, firstResponseMinutes, resolutionMinutes)
  );

  useEffect(() => {
    // Update SLA state every second if not completed
    if (firstResponseAt && resolvedAt) return;

    const interval = setInterval(() => {
      setSlaState(
        calculateSLAState(firstMessageAt, firstResponseAt, resolvedAt, firstResponseMinutes, resolutionMinutes)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [firstMessageAt, firstResponseAt, resolvedAt, firstResponseMinutes, resolutionMinutes]);

  // Determine the worst status to show
  const worstStatus = slaState.resolution.status === 'breached' || slaState.firstResponse.status === 'breached'
    ? 'breached'
    : slaState.resolution.status === 'warning' || slaState.firstResponse.status === 'warning'
    ? 'warning'
    : 'ok';

  const style = statusStyles[worstStatus];
  const Icon = style.icon;

  // If fully resolved and OK, don't show indicator
  if (resolvedAt && worstStatus === 'ok') {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
                style.bg,
                style.text,
                style.border,
                worstStatus === 'breached' && 'animate-pulse',
                className
              )}
            >
              <Icon className="w-3 h-3" />
              {!firstResponseAt && slaState.firstResponse.remainingMs > 0 && (
                <span>{formatTimeRemaining(slaState.firstResponse.remainingMs)}</span>
              )}
              {firstResponseAt && !resolvedAt && slaState.resolution.remainingMs > 0 && (
                <span>{formatTimeRemaining(slaState.resolution.remainingMs)}</span>
              )}
              {(slaState.firstResponse.breached || slaState.resolution.breached) && (
                <span>SLA</span>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Timer className="w-3 h-3" />
                <span className="font-medium">Primeira Resposta:</span>
                {firstResponseAt ? (
                  <span className={slaState.firstResponse.breached ? 'text-destructive' : 'text-emerald-500'}>
                    {slaState.firstResponse.breached ? 'Violado' : 'OK'}
                  </span>
                ) : (
                  <span className={statusStyles[slaState.firstResponse.status].text}>
                    {slaState.firstResponse.status === 'breached' 
                      ? 'Violado' 
                      : formatTimeRemaining(slaState.firstResponse.remainingMs)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span className="font-medium">Resolução:</span>
                {resolvedAt ? (
                  <span className={slaState.resolution.breached ? 'text-destructive' : 'text-emerald-500'}>
                    {slaState.resolution.breached ? 'Violado' : 'OK'}
                  </span>
                ) : (
                  <span className={statusStyles[slaState.resolution.status].text}>
                    {slaState.resolution.status === 'breached'
                      ? 'Violado'
                      : formatTimeRemaining(slaState.resolution.remainingMs)}
                  </span>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* First Response SLA */}
      {!firstResponseAt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border',
            statusStyles[slaState.firstResponse.status].bg,
            statusStyles[slaState.firstResponse.status].text,
            statusStyles[slaState.firstResponse.status].border,
            slaState.firstResponse.status === 'breached' && 'animate-pulse'
          )}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>1ª Resp:</span>
          <span className="font-bold">
            {slaState.firstResponse.status === 'breached' 
              ? 'Violado' 
              : formatTimeRemaining(slaState.firstResponse.remainingMs)}
          </span>
        </motion.div>
      )}

      {/* Resolution SLA */}
      {!resolvedAt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border',
            statusStyles[slaState.resolution.status].bg,
            statusStyles[slaState.resolution.status].text,
            statusStyles[slaState.resolution.status].border,
            slaState.resolution.status === 'breached' && 'animate-pulse'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Resolução:</span>
          <span className="font-bold">
            {slaState.resolution.status === 'breached'
              ? 'Violado'
              : formatTimeRemaining(slaState.resolution.remainingMs)}
          </span>
        </motion.div>
      )}
    </div>
  );
});