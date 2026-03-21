import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProof } from '../SocialProof';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
  },
}));

function filterMotionProps(props: any) {
  const { initial, animate, transition, whileHover, whileTap, exit, ...rest } = props;
  return rest;
}

describe('SocialProof', () => {
  it('renders all 4 stats', () => {
    render(<SocialProof />);
    expect(screen.getByText('10k+')).toBeInTheDocument();
    expect(screen.getByText('1M+')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders stat labels', () => {
    render(<SocialProof />);
    expect(screen.getByText('Usuários ativos')).toBeInTheDocument();
    expect(screen.getByText('Mensagens/dia')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('Seguro')).toBeInTheDocument();
  });

  it('renders within a grid of 4 columns', () => {
    const { container } = render(<SocialProof />);
    const grid = container.querySelector('.grid-cols-4');
    expect(grid).toBeInTheDocument();
  });

  it('renders 4 stat items', () => {
    const { container } = render(<SocialProof />);
    const statItems = container.querySelectorAll('.text-center');
    expect(statItems.length).toBe(4);
  });

  it('renders SVG icons for each stat', () => {
    const { container } = render(<SocialProof />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it('contains border-t for visual separation', () => {
    const { container } = render(<SocialProof />);
    const wrapper = container.firstChild;
    expect((wrapper as HTMLElement).className).toContain('border-t');
  });

  it('applies mt-6 for spacing', () => {
    const { container } = render(<SocialProof />);
    const wrapper = container.firstChild;
    expect((wrapper as HTMLElement).className).toContain('mt-6');
  });

  it('renders consistently on re-render', () => {
    const { rerender } = render(<SocialProof />);
    rerender(<SocialProof />);
    expect(screen.getByText('10k+')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  it('values are displayed with correct formatting', () => {
    render(<SocialProof />);
    // Check that bold class is applied to values
    const value = screen.getByText('10k+');
    expect(value.className).toContain('font-bold');
  });

  it('labels use small text', () => {
    render(<SocialProof />);
    const label = screen.getByText('Usuários ativos');
    expect(label.className).toContain('text-');
  });
});
