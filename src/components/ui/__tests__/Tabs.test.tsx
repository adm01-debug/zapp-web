import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs', () => {
  const renderTabs = (defaultValue = 'tab1') => (
    render(
      <Tabs defaultValue={defaultValue}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    )
  );

  it('renders all tab triggers', () => {
    renderTabs();
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('shows default tab content as active', () => {
    renderTabs('tab1');
    // Radix renders all panels, active one has data-state=active
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    const activePanel = panels.find(p => p.getAttribute('data-state') === 'active');
    expect(activePanel).toBeTruthy();
    expect(activePanel!.textContent).toBe('Content 1');
  });

  it('hides non-active tab content with hidden attribute', () => {
    renderTabs('tab1');
    // Radix renders all panels but hides inactive ones
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    const hiddenPanels = panels.filter(p => p.hasAttribute('hidden'));
    expect(hiddenPanels.length).toBe(2);
  });

  it('tab triggers are clickable buttons', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab.tagName).toBe('BUTTON');
    });
  });

  it('marks active tab with data-state=active', () => {
    renderTabs('tab1');
    const tab1 = screen.getByText('Tab 1');
    expect(tab1).toHaveAttribute('data-state', 'active');
  });

  it('marks inactive tabs with data-state=inactive', () => {
    renderTabs('tab1');
    const tab2 = screen.getByText('Tab 2');
    expect(tab2).toHaveAttribute('data-state', 'inactive');
  });

  it('each tab trigger has aria-controls pointing to panel', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-controls');
    });
  });

  it('tabs have correct role', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('renders tabpanel elements', () => {
    renderTabs();
    // All panels are rendered (some hidden)
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels.length).toBe(3);
  });

  it('can render custom content inside tabs', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">
          <div data-testid="custom">Custom Content</div>
        </TabsContent>
      </Tabs>
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('applies custom className to TabsList', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="custom-list">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tablist').className).toContain('custom-list');
  });

  it('applies custom className to TabsTrigger', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a" className="custom-trigger">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tab').className).toContain('custom-trigger');
  });

  it('controlled value sets active tab', () => {
    render(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    // Tab 2 should be active, Tab 1 inactive
    expect(screen.getByText('Tab 2')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tab 1')).toHaveAttribute('aria-selected', 'false');
  });

  it('disabled trigger cannot be clicked', () => {
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('third tab starts inactive by default', () => {
    renderTabs();
    expect(screen.getByText('Tab 3')).toHaveAttribute('data-state', 'inactive');
  });

  it('aria-selected is true for active tab', () => {
    renderTabs('tab1');
    expect(screen.getByText('Tab 1')).toHaveAttribute('aria-selected', 'true');
  });

  it('aria-selected is false for inactive tab', () => {
    renderTabs('tab1');
    expect(screen.getByText('Tab 2')).toHaveAttribute('aria-selected', 'false');
  });
});
