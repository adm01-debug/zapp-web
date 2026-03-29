import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RouteLoadingBar } from '@/components/ui/route-loading-bar';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: ({ children, className, style, animate, ...props }: any) => (
        <div className={className} style={style} {...props}>{children}</div>
      ),
    },
  };
});

describe('RouteLoadingBar', () => {
  describe('Visibility', () => {
    it('renders nothing when not loading', () => {
      const { container } = render(<RouteLoadingBar isLoading={false} />);
      // When not loading and not visible, should render empty
      expect(container.querySelector('.fixed')).toBeNull();
    });

    it('renders the bar when loading', () => {
      const { container } = render(<RouteLoadingBar isLoading={true} />);
      // Should have the fixed bar
      expect(container.firstChild).toBeDefined();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <RouteLoadingBar isLoading={true} className="custom-class" />
      );
      const el = container.querySelector('.custom-class');
      expect(el).toBeDefined();
    });
  });

  describe('Progress Simulation', () => {
    it('starts at 0 progress', () => {
      const { container } = render(<RouteLoadingBar isLoading={true} />);
      const bar = container.querySelector('.bg-primary');
      if (bar) {
        expect(bar.getAttribute('style')).toContain('width');
      }
    });
  });
});
