import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageTemplateProps {
  /** Page title (H1) */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Icon shown next to title */
  icon?: React.ReactNode;
  /** Action buttons (top-right) */
  actions?: React.ReactNode;
  /** Filter/search bar row */
  filters?: React.ReactNode;
  /** Main page content */
  children: React.ReactNode;
  /** Extra classNames for the content area */
  className?: string;
  /** Whether content should have padding (default true) */
  padded?: boolean;
  /** Whether to use full-bleed (no max-width) */
  fullBleed?: boolean;
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export function PageTemplate({
  title,
  subtitle,
  icon,
  actions,
  filters,
  children,
  className,
  padded = true,
  fullBleed = false,
}: PageTemplateProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex flex-col w-full h-full overflow-hidden',
        !fullBleed && 'max-w-full'
      )}
    >
      {/* ─── Header ─── */}
      <header className={cn(
        'flex flex-col gap-3 shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm',
        padded ? 'px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4' : 'px-4 pt-4 pb-3'
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Title block */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {actions}
            </div>
          )}
        </div>

        {/* Filters row */}
        {filters && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            {filters}
          </div>
        )}
      </header>

      {/* ─── Content ─── */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden min-h-0',
          padded && 'p-4 sm:p-6',
          className
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}