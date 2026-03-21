import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TourProvider, useTour, DEFAULT_ONBOARDING_STEPS, type TourStep } from '../OnboardingTour';

// Mock createPortal since tests don't have full DOM structure
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

const testSteps: TourStep[] = [
  { id: 'step1', target: '#step1', title: 'Step 1', description: 'Description 1' },
  { id: 'step2', target: '#step2', title: 'Step 2', description: 'Description 2' },
  { id: 'step3', target: '#step3', title: 'Step 3', description: 'Description 3' },
];

function TourConsumer() {
  const tour = useTour();
  return (
    <div>
      <button onClick={() => tour.startTour(testSteps)}>Start Tour</button>
      <button onClick={tour.nextStep}>Next</button>
      <button onClick={tour.prevStep}>Prev</button>
      <button onClick={tour.endTour}>End</button>
      <button onClick={() => tour.goToStep(2)}>Go To 3</button>
      <span data-testid="active">{tour.isActive.toString()}</span>
      <span data-testid="step">{tour.currentStep}</span>
      <span data-testid="count">{tour.steps.length}</span>
    </div>
  );
}

describe('TourProvider', () => {
  beforeEach(() => {
    // Create target elements for the tour
    const el = document.createElement('div');
    el.id = 'step1';
    document.body.appendChild(el);
  });

  it('renders children', () => {
    render(
      <TourProvider>
        <div>App Content</div>
      </TourProvider>
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('starts inactive', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('starts tour when startTour is called', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    expect(screen.getByTestId('active')).toHaveTextContent('true');
  });

  it('sets steps when tour starts', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('starts at step 0', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('advances to next step', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  it('goes to previous step', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('does not go below step 0', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('ends tour when reaching last step and clicking next', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Next')); // step 1
    fireEvent.click(screen.getByText('Next')); // step 2
    fireEvent.click(screen.getByText('Next')); // ends tour
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('ends tour when endTour is called', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('End'));
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('goToStep jumps to specific step', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Go To 3'));
    expect(screen.getByTestId('step')).toHaveTextContent('2');
  });

  it('calls onComplete when tour ends', () => {
    const onComplete = vi.fn();
    render(
      <TourProvider onComplete={onComplete}>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('End'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to end tour', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    expect(screen.getByTestId('active')).toHaveTextContent('true');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('handles ArrowRight key for next step', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  it('handles ArrowLeft key for prev step', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('Next'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(screen.getByTestId('step')).toHaveTextContent('0');
  });

  it('resets state when tour ends', () => {
    render(
      <TourProvider>
        <TourConsumer />
      </TourProvider>
    );
    fireEvent.click(screen.getByText('Start Tour'));
    fireEvent.click(screen.getByText('End'));
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});

describe('useTour outside provider', () => {
  it('throws when used outside TourProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useTour();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useTour must be used within a TourProvider');
    spy.mockRestore();
  });
});

describe('DEFAULT_ONBOARDING_STEPS', () => {
  it('has the expected number of steps', () => {
    expect(DEFAULT_ONBOARDING_STEPS.length).toBe(6);
  });

  it('each step has required properties', () => {
    DEFAULT_ONBOARDING_STEPS.forEach(step => {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
    });
  });

  it('first step targets inbox', () => {
    expect(DEFAULT_ONBOARDING_STEPS[0].id).toBe('inbox');
  });
});
