// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepProgress, Step } from '@/components/ui/step-progress';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, className, ...props }: any) => (
        <div className={className} data-testid="motion-div">{children}</div>
      ),
    },
  };
});

const steps: Step[] = [
  { label: 'Início' },
  { label: 'Nós' },
  { label: 'Conexões' },
  { label: 'Salvar' },
];

describe('StepProgress', () => {
  describe('Rendering', () => {
    it('renders all step labels', () => {
      render(<StepProgress steps={steps} currentStep={0} />);
      expect(screen.getByText('Início')).toBeInTheDocument();
      expect(screen.getByText('Nós')).toBeInTheDocument();
      expect(screen.getByText('Conexões')).toBeInTheDocument();
      expect(screen.getByText('Salvar')).toBeInTheDocument();
    });

    it('renders step numbers', () => {
      render(<StepProgress steps={steps} currentStep={2} />);
      // Steps 0,1 are completed (show check), step 2 is current (shows "3"), step 3 shows "4"
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('renders aria navigation label', () => {
      render(<StepProgress steps={steps} currentStep={0} />);
      expect(screen.getByLabelText('Progresso')).toBeInTheDocument();
    });
  });

  describe('Step States', () => {
    it('marks steps before currentStep as completed', () => {
      const { container } = render(<StepProgress steps={steps} currentStep={2} />);
      // Steps 0 and 1 should show check icons
      const checkIcons = container.querySelectorAll('.lucide-check, svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('shows current step with emphasis', () => {
      render(<StepProgress steps={steps} currentStep={1} />);
      const label = screen.getByText('Nós');
      expect(label.className).toContain('text-foreground');
    });

    it('shows future steps as muted', () => {
      render(<StepProgress steps={steps} currentStep={0} />);
      const label = screen.getByText('Salvar');
      expect(label.className).toContain('text-muted-foreground');
    });
  });

  describe('Edge Cases', () => {
    it('handles currentStep=0 (first step)', () => {
      render(<StepProgress steps={steps} currentStep={0} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles currentStep at last step', () => {
      render(<StepProgress steps={steps} currentStep={3} />);
      // All previous steps should be completed
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('handles single step', () => {
      render(<StepProgress steps={[{ label: 'Only' }]} currentStep={0} />);
      expect(screen.getByText('Only')).toBeInTheDocument();
    });

    it('handles empty steps array', () => {
      const { container } = render(<StepProgress steps={[]} currentStep={0} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <StepProgress steps={steps} currentStep={0} className="custom-test" />
      );
      expect(container.querySelector('.custom-test')).toBeInTheDocument();
    });
  });

  describe('Connector Lines', () => {
    it('renders connector lines between steps', () => {
      const { container } = render(<StepProgress steps={steps} currentStep={0} />);
      // Should have 3 connector lines (between 4 steps)
      const connectors = container.querySelectorAll('.bg-muted-foreground\\/10');
      expect(connectors.length).toBe(3);
    });
  });
});
