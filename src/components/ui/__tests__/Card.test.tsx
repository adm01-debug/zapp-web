import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-border');
    expect(card.className).toContain('bg-card');
  });

  it('applies elevated variant', () => {
    const { container } = render(<Card variant="elevated">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('shadow-lg');
  });

  it('applies interactive variant', () => {
    const { container } = render(<Card variant="interactive">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cursor-pointer');
  });

  it('applies ghost variant', () => {
    const { container } = render(<Card variant="ghost">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-transparent');
  });

  it('applies glass variant', () => {
    const { container } = render(<Card variant="glass">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-lg');
  });

  it('applies neon variant', () => {
    const { container } = render(<Card variant="neon">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-secondary/50');
  });

  it('applies padding sm', () => {
    const { container } = render(<Card padding="sm">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-4');
  });

  it('applies padding lg', () => {
    const { container } = render(<Card padding="lg">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-8');
  });

  it('renders with custom className', () => {
    const { container } = render(<Card className="custom-card">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-card');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    render(<Card ref={ref}>Test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardHeader', () => {
  it('renders header content', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('applies flex-col class', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect((container.firstChild as HTMLElement).className).toContain('flex-col');
  });
});

describe('CardTitle', () => {
  it('renders as h3 heading', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByText('Title');
    expect(heading.tagName).toBe('H3');
  });

  it('applies font-semibold class', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title').className).toContain('font-semibold');
  });
});

describe('CardDescription', () => {
  it('renders as paragraph', () => {
    render(<CardDescription>Description</CardDescription>);
    const desc = screen.getByText('Description');
    expect(desc.tagName).toBe('P');
  });

  it('applies muted text color', () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText('Description').className).toContain('text-muted-foreground');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content here</CardContent>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('applies padding classes', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    expect((container.firstChild as HTMLElement).className).toContain('p-6');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies flex alignment', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    expect((container.firstChild as HTMLElement).className).toContain('flex');
    expect((container.firstChild as HTMLElement).className).toContain('items-center');
  });
});

describe('Card composition', () => {
  it('renders full card with header, content, and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Card</CardTitle>
          <CardDescription>A description</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(screen.getByText('My Card')).toBeInTheDocument();
    expect(screen.getByText('A description')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});
