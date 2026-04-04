import { motion } from 'framer-motion';
import { type LucideIcon, Plus, ArrowRight } from 'lucide-react';
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
  illustration?: 'inbox' | 'contacts' | 'queues' | 'messages' | 'data' | 'search' | 'tags' | 'transcriptions' | 'agents' | 'calls' | 'notifications' | 'dashboard';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Enhanced animated illustrations
const illustrations: Record<string, React.ReactNode> = {
  inbox: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Floating chat bubbles with continuous animation */}
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="35" y="45" width="85" height="45" rx="12" className="fill-primary/20" />
        <rect x="48" y="58" width="45" height="5" rx="2.5" className="fill-primary/40" />
        <rect x="48" y="70" width="60" height="5" rx="2.5" className="fill-primary/30" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="80" y="100" width="85" height="40" rx="12" className="fill-muted/60" />
        <rect x="93" y="112" width="55" height="5" rx="2.5" className="fill-muted-foreground/30" />
        <rect x="93" y="123" width="35" height="5" rx="2.5" className="fill-muted-foreground/20" />
      </motion.g>
      {/* Decorative dots */}
      <motion.circle
        cx="28" cy="35"
        r="5"
        className="fill-primary/30"
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="172" cy="55"
        r="4"
        className="fill-secondary/40"
        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="155" cy="125"
        r="6"
        className="fill-primary/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
      />
      {/* Sparkle */}
      <motion.g
        animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: '170px 35px' }}
      >
        <polygon points="170,28 172,34 178,35 172,36 170,42 168,36 162,35 168,34" className="fill-primary/50" />
      </motion.g>
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Contact cards floating */}
      <motion.g
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="28" y="38" width="144" height="38" rx="10" className="fill-muted/50" />
        <circle cx="55" cy="57" r="14" className="fill-primary/30" />
        <rect x="78" y="50" width="65" height="6" rx="3" className="fill-foreground/20" />
        <rect x="78" y="62" width="45" height="5" rx="2.5" className="fill-muted-foreground/20" />
      </motion.g>
      <motion.g
        animate={{ x: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="28" y="86" width="144" height="38" rx="10" className="fill-muted/30" />
        <circle cx="55" cy="105" r="14" className="fill-secondary/30" />
        <rect x="78" y="98" width="55" height="6" rx="3" className="fill-foreground/15" />
        <rect x="78" y="110" width="75" height="5" rx="2.5" className="fill-muted-foreground/15" />
      </motion.g>
      {/* Plus icon floating */}
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [0, 12, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: '170px 32px' }}
      >
        <circle cx="170" cy="32" r="16" className="fill-primary/20" />
        <rect x="164" y="29" width="12" height="3" rx="1.5" className="fill-primary" />
        <rect x="168.5" y="24" width="3" height="12" rx="1.5" className="fill-primary" />
      </motion.g>
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Animated chart bars */}
      <motion.rect
        x="28" y="95" width="28" height="45" rx="5"
        className="fill-primary/30"
        animate={{ height: [45, 55, 45], y: [95, 85, 95] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.rect
        x="65" y="72" width="28" height="68" rx="5"
        className="fill-primary/45"
        animate={{ height: [68, 78, 68], y: [72, 62, 72] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      <motion.rect
        x="102" y="50" width="28" height="90" rx="5"
        className="fill-primary/55"
        animate={{ height: [90, 100, 90], y: [50, 40, 50] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.rect
        x="139" y="82" width="28" height="58" rx="5"
        className="fill-primary/38"
        animate={{ height: [58, 68, 58], y: [82, 72, 82] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
      />
      {/* Trend line */}
      <motion.path
        d="M42 85 L80 62 L117 42 L155 58"
        className="stroke-secondary"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        animate={{ pathLength: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Sparkle */}
      <motion.g
        animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: '172px 28px' }}
      >
        <polygon points="172,18 175,26 182,28 175,30 172,38 169,30 162,28 169,26" className="fill-primary/60" />
      </motion.g>
    </svg>
  ),
  calls: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Phone icon with ringing animation */}
      <motion.g
        animate={{ rotate: [-8, 8, -8] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: '100px 80px' }}
      >
        <rect x="68" y="48" width="64" height="64" rx="16" className="fill-primary/20" />
        <path
          d="M88 68 C88 68 94 74 100 80 C106 86 112 92 112 92"
          className="stroke-primary"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>
      {/* Wave rings */}
      <motion.circle
        cx="100" cy="80" r="42"
        className="stroke-primary/30"
        strokeWidth="2"
        fill="none"
        animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="100" cy="80" r="42"
        className="stroke-primary/20"
        strokeWidth="2"
        fill="none"
        animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Bell with gentle swing */}
      <motion.g
        animate={{ rotate: [-12, 12, -12] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        style={{ transformOrigin: '100px 48px' }}
      >
        <path
          d="M100 28 C78 28 68 50 68 72 L68 92 L56 104 L144 104 L132 92 L132 72 C132 50 122 28 100 28 Z"
          className="fill-primary/30"
        />
        <ellipse cx="100" cy="114" rx="12" ry="6" className="fill-primary/40" />
      </motion.g>
      {/* Notification dot */}
      <motion.circle
        cx="128" cy="42"
        r="10"
        className="fill-destructive/60"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {/* Z's for sleeping/empty */}
      <motion.text
        x="152" y="58"
        className="fill-muted-foreground/40 text-sm font-bold"
        animate={{ opacity: [0, 1, 0], x: [152, 164, 176] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        z
      </motion.text>
      <motion.text
        x="164" y="42"
        className="fill-muted-foreground/30 text-base font-bold"
        animate={{ opacity: [0, 1, 0], x: [164, 176, 188] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        z
      </motion.text>
    </svg>
  ),
  queues: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {[0, 1, 2].map((i) => (
        <motion.g key={i}>
          <motion.rect
            x="45" y={38 + i * 32} width="110" height="24" rx="6"
            className="fill-muted stroke-border"
            strokeWidth="2"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
          />
          <motion.rect
            x="52" y={44 + i * 32} width={65 - i * 18} height="12" rx="3"
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
        x="28" y="38" width="85" height="40" rx="10"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.rect
        x="88" y="88" width="85" height="40" rx="10"
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
        <circle cx="48" cy="58" r="4" className="fill-muted-foreground/50" />
        <circle cx="65" cy="58" r="4" className="fill-muted-foreground/50" />
        <circle cx="82" cy="58" r="4" className="fill-muted-foreground/50" />
      </motion.g>
    </svg>
  ),
  data: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="48" y="98" width="28" height="44" rx="5"
        className="fill-primary/30 stroke-primary"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      />
      <motion.rect
        x="85" y="68" width="28" height="74" rx="5"
        className="fill-secondary/30 stroke-secondary"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <motion.rect
        x="122" y="48" width="28" height="94" rx="5"
        className="fill-success/30 stroke-success"
        strokeWidth="2"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        style={{ originY: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />
      <motion.path
        d="M38 38 L38 148 L168 148"
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
      {/* Magnifying glass with subtle animation */}
      <motion.g
        animate={{ x: [0, 8, 0], y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.circle
          cx="88" cy="68" r="38"
          className="fill-muted stroke-border"
          strokeWidth="4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, type: 'spring' }}
        />
        <motion.line
          x1="116" y1="96" x2="148" y2="128"
          className="stroke-primary"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />
      </motion.g>
      {/* Question marks */}
      <motion.text
        x="38" y="48"
        className="fill-muted-foreground/30 text-2xl font-bold"
        animate={{ opacity: [0.3, 0.7, 0.3], y: [48, 42, 48] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ?
      </motion.text>
      <motion.text
        x="152" y="88"
        className="fill-muted-foreground/20 text-xl font-bold"
        animate={{ opacity: [0.2, 0.6, 0.2], y: [88, 82, 88] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        ?
      </motion.text>
    </svg>
  ),
  tags: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Tags floating with different animations */}
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: '80px 74px' }}
      >
        <rect x="48" y="58" width="64" height="32" rx="16" className="fill-primary/30" />
        <circle cx="66" cy="74" r="6" className="fill-primary/50" />
        <rect x="78" y="70" width="28" height="5" rx="2.5" className="fill-primary/40" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -8, 0], rotate: [3, -3, 3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        style={{ transformOrigin: '118px 108px' }}
      >
        <rect x="88" y="94" width="60" height="28" rx="14" className="fill-secondary/30" />
        <circle cx="104" cy="108" r="5" className="fill-secondary/50" />
        <rect x="114" y="104" width="24" height="5" rx="2.5" className="fill-secondary/40" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [-2, 4, -2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ transformOrigin: '95px 40px' }}
      >
        <rect x="68" y="28" width="54" height="24" rx="12" className="fill-muted/50" />
        <circle cx="82" cy="40" r="5" className="fill-muted-foreground/30" />
        <rect x="92" y="36" width="22" height="4" rx="2" className="fill-muted-foreground/20" />
      </motion.g>
    </svg>
  ),
  transcriptions: (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <motion.rect
        x="48" y="28" width="104" height="104" rx="10"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x="60" y={48 + i * 20} width={75 - i * 12} height="10" rx="3"
          className="fill-primary/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
        />
      ))}
      <motion.circle
        cx="148" cy="42"
        r="22"
        className="fill-secondary/20 stroke-secondary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5, type: 'spring' }}
      />
      <motion.path
        d="M148 32 L148 52 M138 42 L158 42"
        className="stroke-secondary"
        strokeWidth="3"
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
        cx="100" cy="52"
        r="28"
        className="fill-primary/20 stroke-primary"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      />
      <motion.path
        d="M52 132 C52 94 100 82 100 82 C100 82 148 94 148 132"
        className="fill-muted stroke-border"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <motion.circle
        cx="132" cy="38"
        r="14"
        className="fill-success/30 stroke-success"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
      <motion.path
        d="M126 38 L130 42 L138 34"
        className="stroke-success"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
    </svg>
  ),
};

const sizeClasses = {
  sm: {
    container: 'py-6',
    illustration: 'w-28 h-22',
    icon: 'w-10 h-10',
    iconContainer: 'w-14 h-14',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-10',
    illustration: 'w-44 h-36',
    icon: 'w-7 h-7',
    iconContainer: 'w-14 h-14',
    title: 'text-lg',
    description: 'text-base',
  },
  lg: {
    container: 'py-16',
    illustration: 'w-56 h-44',
    icon: 'w-8 h-8',
    iconContainer: 'w-16 h-16',
    title: 'text-xl',
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
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Illustration with glow effect */}
      {illustration && illustrations[illustration] ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={cn('relative mb-6', sizes.illustration)}
        >
          {illustrations[illustration]}
          {/* Subtle glow behind illustration */}
          <div className="absolute inset-0 -z-10 blur-3xl">
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-full" />
          </div>
        </motion.div>
      ) : null}

      {/* Icon badge with gradient */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.3, type: 'spring', stiffness: 200 }}
        className={cn(
          'flex items-center justify-center rounded-2xl mb-4',
          sizes.iconContainer
        )}
        style={{ background: 'var(--gradient-primary)' }}
      >
        <Icon className={cn('text-primary-foreground', sizes.icon)} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className={cn('font-display font-semibold text-foreground mb-2', sizes.title)}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className={cn('text-muted-foreground max-w-md mb-6', sizes.description)}
      >
        {description}
      </motion.p>

      {/* Actions with enhanced styling */}
      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size={size === 'sm' ? 'sm' : 'default'}
              className="group shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="ghost"
              onClick={onSecondaryAction}
              size={size === 'sm' ? 'sm' : 'default'}
              className="text-muted-foreground hover:text-foreground"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
