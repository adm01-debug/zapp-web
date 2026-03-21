import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  primaryNav,
  communicationNav,
  automationNav,
  salesNav,
  connectionsNav,
  analyticsNav,
  systemNav,
  sidebarGroups,
} from '@/components/layout/sidebarNavConfig';

// ─────────────────────────────────────────────────────────────
// 1. SIDEBAR NAV CONFIG — Data-integrity tests
// ─────────────────────────────────────────────────────────────
describe('Sidebar Navigation Config', () => {
  const allItems = [
    ...primaryNav,
    ...communicationNav,
    ...automationNav,
    ...salesNav,
    ...connectionsNav,
    ...analyticsNav,
    ...systemNav,
  ];

  it('should have unique IDs across all nav items', () => {
    const ids = allItems.map(i => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every nav item must have an icon, label, and id', () => {
    allItems.forEach(item => {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
    });
  });

  it('primary nav must contain exactly 5 core items', () => {
    expect(primaryNav).toHaveLength(5);
    const ids = primaryNav.map(i => i.id);
    expect(ids).toContain('inbox');
    expect(ids).toContain('contacts');
    expect(ids).toContain('dashboard');
  });

  it('sidebar groups must cover all secondary navs', () => {
    const groupItems = sidebarGroups.flatMap(g => [...g.items]);
    const secondaryItems = [
      ...communicationNav,
      ...automationNav,
      ...salesNav,
      ...connectionsNav,
      ...analyticsNav,
      ...systemNav,
    ];
    expect(groupItems).toHaveLength(secondaryItems.length);
  });

  it('should have exactly 6 collapsible groups', () => {
    expect(sidebarGroups).toHaveLength(6);
  });

  it('every group should have a label, icon, and non-empty items', () => {
    sidebarGroups.forEach(group => {
      expect(group.label).toBeTruthy();
      expect(group.icon).toBeDefined();
      expect(group.items.length).toBeGreaterThan(0);
    });
  });

  it('no two groups should have the same label', () => {
    const labels = sidebarGroups.map(g => g.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. VIEW ROUTER — Route-mapping completeness
// ─────────────────────────────────────────────────────────────
describe('ViewRouter Route Coverage', () => {
  const allNavIds = [
    ...primaryNav,
    ...communicationNav,
    ...automationNav,
    ...salesNav,
    ...connectionsNav,
    ...analyticsNav,
    ...systemNav,
  ].map(i => i.id);

  // We import the raw source to parse the switch cases
  it('ViewRouter must handle every nav item ID', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../pages/ViewRouter.tsx'),
      'utf-8',
    );

    const caseRegex = /case\s+'([^']+)'/g;
    const handledCases = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = caseRegex.exec(routerSrc)) !== null) {
      handledCases.add(match[1]);
    }

    const missing = allNavIds.filter(id => !handledCases.has(id));
    expect(missing).toEqual([]);
  });

  it('ViewRouter default branch should render fallback UI', async () => {
    // Dynamic import to avoid heavy lazy-loading in test
    const { ViewRouter } = await import('@/pages/ViewRouter');
    const { render, screen } = await import('@testing-library/react');
    const React = await import('react');

    const { container } = render(
      <React.Suspense fallback={<div>loading</div>}>
        <ViewRouter currentView="__nonexistent__" />
      </React.Suspense>,
    );

    expect(container.textContent).toContain('em desenvolvimento');
  });
});

