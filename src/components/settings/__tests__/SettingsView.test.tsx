import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsView } from '../SettingsView';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateSettings = vi.fn();
const mockSaveSettings = vi.fn();
const mockToggleWorkDay = vi.fn();
const mockResetOnboarding = vi.fn();

let mockIsLoading = false;
let mockIsSaving = false;
let mockSettings = {
  business_hours_enabled: true,
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  work_days: [1, 2, 3, 4, 5],
  welcome_message: 'Olá!',
  away_message: 'Estamos fora',
  closing_message: 'Obrigado',
  auto_assignment_enabled: true,
  auto_assignment_method: 'roundrobin',
  inactivity_timeout: 30,
  auto_transcription_enabled: false,
  sound_enabled: true,
  browser_notifications_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  theme: 'dark',
  language: 'pt-BR',
  compact_mode: false,
  tts_voice_id: 'abc',
  tts_speed: 1,
};

vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: mockSettings,
    isLoading: mockIsLoading,
    isSaving: mockIsSaving,
    updateSettings: mockUpdateSettings,
    saveSettings: mockSaveSettings,
    toggleWorkDay: mockToggleWorkDay,
  }),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    hasCompletedOnboarding: true,
    loading: false,
    completeOnboarding: vi.fn(),
    resetOnboarding: mockResetOnboarding,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/dashboard/FloatingParticles', () => ({
  FloatingParticles: () => <div data-testid="floating-particles" />,
}));
vi.mock('@/components/effects/AuroraBorealis', () => ({
  AuroraBorealis: () => <div data-testid="aurora" />,
}));
vi.mock('@/components/settings/AvatarUpload', () => ({
  AvatarUpload: () => <div data-testid="avatar-upload" />,
}));
vi.mock('@/components/settings/SoundCustomizationPanel', () => ({
  SoundCustomizationPanel: () => <div data-testid="sound-panel">Sound Panel</div>,
}));
vi.mock('@/components/settings/AutoCloseSettings', () => ({
  AutoCloseSettings: () => <div data-testid="auto-close">AutoClose</div>,
}));
vi.mock('@/components/notifications/NotificationSettingsPanel', () => ({
  NotificationSettingsPanel: () => <div data-testid="notification-panel">Notifications</div>,
}));
vi.mock('@/components/settings/KeyboardShortcutsSettings', () => ({
  KeyboardShortcutsSettings: () => <div data-testid="shortcuts-settings">Shortcuts</div>,
}));
vi.mock('@/components/settings/GlobalSettingsSection', () => ({
  GlobalSettingsSection: () => <div data-testid="global-settings">Global</div>,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsSaving = false;
    mockSettings = {
      business_hours_enabled: true,
      business_hours_start: '09:00',
      business_hours_end: '18:00',
      work_days: [1, 2, 3, 4, 5],
      welcome_message: 'Olá!',
      away_message: 'Estamos fora',
      closing_message: 'Obrigado',
      auto_assignment_enabled: true,
      auto_assignment_method: 'roundrobin',
      inactivity_timeout: 30,
      auto_transcription_enabled: false,
      sound_enabled: true,
      browser_notifications_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      theme: 'dark',
      language: 'pt-BR',
      compact_mode: false,
      tts_voice_id: 'abc',
      tts_speed: 1,
    };
  });

  it('renders the settings page heading and subtitle', () => {
    render(<SettingsView />);
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Configure o comportamento da plataforma')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockIsLoading = true;
    const { container } = render(<SettingsView />);
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
    // Skeletons rendered
    expect(container.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders all eight tab triggers', () => {
    render(<SettingsView />);
    expect(screen.getByText('Horário')).toBeInTheDocument();
    expect(screen.getByText('Mensagens')).toBeInTheDocument();
    expect(screen.getByText('Automação')).toBeInTheDocument();
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(screen.getByText('Aparência')).toBeInTheDocument();
    expect(screen.getByText('Atalhos')).toBeInTheDocument();
    expect(screen.getByText('Sons')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('renders save button with correct label', () => {
    render(<SettingsView />);
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
  });

  it('calls saveSettings when save button is clicked', () => {
    render(<SettingsView />);
    fireEvent.click(screen.getByText('Salvar Alterações'));
    expect(mockSaveSettings).toHaveBeenCalledTimes(1);
  });

  it('disables save button while saving', () => {
    mockIsSaving = true;
    render(<SettingsView />);
    const saveBtn = screen.getByText('Salvar Alterações').closest('button');
    expect(saveBtn).toBeDisabled();
  });

  it('shows the schedule tab content by default with business hours', () => {
    render(<SettingsView />);
    expect(screen.getByText('Horário de Atendimento')).toBeInTheDocument();
    expect(screen.getByText('Habilitar horário de atendimento')).toBeInTheDocument();
  });

  it('shows business hours start/end inputs when enabled', () => {
    render(<SettingsView />);
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
  });

  it('renders weekday buttons and calls toggleWorkDay on click', () => {
    render(<SettingsView />);
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Sáb')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Dom'));
    expect(mockToggleWorkDay).toHaveBeenCalledWith(0);
  });

  it('hides business hours fields when business_hours_enabled is false', () => {
    mockSettings = { ...mockSettings, business_hours_enabled: false };
    render(<SettingsView />);
    expect(screen.queryByText('Dias de atendimento')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
  });

  it('switches to Messages tab and shows message textareas', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Mensagens/ }));
    await waitFor(() => {
      expect(screen.getByText('Mensagem de Boas-Vindas')).toBeInTheDocument();
    });
    expect(screen.getByText('Mensagem de Ausência')).toBeInTheDocument();
    expect(screen.getByText('Mensagem de Encerramento')).toBeInTheDocument();
  });

  it('switches to Appearance tab and shows theme, language, compact mode', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Aparência/ }));
    await waitFor(() => {
      expect(screen.getByText('Modo compacto')).toBeInTheDocument();
    });
    expect(screen.getByText('Foto do Perfil')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByText('Idioma')).toBeInTheDocument();
  });

  it('switches to Notifications tab and renders notification panel', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Notificações/ }));
    await waitFor(() => {
      expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
    });
  });

  it('switches to Sounds tab and renders sound panel', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Sons/ }));
    await waitFor(() => {
      expect(screen.getByTestId('sound-panel')).toBeInTheDocument();
    });
  });

  it('switches to Shortcuts tab and renders shortcuts settings', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Atalhos/ }));
    await waitFor(() => {
      expect(screen.getByTestId('shortcuts-settings')).toBeInTheDocument();
    });
  });

  it('switches to Global tab and renders global settings', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Global/ }));
    await waitFor(() => {
      expect(screen.getByTestId('global-settings')).toBeInTheDocument();
    });
  });

  it('shows Automation tab with auto-assignment and transcription controls', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Automação/ }));
    await waitFor(() => {
      expect(screen.getByText('Atribuição Automática')).toBeInTheDocument();
    });
    expect(screen.getByText('Transcrição de Áudio')).toBeInTheDocument();
    expect(screen.getByText('Tempo de inatividade (minutos)')).toBeInTheDocument();
  });

  it('renders the onboarding reset button in Appearance tab', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Aparência/ }));
    await waitFor(() => {
      expect(screen.getByText('Reiniciar Tour')).toBeInTheDocument();
    });
    expect(screen.getByText('Tour de Onboarding')).toBeInTheDocument();
  });

  it('shows inactivity timeout input in Automation tab', async () => {
    const user = userEvent.setup();
    render(<SettingsView />);
    await user.click(screen.getByRole('tab', { name: /Automação/ }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });
  });
});
