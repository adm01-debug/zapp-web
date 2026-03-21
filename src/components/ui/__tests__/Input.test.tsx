import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    render(<Input placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('displays initial value', () => {
    render(<Input defaultValue="Hello" />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello');
  });

  it('handles controlled value', () => {
    const { rerender } = render(<Input value="first" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('first');
    rerender(<Input value="second" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('second');
  });

  it('calls onChange handler', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies disabled styling classes', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox').className).toContain('disabled:cursor-not-allowed');
  });

  it('applies error classes when error prop is true', () => {
    render(<Input error />);
    expect(screen.getByRole('textbox').className).toContain('border-destructive');
  });

  it('applies success classes when success prop is true', () => {
    render(<Input success />);
    expect(screen.getByRole('textbox').className).toContain('border-success');
  });

  it('renders with default glow variant', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-input');
  });

  it('renders with ghost variant', () => {
    render(<Input variant="ghost" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-transparent');
  });

  it('renders with underline variant', () => {
    render(<Input variant="underline" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-b-2');
  });

  it('applies sm size classes', () => {
    render(<Input inputSize="sm" />);
    expect(screen.getByRole('textbox').className).toContain('h-9');
  });

  it('applies lg size classes', () => {
    render(<Input inputSize="lg" />);
    expect(screen.getByRole('textbox').className).toContain('h-12');
  });

  it('renders left element when provided', () => {
    render(<Input leftElement={<span data-testid="left">L</span>} />);
    expect(screen.getByTestId('left')).toBeInTheDocument();
  });

  it('renders right element when provided', () => {
    render(<Input rightElement={<span data-testid="right">R</span>} />);
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('wraps input in relative div when addons present', () => {
    const { container } = render(<Input leftElement={<span>L</span>} />);
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toBeInTheDocument();
  });

  it('does not wrap input when no addons', () => {
    const { container } = render(<Input />);
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toBeNull();
  });

  it('applies additional className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox').className).toContain('custom-input');
  });

  it('supports type="password"', () => {
    render(<Input type="password" placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('supports type="email"', () => {
    render(<Input type="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('forwards ref to input element', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
