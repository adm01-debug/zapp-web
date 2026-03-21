import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroBenefits } from '../HeroBenefits';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    h2: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <h2 {...rest}>{children}</h2>;
    },
    p: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
  },
}));

describe('HeroBenefits', () => {
  it('renders the main heading', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('Tudo que você precisa para')).toBeInTheDocument();
  });

  it('renders the gradient subheading', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('atender com excelência')).toBeInTheDocument();
  });

  it('renders all 6 benefit titles', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('Inbox Unificado')).toBeInTheDocument();
    expect(screen.getByText('IA Integrada')).toBeInTheDocument();
    expect(screen.getByText('Analytics Avançado')).toBeInTheDocument();
    expect(screen.getByText('Multi-agentes')).toBeInTheDocument();
    expect(screen.getByText('SLA Tracking')).toBeInTheDocument();
    expect(screen.getByText('Segurança Total')).toBeInTheDocument();
  });

  it('renders all 6 benefit descriptions', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('Todas conversas em um só lugar')).toBeInTheDocument();
    expect(screen.getByText('Respostas automáticas inteligentes')).toBeInTheDocument();
    expect(screen.getByText('Métricas em tempo real')).toBeInTheDocument();
    expect(screen.getByText('Colaboração de equipe eficiente')).toBeInTheDocument();
    expect(screen.getByText('Monitore tempos de resposta')).toBeInTheDocument();
    expect(screen.getByText('Dados criptografados')).toBeInTheDocument();
  });

  it('renders the testimonial quote', () => {
    render(<HeroBenefits />);
    expect(screen.getByText(/Reduzimos o tempo de resposta em 60%/)).toBeInTheDocument();
  });

  it('renders the testimonial author name', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('João Mendes')).toBeInTheDocument();
  });

  it('renders the testimonial author title', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('Head de Suporte, TechCorp')).toBeInTheDocument();
  });

  it('renders author initials', () => {
    render(<HeroBenefits />);
    expect(screen.getByText('JM')).toBeInTheDocument();
  });

  it('uses a 2-column grid for benefits', () => {
    const { container } = render(<HeroBenefits />);
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).toBeInTheDocument();
  });

  it('has hidden on small screens, visible on lg', () => {
    const { container } = render(<HeroBenefits />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('hidden');
    expect(outerDiv.className).toContain('lg:flex');
  });

  it('renders 6 benefit items', () => {
    const { container } = render(<HeroBenefits />);
    const grid = container.querySelector('.grid-cols-2');
    expect(grid?.children.length).toBe(6);
  });
});