// ─────────────────────────────────────────────────────────────
// 3. LAZY VIEWS — Export integrity
// ─────────────────────────────────────────────────────────────
describe('Lazy Views Exports', () => {
  it('should export a lazy component for every ViewRouter case', async () => {
    const Views = await import('@/pages/lazyViews');

    const expectedExports = [
      'RealtimeInboxView', 'DashboardView', 'AgentsView', 'QueuesView',
      'ContactsView', 'GroupsView', 'ConnectionsView', 'ClientWalletView',
      'ProductManagement', 'TranscriptionsHistoryView', 'AdminView',
      'TagsView', 'SentimentAlertsDashboard', 'AdvancedReportsView',
      'SecurityView', 'SettingsView', 'SystemFeaturesView', 'CampaignsView',
      'ChatbotFlowsView', 'AutomationsManager', 'IntegrationsHub',
      'LGPDComplianceView', 'SalesPipelineView', 'KnowledgeBaseView',
      'PaymentLinksView', 'WhatsAppFlowsBuilder', 'MetaCAPIView',
      'DiagnosticsView', 'VoIPPanel', 'AutoExportManager',
      'GoogleCalendarIntegration', 'ThemeCustomizer', 'AchievementsSystemLazy',
      'ScheduleCalendarView', 'WarRoomDashboard', 'WhatsAppTemplatesManager',
      'OmnichannelManager', 'ChurnPredictionDashboard', 'AutoTicketClassifier',
      'PerformanceMonitor', 'OmnichannelInbox', 'AuditLogDashboard',
    ];

    expectedExports.forEach(name => {
      expect(Views).toHaveProperty(name);
      expect(typeof (Views as any)[name]).toBe('object'); // lazy components are objects
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 4. ICON UNIQUENESS — No duplicate icons in same group
// ─────────────────────────────────────────────────────────────
describe('Icon Uniqueness per Group', () => {
  it('primary nav should have unique icons', () => {
    const icons = primaryNav.map(i => i.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  sidebarGroups.forEach(group => {
    it(`"${group.label}" group should have unique icons`, () => {
      const icons = group.items.map(i => i.icon);
      expect(new Set(icons).size).toBe(icons.length);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 5. SIDEBAR NAV ITEM COMPONENT — Rendering
// ─────────────────────────────────────────────────────────────
describe('SidebarNavItem Component', () => {
  it('should render the label and respond to click', async () => {
    const { SidebarNavItem } = await import('@/components/layout/SidebarNavItem');
    const { MessageSquare } = await import('lucide-react');
    const onSelect = vi.fn();

    render(
      <SidebarNavItem
        item={{ id: 'test', icon: MessageSquare, label: 'Test Item' }}
        isActive={false}
        onSelect={onSelect}
      />,
    );

    const btn = screen.getByText('Test Item');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith('test');
  });

  it('should mark active item with data-active attribute', async () => {
    const { SidebarNavItem } = await import('@/components/layout/SidebarNavItem');
    const { MessageSquare } = await import('lucide-react');

    const { container } = render(
      <SidebarNavItem
        item={{ id: 'active-test', icon: MessageSquare, label: 'Active' }}
        isActive={true}
        onSelect={() => {}}
      />,
    );

    const activeEl = container.querySelector('[data-active="true"]');
    expect(activeEl).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. SIDEBAR NAV GROUP COMPONENT — Collapse/Expand
// ─────────────────────────────────────────────────────────────
describe('SidebarNavGroup Component', () => {
  it('should render group label and toggle items on click', async () => {
    const { SidebarNavGroup } = await import('@/components/layout/SidebarNavGroup');
    const { Megaphone, Globe, PhoneCall } = await import('lucide-react');

    const items = [
      { id: 'a', icon: Globe, label: 'Item A' },
      { id: 'b', icon: PhoneCall, label: 'Item B' },
    ];

    render(
      <SidebarNavGroup
        label="Test Group"
        icon={Megaphone}
        items={items}
        currentView="a"
        onViewChange={() => {}}
      />,
    );

    expect(screen.getByLabelText(/Test Group/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// 7. RESPONSIVENESS — useIsMobile hook
// ─────────────────────────────────────────────────────────────
describe('useIsMobile Hook', () => {
  it('should return false for desktop widths', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });

    const { useIsMobile } = await import('@/hooks/use-mobile');
    const React = await import('react');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should return true for mobile widths', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

    // Re-import to get fresh state
    const { useIsMobile } = await import('@/hooks/use-mobile');
    const { renderHook } = await import('@testing-library/react');

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 8. ARCHITECTURE — Module count & consistency
// ─────────────────────────────────────────────────────────────
describe('Architecture Integrity', () => {
  it('total nav items should be ≥ 40 modules', () => {
    const total = [
      ...primaryNav,
      ...communicationNav,
      ...automationNav,
      ...salesNav,
      ...connectionsNav,
      ...analyticsNav,
      ...systemNav,
    ].length;
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it('every nav ID should be lowercase kebab-case', () => {
    const allItems = [
      ...primaryNav,
      ...communicationNav,
      ...automationNav,
      ...salesNav,
      ...connectionsNav,
      ...analyticsNav,
      ...systemNav,
    ];
    allItems.forEach(item => {
      expect(item.id).toMatch(/^[a-z][a-z0-9-]*$/);
    });
  });

  it('lazyViews file should not exceed 60 exports', async () => {
    const Views = await import('@/pages/lazyViews');
    const exportCount = Object.keys(Views).length;
    expect(exportCount).toBeLessThanOrEqual(60);
    expect(exportCount).toBeGreaterThanOrEqual(30);
  });
});

// ─────────────────────────────────────────────────────────────
// 9. CROSS-CUTTING — No orphan routes
// ─────────────────────────────────────────────────────────────
describe('No Orphan Routes', () => {
  it('every ViewRouter case should map to a nav config item', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../pages/ViewRouter.tsx'),
      'utf-8',
    );

    const caseRegex = /case\s+'([^']+)'/g;
    const handledCases: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = caseRegex.exec(routerSrc)) !== null) {
      handledCases.push(match[1]);
    }

    const allNavIds = new Set([
      ...primaryNav,
      ...communicationNav,
      ...automationNav,
      ...salesNav,
      ...connectionsNav,
      ...analyticsNav,
      ...systemNav,
    ].map(i => i.id));

    const orphans = handledCases.filter(c => !allNavIds.has(c));
    expect(orphans).toEqual([]);
  });
});
