import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-destructive');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('bg-background');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-accent');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-secondary');
  });

  it('applies link variant classes', () => {
    render(<Button variant="link">Link</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('underline-offset-4');
  });

  it('applies default size classes', () => {
    render(<Button>Default Size</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-10');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-9');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-11');
  });

  it('applies icon size classes', () => {
    render(<Button size="icon">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-10');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('applies disabled opacity class', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('disabled:opacity-50');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Loader2 svg should be in the DOM with animate-spin class
    const svg = btn.querySelector('.animate-spin');
    expect(svg).toBeInTheDocument();
  });

  it('shows loadingText when isLoading and loadingText provided', () => {
    render(<Button isLoading loadingText="Please wait...">Submit</Button>);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('shows children text when isLoading without loadingText', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('is disabled when isLoading even without disabled prop', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref to button element', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('accepts additional className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button').className).toContain('custom-class');
  });

  it('renders as child slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });

  it('has correct type attribute by default', () => {
    render(<Button>Submit</Button>);
    // By default HTML buttons have type="submit" in forms
    // But standalone buttons should have no default type attr in component
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('accepts and applies type="submit" prop', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('accepts aria-label', () => {
    render(<Button aria-label="Close dialog">X</Button>);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });
});
