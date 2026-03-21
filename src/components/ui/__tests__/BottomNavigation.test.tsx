import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation } from '../mobile-components';

const mockItems = [
  { id: 'home', icon: <span data-testid="icon-home">H</span>, label: 'Home' },
  { id: 'chat', icon: <span data-testid="icon-chat">C</span>, label: 'Chat', badge: 5 },
  { id: 'settings', icon: <span data-testid="icon-settings">S</span>, label: 'Settings' },
];

describe('BottomNavigation', () => {
  it('renders all navigation items', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Chat')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('renders item labels', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders item icons', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chat')).toBeInTheDocument();
  });

  it('marks active item with aria-current=page', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    const homeBtn = screen.getByLabelText('Home');
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('inactive items do not have aria-current', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    const chatBtn = screen.getByLabelText('Chat');
    expect(chatBtn).not.toHaveAttribute('aria-current');
  });

  it('calls onChange with item id when clicked', () => {
    const handleChange = vi.fn();
    render(<BottomNavigation items={mockItems} activeId="home" onChange={handleChange} />);
    fireEvent.click(screen.getByLabelText('Chat'));
    expect(handleChange).toHaveBeenCalledWith('chat');
  });

  it('displays badge count', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays 99+ for badge counts over 99', () => {
    const items = [
      { id: 'chat', icon: <span>C</span>, label: 'Chat', badge: 150 },
    ];
    render(<BottomNavigation items={items} activeId="" onChange={() => {}} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not show badge when badge is 0', () => {
    const items = [
      { id: 'chat', icon: <span>C</span>, label: 'Chat', badge: 0 },
    ];
    render(<BottomNavigation items={items} activeId="" onChange={() => {}} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not show badge when badge is undefined', () => {
    const items = [
      { id: 'chat', icon: <span>C</span>, label: 'Chat' },
    ];
    const { container } = render(<BottomNavigation items={items} activeId="" onChange={() => {}} />);
    // No badge element should be rendered
    const badges = container.querySelectorAll('.bg-destructive');
    expect(badges).toHaveLength(0);
  });

  it('has navigation role', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has aria-label for navigation', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    expect(screen.getByLabelText('Navegação principal')).toBeInTheDocument();
  });

  it('applies active text color to active item', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    const homeBtn = screen.getByLabelText('Home');
    expect(homeBtn.className).toContain('text-primary');
  });

  it('applies muted text color to inactive item', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    const chatBtn = screen.getByLabelText('Chat');
    expect(chatBtn.className).toContain('text-muted-foreground');
  });

  it('applies custom className', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} className="custom-nav" />);
    expect(screen.getByRole('navigation').className).toContain('custom-nav');
  });

  it('each item has aria-label', () => {
    render(<BottomNavigation items={mockItems} activeId="home" onChange={() => {}} />);
    mockItems.forEach(item => {
      expect(screen.getByLabelText(item.label)).toBeInTheDocument();
    });
  });
});
