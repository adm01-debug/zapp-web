import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  it('renders with password type by default', () => {
    render(<PasswordInput id="pw" />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders with the given id', () => {
    render(<PasswordInput id="my-password" />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('id', 'my-password');
  });

  it('toggles to text type when eye button is clicked', async () => {
    render(<PasswordInput id="pw" />);
    const input = screen.getByPlaceholderText('••••••••');
    const toggleBtn = screen.getByRole('button');

    await userEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password type on second click', async () => {
    render(<PasswordInput id="pw" />);
    const input = screen.getByPlaceholderText('••••••••');
    const toggleBtn = screen.getByRole('button');

    await userEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('passes through additional input props', () => {
    const onChange = vi.fn();
    render(<PasswordInput id="pw" value="secret" onChange={onChange} />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('value', 'secret');
  });

  it('handles user typing', async () => {
    const onChange = vi.fn();
    render(<PasswordInput id="pw" onChange={onChange} />);
    const input = screen.getByPlaceholderText('••••••••');

    await userEvent.type(input, 'hello');
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('toggle button has tabIndex -1 to not interfere with form tabbing', () => {
    render(<PasswordInput id="pw" />);
    const toggleBtn = screen.getByRole('button');
    expect(toggleBtn).toHaveAttribute('tabindex', '-1');
  });

  it('applies custom className', () => {
    render(<PasswordInput id="pw" className="custom-class" />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input.className).toContain('custom-class');
  });

  it('can be disabled', () => {
    render(<PasswordInput id="pw" disabled />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toBeDisabled();
  });

  it('renders the lock icon', () => {
    const { container } = render(<PasswordInput id="pw" />);
    // Lock icon is an SVG inside the wrapper
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('toggle button is type="button" to prevent form submission', () => {
    render(<PasswordInput id="pw" />);
    const toggleBtn = screen.getByRole('button');
    expect(toggleBtn).toHaveAttribute('type', 'button');
  });

  it('supports required attribute', () => {
    render(<PasswordInput id="pw" required />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toBeRequired();
  });

  it('supports autoComplete attribute', () => {
    render(<PasswordInput id="pw" autoComplete="current-password" />);
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });
});
