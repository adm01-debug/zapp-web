import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SkipLink({ 
  href = '#main-content', 
  children = 'Pular para o conteúdo principal',
  className 
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Visually hidden but focusable
        'sr-only focus:not-sr-only',
        // When focused, show as a fixed button at top
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:px-4 focus:py-2 focus:rounded-lg',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:font-medium focus:text-sm',
        'focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:outline-none',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

// Multiple skip links for complex layouts
export function SkipLinks() {
  return (
    <div className="skip-links">
      <SkipLink href="#main-content">Pular para o conteúdo</SkipLink>
      <SkipLink href="#main-navigation">Pular para navegação</SkipLink>
      <SkipLink href="#search">Pular para busca</SkipLink>
    </div>
  );
}
