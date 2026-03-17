import * as React from 'react';
import { cn } from '@/lib/utils';

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  as?: 'span' | 'div' | 'label';
}

/**
 * Component that hides content visually but keeps it accessible to screen readers
 */
export function VisuallyHidden({ 
  children, 
  as: Component = 'span',
  className,
  ...props 
}: VisuallyHiddenProps) {
  return (
    <Component
      className={cn('sr-only', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Hook to announce content to screen readers
 */
export function useAnnounce() {
  const [politeAnnouncement, setPoliteAnnouncement] = React.useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = React.useState('');

  const announce = React.useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (politeness === 'assertive') {
      setAssertiveAnnouncement('');
      setTimeout(() => setAssertiveAnnouncement(message), 100);
    } else {
      setPoliteAnnouncement('');
      setTimeout(() => setPoliteAnnouncement(message), 100);
    }
  }, []);

  const Announcer = React.useMemo(() => {
    return function AnnouncerComponent() {
      return (
        <>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {politeAnnouncement}
          </div>
          <div
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
          >
            {assertiveAnnouncement}
          </div>
        </>
      );
    };
  }, [politeAnnouncement, assertiveAnnouncement]);

  return { announce, Announcer };
}

/**
 * Global live region for screen reader announcements
 */
export function LiveRegion() {
  return (
    <div
      id="live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
