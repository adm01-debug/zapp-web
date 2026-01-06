import { cn } from "@/lib/utils";

type SkeletonVariant = "pulse" | "shimmer" | "wave";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** Delay in ms for staggered animations */
  delay?: number;
}

function Skeleton({ 
  className, 
  variant = "shimmer", 
  delay = 0,
  style,
  ...props 
}: SkeletonProps) {
  const variantClasses = {
    pulse: "animate-pulse",
    shimmer: "skeleton-shimmer",
    wave: "skeleton-wave",
  };

  return (
    <div 
      className={cn(
        "rounded-md bg-muted relative overflow-hidden",
        variantClasses[variant],
        className
      )} 
      style={{ 
        ...style,
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
      {...props} 
    />
  );
}

/** Skeleton with shimmer wrapper for cards */
function SkeletonCard({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-card border border-border", className)}>
      {children}
      <div 
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-background/60 to-transparent pointer-events-none" 
        aria-hidden="true"
      />
    </div>
  );
}

/** Staggered skeleton list for better visual feedback */
function SkeletonList({ 
  count = 5, 
  children,
  staggerDelay = 80,
}: { 
  count?: number; 
  children: (index: number) => React.ReactNode;
  staggerDelay?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="animate-fade-in"
          style={{ 
            animationDelay: `${i * staggerDelay}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {children(i)}
        </div>
      ))}
    </>
  );
}

export { Skeleton, SkeletonCard, SkeletonList };
