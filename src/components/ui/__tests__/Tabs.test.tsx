import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('shows default tab content', () => {
    renderTabs('tab1');
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('hides non-active tab content', () => {
    renderTabs('tab1');
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches content on tab click', () => {
    renderTabs();
    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
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

  it('updates active state when switching tabs', () => {
    renderTabs();
    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Tab 2')).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Tab 1')).toHaveAttribute('data-state', 'inactive');
  });

  it('tabs have correct role', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('tab content has tabpanel role', () => {
    renderTabs();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
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

  it('supports controlled value', () => {
    const onValueChange = vi.fn();
    render(
      <Tabs value="tab2" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tab 1'));
    expect(onValueChange).toHaveBeenCalledWith('tab1');
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

  it('third tab can be selected', () => {
    renderTabs();
    fireEvent.click(screen.getByText('Tab 3'));
    expect(screen.getByText('Content 3')).toBeInTheDocument();
  });
});
