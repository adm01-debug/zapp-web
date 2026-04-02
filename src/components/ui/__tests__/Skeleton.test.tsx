import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonText, SkeletonAvatar, SkeletonButton } from '../skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('has role="status" for accessibility', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label="Carregando..." for accessibility', () => {
    render(<Skeleton />);
    expect(screen.getByLabelText('Carregando...')).toBeInTheDocument();
  });

  it('applies default shimmer variant', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain('skeleton-shimmer');
  });

  it('applies pulse variant', () => {
    const { container } = render(<Skeleton variant="pulse" />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse-soft');
  });

  it('applies wave variant', () => {
    const { container } = render(<Skeleton variant="wave" />);
    expect((container.firstChild as HTMLElement).className).toContain('skeleton-wave');
  });

  it('applies subtle variant', () => {
    const { container } = render(<Skeleton variant="subtle" />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse');
  });

  it('applies slow speed', () => {
    const { container } = render(<Skeleton speed="slow" />);
    expect((container.firstChild as HTMLElement).className).toContain('[animation-duration:3s]');
  });

  it('applies fast speed', () => {
    const { container } = render(<Skeleton speed="fast" />);
    expect((container.firstChild as HTMLElement).className).toContain('[animation-duration:1.5s]');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-full');
  });

  it('applies animation delay when provided', () => {
    const { container } = render(<Skeleton delay={200} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDelay).toBe('200ms');
  });

  it('does not set animation delay when delay is 0', () => {
    const { container } = render(<Skeleton delay={0} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDelay).toBe('');
  });

  it('applies bg-muted base class', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-muted');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    render(<Skeleton ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('SkeletonCard', () => {
  it('renders children', () => {
    render(<SkeletonCard><div data-testid="child">Content</div></SkeletonCard>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('has border and rounded styling', () => {
    const { container } = render(<SkeletonCard>X</SkeletonCard>);
    expect((container.firstChild as HTMLElement).className).toContain('rounded-xl');
  });

  it('has shimmer overlay with aria-hidden', () => {
    const { container } = render(<SkeletonCard>X</SkeletonCard>);
    const shimmer = container.querySelector('[aria-hidden="true"]');
    expect(shimmer).toBeInTheDocument();
  });
});

describe('SkeletonList', () => {
  it('renders correct count of items', () => {
    const { container } = render(
      <SkeletonList count={3}>
        {(i) => <div key={i} data-testid={`item-${i}`}>Item {i}</div>}
      </SkeletonList>
    );
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
  });

  it('defaults to 5 items', () => {
    const { container } = render(
      <SkeletonList>
        {(i) => <div data-testid={`item-${i}`}>Item</div>}
      </SkeletonList>
    );
    expect(screen.getAllByText('Item')).toHaveLength(5);
  });
});

describe('SkeletonText', () => {
  it('renders default 3 lines', () => {
    render(<SkeletonText />);
    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(3);
  });

  it('renders custom line count', () => {
    render(<SkeletonText lines={5} />);
    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(5);
  });
});

describe('SkeletonAvatar', () => {
  it('renders with rounded-full class', () => {
    const { container } = render(<SkeletonAvatar />);
    const el = container.querySelector('.rounded-full');
    expect(el).toBeInTheDocument();
  });

  it('applies sm size', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);
    const el = container.querySelector('.w-8');
    expect(el).toBeInTheDocument();
  });

  it('applies lg size', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    const el = container.querySelector('.w-12');
    expect(el).toBeInTheDocument();
  });
});

describe('SkeletonButton', () => {
  it('renders with rounded-lg class', () => {
    const { container } = render(<SkeletonButton />);
    const el = container.querySelector('.rounded-lg');
    expect(el).toBeInTheDocument();
  });

  it('applies sm size', () => {
    const { container } = render(<SkeletonButton size="sm" />);
    const el = container.querySelector('.h-8');
    expect(el).toBeInTheDocument();
  });
});
