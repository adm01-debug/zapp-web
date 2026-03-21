import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  it('renders badge text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-primary');
  });

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary');
    expect(badge.className).toContain('bg-secondary');
  });

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const badge = screen.getByText('Destructive');
    expect(badge.className).toContain('bg-destructive');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge.className).toContain('text-foreground');
  });

  it('has rounded-full class', () => {
    render(<Badge>Round</Badge>);
    expect(screen.getByText('Round').className).toContain('rounded-full');
  });

  it('has inline-flex class', () => {
    render(<Badge>Flex</Badge>);
    expect(screen.getByText('Flex').className).toContain('inline-flex');
  });

  it('applies font-semibold', () => {
    render(<Badge>Bold</Badge>);
    expect(screen.getByText('Bold').className).toContain('font-semibold');
  });

  it('applies text-xs size', () => {
    render(<Badge>Small</Badge>);
    expect(screen.getByText('Small').className).toContain('text-xs');
  });

  it('applies custom className', () => {
    render(<Badge className="my-custom">Custom</Badge>);
    expect(screen.getByText('Custom').className).toContain('my-custom');
  });

  it('renders as a div element', () => {
    render(<Badge>Div</Badge>);
    const badge = screen.getByText('Div');
    expect(badge.tagName).toBe('DIV');
  });

  it('renders children nodes', () => {
    render(
      <Badge>
        <span data-testid="icon">*</span>
        Status
      </Badge>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('has focus ring styles', () => {
    render(<Badge>Focus</Badge>);
    expect(screen.getByText('Focus').className).toContain('focus:ring-2');
  });

  it('has border-transparent for non-outline variants', () => {
    render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText('Default').className).toContain('border-transparent');
  });

  it('can receive additional HTML attributes', () => {
    render(<Badge data-testid="my-badge" role="status">Active</Badge>);
    expect(screen.getByTestId('my-badge')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
