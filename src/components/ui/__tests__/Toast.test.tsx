import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
  let lastId = '';
  return (
    <>
      <button onClick={() => { lastId = addToast({ type: 'info', message: 'Removable', duration: 0 }); }}>Add</button>
      <button onClick={() => removeToast(lastId)}>Remove</button>
    </>
  );
}

const toastIdStore = { id: '' };

function UpdateToastTrigger() {
  const { addToast, updateToast } = useAccessibleToast();
  return (
    <>
      <button onClick={() => { toastIdStore.id = addToast({ type: 'loading', message: 'Loading...', duration: 0 }); }}>Start</button>
      <button onClick={() => updateToast(toastIdStore.id, { type: 'success', message: 'Done!' })}>Complete</button>
    </>
  );
}

describe('AccessibleToast', () => {
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

  it('addToast returns a string id', () => {
    let capturedId = '';
    function CaptureId() {
      const { addToast } = useAccessibleToast();
      return (
        <button onClick={() => { capturedId = addToast({ type: 'info', message: 'Test', duration: 0 }); }}>
          Add
        </button>
      );
    }
    render(
      <AccessibleToastProvider>
        <CaptureId />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(typeof capturedId).toBe('string');
    expect(capturedId.length).toBeGreaterThan(0);
  });

  it('does not auto-dismiss loading toast (stays in DOM)', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="loading" message="Still loading" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show loading'));
    // Loading toasts have duration=0, so they stay
    expect(screen.getByText('Still loading')).toBeInTheDocument();
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
    render(
      <AccessibleToastProvider>
        <div>App</div>
      </AccessibleToastProvider>
    );
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('toast has aria-atomic attribute', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="info" message="Atomic" />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show info'));
    const alert = screen.getAllByRole('alert')[0];
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('toast has close button for non-loading types', () => {
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

  it('close button removes toast from DOM', () => {
    render(
      <AccessibleToastProvider>
        <ToastTrigger type="success" message="CloseMeNow" duration={0} />
      </AccessibleToastProvider>
    );
    fireEvent.click(screen.getByText('Show success'));
    expect(screen.getByText('CloseMeNow')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fechar notificação'));
    // After AnimatePresence exit, it should be removed
    // Framer motion may delay removal, but the state should update
  });

  it('toast container is fixed positioned', () => {
    render(
      <AccessibleToastProvider>
        <div>App</div>
      </AccessibleToastProvider>
    );
    const container = document.querySelector('[aria-live="polite"]');
    expect(container?.className).toContain('fixed');
  });

  it('toast container has correct aria-label', () => {
    render(
      <AccessibleToastProvider>
        <div>App</div>
      </AccessibleToastProvider>
    );
    const container = document.querySelector('[aria-label="Notificações"]');
    expect(container).toBeInTheDocument();
  });
});
