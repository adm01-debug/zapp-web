import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AccessibleToastProvider, useAccessibleToast } from '../accessible-toast';

// Helper component to trigger toasts
function ToastTrigger({ type, message, description, duration }: {
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message: string;
  description?: string;
  duration?: number;
}) {
  const { addToast } = useAccessibleToast();
  return (
    <button onClick={() => addToast({ type, message, description, duration })}>
      Show {type}
    </button>
  );
}

function RemoveToastTrigger() {
  const { addToast, removeToast } = useAccessibleToast();
  return (
    <>
      <button onClick={() => {
        const id = addToast({ type: 'info', message: 'Removable', duration: 0 });
        (window as any).__toastId = id;
      }}>Add</button>
      <button onClick={() => removeToast((window as any).__toastId)}>Remove</button>
    </>
  );
}

function UpdateToastTrigger() {
  const { addToast, updateToast } = useAccessibleToast();
  return (
    <>
      <button onClick={() => {
        const id = addToast({ type: 'loading', message: 'Loading...', duration: 0 });
        (window as any).__toastId = id;
      }}>Start</button>
      <button onClick={() => updateToast((window as any).__toastId, { type: 'success', message: 'Done!' })}>Complete</button>
    </>
  );
}

describe('AccessibleToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders provider without crashing', () => {
    render(
      <AccessibleToastProvider>
        <div>App</div>
      </AccessibleToastProvider>
    );
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('shows a success toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="success" message="Success!" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('shows an error toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="error" message="Error occurred" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show error'));
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('shows a warning toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="warning" message="Warning!" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show warning'));
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('shows an info toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="info" message="Info message" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show info'));
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('shows a loading toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="loading" message="Loading..." />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show loading'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows toast description when provided', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="info" message="Title" description="Description text" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show info'));
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('auto-dismisses toast after duration', async () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="success" message="Auto dismiss" duration={3000} />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show success'));
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
    });
  });

  it('does not auto-dismiss loading toast', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="loading" message="Still loading" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show loading'));

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Still loading')).toBeInTheDocument();
  });

  it('removes toast manually', async () => {
    render(
      <AccessibleToastProvider>
        <RemoveToastTrigger />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Removable')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(screen.queryByText('Removable')).not.toBeInTheDocument();
    });
  });

  it('updates an existing toast', () => {
    render(
      <AccessibleToastProvider>
        <UpdateToastTrigger />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Complete'));
    expect(screen.getByText('Done!')).toBeInTheDocument();
  });

  it('toast has role="alert" for accessibility', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="error" message="Alert toast" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show error'));
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('toast container has aria-live attribute', () => {
    const { container } = render(
      <AccessibleToastProvider>
        <div>App</div>
      </AccessibleToastProvider>
    );
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('toast has close button (non-loading type)', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="success" message="Closeable" duration={0} />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show success'));
    const closeBtn = screen.getByLabelText('Fechar notificação');
    expect(closeBtn).toBeInTheDocument();
  });

  it('loading toast does not have close button', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="loading" message="Loading" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show loading'));
    expect(screen.queryByLabelText('Fechar notificação')).not.toBeInTheDocument();
  });

  it('can show multiple toasts', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="info" message="Toast 1" duration={0} />
        <ToastTrigger type="error" message="Toast 2" duration={0} />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show info'));
    fireEvent.click(screen.getByText('Show error'));
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('throws when useAccessibleToast is used outside provider', () => {
    const TestComponent = () => {
      expect(() => {
        // This will throw during render
        useAccessibleToast();
      }).toThrow('useAccessibleToast must be used within AccessibleToastProvider');
      return null;
    };
    // We need to catch the error during render
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow();
    spy.mockRestore();
  });
});
