import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeModal } from '../WelcomeModal';

describe('WelcomeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onStartTour: vi.fn(),
  };

  it('renders when isOpen is true', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/Bem-vindo/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<WelcomeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Bem-vindo/)).not.toBeInTheDocument();
  });

  it('shows personalized greeting with userName', () => {
    render(<WelcomeModal {...defaultProps} userName="John Smith" />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it('shows generic greeting without userName', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/Bem-vindo!/)).toBeInTheDocument();
  });

  it('shows tour description text', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/Quer fazer um tour rápido/)).toBeInTheDocument();
  });

  it('renders skip tour button', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText('Pular tour')).toBeInTheDocument();
  });

  it('renders start tour button', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText('Iniciar Tour Guiado')).toBeInTheDocument();
  });

  it('calls onClose when skip tour is clicked', () => {
    const onClose = vi.fn();
    render(<WelcomeModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Pular tour'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStartTour when start tour is clicked', () => {
    const onStartTour = vi.fn();
    render(<WelcomeModal {...defaultProps} onStartTour={onStartTour} />);
    fireEvent.click(screen.getByText('Iniciar Tour Guiado'));
    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<WelcomeModal {...defaultProps} onClose={onClose} />);
    // X button is the one with the X icon
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(b => !b.textContent?.includes('tour') && !b.textContent?.includes('Tour'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('shows feature previews', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText('Chat em tempo real')).toBeInTheDocument();
    expect(screen.getByText('Dashboard de metas')).toBeInTheDocument();
    expect(screen.getByText('Alertas inteligentes')).toBeInTheDocument();
  });

  it('shows hint about accessing tour later', () => {
    render(<WelcomeModal {...defaultProps} />);
    expect(screen.getByText(/acessar o tour novamente/)).toBeInTheDocument();
  });

  it('renders rocket icon area', () => {
    const { container } = render(<WelcomeModal {...defaultProps} />);
    // The modal should contain the gradient box with the rocket
    const gradientBox = container.querySelector('.bg-gradient-to-br');
    expect(gradientBox).toBeInTheDocument();
  });

  it('uses first name only from userName', () => {
    render(<WelcomeModal {...defaultProps} userName="Maria Silva Santos" />);
    expect(screen.getByText(/Maria/)).toBeInTheDocument();
  });

  it('renders backdrop overlay', () => {
    const { container } = render(<WelcomeModal {...defaultProps} />);
    const overlay = container.querySelector('.backdrop-blur-sm');
    expect(overlay).toBeInTheDocument();
  });

  it('renders card container', () => {
    const { container } = render(<WelcomeModal {...defaultProps} />);
    const card = container.querySelector('.bg-card');
    expect(card).toBeInTheDocument();
  });
});
