import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustration?: 'inbox' | 'contacts' | 'queues' | 'messages' | 'data' | 'search' | 'tags' | 'transcriptions' | 'agents' | 'wallet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const illustrations: Record<string, React.ReactNode> = {
  inbox: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="40" y="40" width="120" height="80" rx="8"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.path
        d="M40 60 L100 100 L160 60"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.circle
        cx="140" cy="50" r="15"
        className="fill-success/20 stroke-success"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.6, type: 'spring' }}
      />
      <motion.path
        d="M135 50 L138 53 L145 46"
        className="stroke-success"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.9 }}
      />
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.circle
        cx="100" cy="60" r="25"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      />
      <motion.path
        d="M65 130 C65 100 100 90 100 90 C100 90 135 100 135 130"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.circle
        cx="55" cy="70" r="15"
        className="fill-secondary/20 stroke-secondary"
        strokeWidth="2"
        initial={{ scale: 0, x: 20 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
      <motion.circle
        cx="145" cy="70" r="15"
        className="fill-secondary/20 stroke-secondary"
        strokeWidth="2"
        initial={{ scale: 0, x: -20 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
    </svg>
  ),
  queues: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {[0, 1, 2].map((i) => (
        <motion.g key={i}>
          <motion.rect
            x="50" y={40 + i * 30} width="100" height="20" rx="4"
            className="fill-muted stroke-border"
            strokeWidth="2"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
          />
          <motion.rect
            x="55" y={45 + i * 30} width={60 - i * 15} height="10" rx="2"
            className="fill-primary/40"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
          />
        </motion.g>
      ))}
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="30" y="40" width="80" height="35" rx="8"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.rect
        x="90" y="85" width="80" height="35" rx="8"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5, type: 'spring' }}
      >
        <circle cx="45" cy="57" r="3" className="fill-muted-foreground/50" />
        <circle cx="60" cy="57" r="3" className="fill-muted-foreground/50" />
        <circle cx="75" cy="57" r="3" className="fill-muted-foreground/50" />
      </motion.g>
    </svg>
  ),
  data: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="50" y="100" width="25" height="40" rx="4"
        className="fill-primary/30 stroke-primary"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      />
      <motion.rect
        x="85" y="70" width="25" height="70" rx="4"
        className="fill-secondary/30 stroke-secondary"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <motion.rect
        x="120" y="50" width="25" height="90" rx="4"
        className="fill-success/30 stroke-success"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />
      <motion.path
        d="M40 40 L40 145 L165 145"
        className="stroke-border"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.circle
        cx="90" cy="70" r="35"
        className="fill-muted stroke-border"
        strokeWidth="3"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      />
      <motion.line
        x1="115" y1="95" x2="145" y2="125"
        className="stroke-primary"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      <motion.path
        d="M75 70 L85 80 L105 60"
        className="stroke-muted-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.5 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
    </svg>
  ),
  tags: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.path
        d="M60 60 L100 60 L140 100 L100 140 L60 100 Z"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
      />
      <motion.circle
        cx="80" cy="80" r="8"
        className="fill-background stroke-primary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
      <motion.path
        d="M90 50 L130 50 L160 80 L130 110"
        className="stroke-secondary"
        strokeWidth="2"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
    </svg>
  ),
  transcriptions: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="50" y="30" width="100" height="100" rx="8"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x="60" y={50 + i * 18} width={70 - i * 10} height="8" rx="2"
          className="fill-primary/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
        />
      ))}
      <motion.circle
        cx="145" cy="45" r="20"
        className="fill-secondary/20 stroke-secondary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5, type: 'spring' }}
      />
      <motion.path
        d="M145 35 L145 55 M135 45 L155 45"
        className="stroke-secondary"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.circle
        cx="100" cy="55" r="25"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      />
      <motion.path
        d="M55 130 C55 95 100 85 100 85 C100 85 145 95 145 130"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <motion.circle
        cx="130" cy="40" r="12"
        className="fill-success/30 stroke-success"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
      <motion.path
        d="M125 40 L128 43 L135 36"
        className="stroke-success"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="40" y="50" width="120" height="70" rx="8"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.rect
        x="120" y="70" width="50" height="30" rx="4"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      <motion.circle
        cx="140" cy="85" r="8"
        className="fill-primary stroke-primary-foreground"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5, type: 'spring' }}
      />
    </svg>
  ),
};

const sizeClasses = {
  sm: {
    container: 'py-6',
    illustration: 'w-24 h-20',
    icon: 'w-8 h-8',
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'py-10',
    illustration: 'w-40 h-32',
    icon: 'w-12 h-12',
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    illustration: 'w-56 h-44',
    icon: 'w-16 h-16',
    title: 'text-lg',
    description: 'text-base',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {illustration && illustrations[illustration] ? (
        <div className={cn('mb-4', sizes.illustration)}>
          {illustrations[illustration]}
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1, type: 'spring' }}
          className="mb-4 p-4 rounded-full bg-muted/50"
        >
          <Icon className={cn('text-muted-foreground', sizes.icon)} />
        </motion.div>
      )}

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={cn('font-semibold text-foreground mb-2', sizes.title)}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className={cn('text-muted-foreground max-w-sm mb-4', sizes.description)}
      >
        {description}
      </motion.p>

      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {actionLabel && onAction && (
            <Button onClick={onAction} size={size === 'sm' ? 'sm' : 'default'}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
