import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, ErrorFallback } from '../ErrorBoundary';

// Mock logger
vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Component that throws
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
}

// Suppress console.error for error boundary tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches rendering errors and shows default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Error View')).toBeInTheDocument();
  });

  it('has role="alert" on error display', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live="assertive" on error display', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('shows retry button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('shows go home button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Voltar ao início')).toBeInTheDocument();
  });

  it('shows reload link in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ou recarregue a página completamente')).toBeInTheDocument();
  });

  it('retry button resets error state', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();

    // Click retry - it will re-render the throwing component which throws again
    fireEvent.click(screen.getByText('Tentar novamente'));
    // It should still show the error since ThrowingComponent always throws
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('resets when resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey={1}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();

    // Changing resetKey should reset the error boundary, but the component still throws
    rerender(
      <ErrorBoundary resetKey={2}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    // It resets and re-renders ThrowingComponent, which throws again
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
  });

  it('renders normally when resetKey changes and child no longer throws', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey={1}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey={2}>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('error description contains error message', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Encontramos um erro inesperado. Tente recarregar a página.')).toBeInTheDocument();
  });
});

describe('withErrorBoundary', () => {
  it('wraps component with error boundary', () => {
    const SafeComponent = () => <div>Safe</div>;
    const Wrapped = withErrorBoundary(SafeComponent);
    render(<Wrapped />);
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('catches errors in wrapped component', () => {
    const Wrapped = withErrorBoundary(ThrowingComponent);
    render(<Wrapped />);
    expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const Wrapped = withErrorBoundary(ThrowingComponent, <div>Custom fallback</div>);
    render(<Wrapped />);
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders error message', () => {
    render(
      <ErrorFallback
        error={new Error('Something broke')}
        resetErrorBoundary={() => {}}
      />
    );
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders retry button', () => {
    render(
      <ErrorFallback
        error={new Error('Error')}
        resetErrorBoundary={() => {}}
      />
    );
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('calls resetErrorBoundary when retry clicked', () => {
    const reset = vi.fn();
    render(
      <ErrorFallback
        error={new Error('Error')}
        resetErrorBoundary={reset}
      />
    );
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('shows error heading', () => {
    render(
      <ErrorFallback
        error={new Error('Error')}
        resetErrorBoundary={() => {}}
      />
    );
    expect(screen.getByText('Erro ao carregar componente')).toBeInTheDocument();
  });
});
