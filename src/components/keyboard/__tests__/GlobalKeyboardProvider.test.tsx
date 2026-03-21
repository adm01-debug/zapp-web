import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GlobalKeyboardProvider, useGlobalKeyboard } from '../GlobalKeyboardProvider';

// Mock dependencies
vi.mock('@/hooks/useGlobalKeyboardShortcuts', () => ({
  useGlobalKeyboardShortcuts: vi.fn().mockReturnValue({ shortcuts: [] }),
}));

vi.mock('../KeyboardShortcutsDialog', () => ({
  KeyboardShortcutsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcuts-dialog">Shortcuts Help</div> : null,
}));

vi.mock('@/components/ui/command-palette', () => ({
  CommandPalette: ({ open, onNavigate }: { open: boolean; onNavigate: (v: string) => void }) =>
    open ? (
      <div data-testid="command-palette">
        <button onClick={() => onNavigate('dashboard')}>Navigate</button>
      </div>
    ) : null,
}));

// Helper to access context
function ContextConsumer() {
  const ctx = useGlobalKeyboard();
  return (
    <div>
      <button onClick={ctx.openCommandPalette}>Open Palette</button>
      <button onClick={ctx.closeCommandPalette}>Close Palette</button>
    </div>
  );
}

describe('GlobalKeyboardProvider', () => {
  it('renders children', () => {
    render(
      <GlobalKeyboardProvider>
        <div>App Content</div>
      </GlobalKeyboardProvider>
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('does not show shortcuts dialog by default', () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    expect(screen.queryByTestId('shortcuts-dialog')).not.toBeInTheDocument();
  });

  it('does not show command palette by default', () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('opens command palette via Ctrl+K', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  it('opens command palette via Meta+K', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  it('toggles command palette on repeated Ctrl+K', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    // Open
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    await waitFor(() => expect(screen.getByTestId('command-palette')).toBeInTheDocument());

    // Close
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    });
    await waitFor(() => expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument());
  });

  it('opens shortcuts help via Shift+?', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: '?',
        shiftKey: true,
        bubbles: true,
      }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('shortcuts-dialog')).toBeInTheDocument();
    });
  });

  it('does not open help via ? when typing in input', () => {
    render(
      <GlobalKeyboardProvider>
        <input data-testid="text-input" />
      </GlobalKeyboardProvider>
    );
    const input = screen.getByTestId('text-input');
    const event = new KeyboardEvent('keydown', {
      key: '?',
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(screen.queryByTestId('shortcuts-dialog')).not.toBeInTheDocument();
  });

  it('opens help via custom event', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    act(() => {
      document.dispatchEvent(new CustomEvent('show-shortcuts-help'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('shortcuts-dialog')).toBeInTheDocument();
    });
  });

  it('opens command palette via custom event', async () => {
    render(
      <GlobalKeyboardProvider>
        <div>App</div>
      </GlobalKeyboardProvider>
    );
    act(() => {
      document.dispatchEvent(new CustomEvent('open-command-palette'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  it('context openCommandPalette opens palette', async () => {
    render(
      <GlobalKeyboardProvider>
        <ContextConsumer />
      </GlobalKeyboardProvider>
    );
    fireEvent.click(screen.getByText('Open Palette'));
    await waitFor(() => {
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  it('context closeCommandPalette closes palette', async () => {
    render(
      <GlobalKeyboardProvider>
        <ContextConsumer />
      </GlobalKeyboardProvider>
    );
    fireEvent.click(screen.getByText('Open Palette'));
    await waitFor(() => expect(screen.getByTestId('command-palette')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Close Palette'));
    await waitFor(() => expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument());
  });

  it('navigation handler is called from command palette', async () => {
    const navHandler = vi.fn();
    function NavRegistrar() {
      const ctx = useGlobalKeyboard();
      React.useEffect(() => {
        ctx.registerNavigationHandler(navHandler);
        return () => ctx.unregisterNavigationHandler();
      }, []);
      return null;
    }

    // Need React import for useEffect
    const React = await import('react');

    render(
      <GlobalKeyboardProvider>
        <ContextConsumer />
        <NavRegistrar />
      </GlobalKeyboardProvider>
    );
    fireEvent.click(screen.getByText('Open Palette'));
    await waitFor(() => expect(screen.getByTestId('command-palette')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Navigate'));
    expect(navHandler).toHaveBeenCalledWith('dashboard');
  });
});

describe('useGlobalKeyboard outside provider', () => {
  it('returns no-op functions when outside provider', () => {
    function TestComponent() {
      const ctx = useGlobalKeyboard();
      return (
        <div>
          <span data-testid="type">{typeof ctx.openCommandPalette}</span>
        </div>
      );
    }
    render(<TestComponent />);
    expect(screen.getByTestId('type')).toHaveTextContent('function');
  });
});
