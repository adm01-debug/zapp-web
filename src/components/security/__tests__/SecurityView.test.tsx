/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockHasRole = vi.fn();

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    hasRole: mockHasRole,
  }),
}));

vi.mock('@/hooks/useSecurityPushNotifications', () => ({
  useSecurityPushNotifications: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock all sub-panels
vi.mock('../SecuritySettingsPanel', () => ({
  SecuritySettingsPanel: () => <div data-testid="security-settings">SecuritySettings</div>,
}));
vi.mock('../SecurityOverview', () => ({
  SecurityOverview: () => <div data-testid="security-overview">SecurityOverview</div>,
}));
vi.mock('../DevicesPanel', () => ({
  DevicesPanel: () => <div data-testid="devices-panel">DevicesPanel</div>,
}));
vi.mock('../PasskeysPanel', () => ({
  PasskeysPanel: () => <div data-testid="passkeys-panel">PasskeysPanel</div>,
}));
vi.mock('../SecurityNotificationsPanel', () => ({
  SecurityNotificationsPanel: () => <div data-testid="notifications-panel">NotificationsPanel</div>,
}));
vi.mock('../BlockedIPsPanel', () => ({
  BlockedIPsPanel: () => <div data-testid="blocked-ips">BlockedIPs</div>,
}));
vi.mock('../IPWhitelistPanel', () => ({
  IPWhitelistPanel: () => <div data-testid="ip-whitelist">IPWhitelist</div>,
}));
vi.mock('../GeoBlockingPanel', () => ({
  GeoBlockingPanel: () => <div data-testid="geo-blocking">GeoBlocking</div>,
}));
vi.mock('../PasswordResetRequestsPanel', () => ({
  PasswordResetRequestsPanel: () => <div data-testid="password-resets">PasswordResets</div>,
}));
vi.mock('../RateLimitRealtimeAlerts', () => ({
  RateLimitRealtimeAlerts: () => <div data-testid="rate-limit-alerts">RateLimitAlerts</div>,
}));

import { SecurityView } from '../SecurityView';

describe('SecurityView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
  });

  it('renders the main title', () => {
    render(<SecurityView />);
    expect(screen.getByText('Central de Segurança')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<SecurityView />);
    expect(screen.getByText(/Gerencie todas as configurações de segurança/)).toBeInTheDocument();
  });

  it('renders overview tab by default', () => {
    render(<SecurityView />);
    expect(screen.getByTestId('security-overview')).toBeInTheDocument();
  });

  it('renders standard tabs for non-admin', () => {
    render(<SecurityView />);
    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(screen.getByText('Passkeys')).toBeInTheDocument();
    expect(screen.getByText('Dispositivos')).toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
  });

  it('does not render admin tabs for non-admin user', () => {
    render(<SecurityView />);
    expect(screen.queryByText('IPs')).not.toBeInTheDocument();
    expect(screen.queryByText('Geo')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('renders admin tabs for admin user', () => {
    mockHasRole.mockImplementation((r: string) => r === 'admin');
    render(<SecurityView />);
    expect(screen.getByText('IPs')).toBeInTheDocument();
    expect(screen.getByText('Geo')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders RateLimitRealtimeAlerts for admin', () => {
    mockHasRole.mockImplementation((r: string) => r === 'admin');
    render(<SecurityView />);
    expect(screen.getByTestId('rate-limit-alerts')).toBeInTheDocument();
  });

  it('does not render RateLimitRealtimeAlerts for non-admin', () => {
    render(<SecurityView />);
    expect(screen.queryByTestId('rate-limit-alerts')).not.toBeInTheDocument();
  });

  it('switches to account tab', async () => {
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Conta'));
    expect(screen.getByTestId('security-settings')).toBeInTheDocument();
  });

  it('switches to passkeys tab', async () => {
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Passkeys'));
    expect(screen.getByTestId('passkeys-panel')).toBeInTheDocument();
  });

  it('switches to devices tab', async () => {
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Dispositivos'));
    expect(screen.getByTestId('devices-panel')).toBeInTheDocument();
  });

  it('switches to notifications tab', async () => {
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Alertas'));
    expect(screen.getByTestId('notifications-panel')).toBeInTheDocument();
  });

  it('renders overview content by default', () => {
    render(<SecurityView />);
    expect(screen.getByTestId('security-overview')).toBeInTheDocument();
  });

  it('admin can switch to IPs tab', async () => {
    mockHasRole.mockImplementation((r: string) => r === 'admin');
    render(<SecurityView />);
    await userEvent.click(screen.getByText('IPs'));
    expect(screen.getByTestId('blocked-ips')).toBeInTheDocument();
    expect(screen.getByTestId('ip-whitelist')).toBeInTheDocument();
  });

  it('admin can switch to Geo tab', async () => {
    mockHasRole.mockImplementation((r: string) => r === 'admin');
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Geo'));
    expect(screen.getByTestId('geo-blocking')).toBeInTheDocument();
  });

  it('admin can switch to Admin tab', async () => {
    mockHasRole.mockImplementation((r: string) => r === 'admin');
    render(<SecurityView />);
    await userEvent.click(screen.getByText('Admin'));
    expect(screen.getByTestId('password-resets')).toBeInTheDocument();
  });

  it('renders shield icon', () => {
    const { container } = render(<SecurityView />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});
