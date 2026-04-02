import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsAppStatusSection } from '../WhatsAppStatusSection';

// Mock useWhatsAppStatus
const mockRefresh = vi.fn();
let mockData = {
  statusMessages: [] as any[],
  presence: { isOnline: false, lastSeen: null, loading: false },
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
};

vi.mock('@/hooks/useWhatsAppStatus', () => ({
  useWhatsAppStatus: () => mockData,
}));

describe('WhatsAppStatusSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      statusMessages: [],
      presence: { isOnline: false, lastSeen: null, loading: false },
      loading: false,
      error: null,
      refresh: mockRefresh,
    };
  });

  // ========== LOADING STATE ==========
  it('shows loading spinner when loading', () => {
    mockData.loading = true;
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Carregando status...')).toBeInTheDocument();
  });

  // ========== ERROR STATE ==========
  it('shows error message', () => {
    mockData.error = 'Sem conexão WhatsApp disponível';
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Sem conexão WhatsApp disponível')).toBeInTheDocument();
  });

  it('shows retry button on error', () => {
    mockData.error = 'Erro genérico';
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('calls refresh on retry click', () => {
    mockData.error = 'Erro';
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  // ========== EMPTY STATE ==========
  it('shows empty message when no statuses', () => {
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Nenhum status disponível')).toBeInTheDocument();
    expect(screen.getByText('Os status desaparecem após 24h')).toBeInTheDocument();
  });

  // ========== PRESENCE: ONLINE ==========
  it('shows Online agora when online', () => {
    mockData.presence = { isOnline: true, lastSeen: null, loading: false };
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Online agora')).toBeInTheDocument();
  });

  // ========== PRESENCE: OFFLINE ==========
  it('shows Offline when offline without lastSeen', () => {
    mockData.presence = { isOnline: false, lastSeen: null, loading: false };
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  // ========== PRESENCE: LAST SEEN ==========
  it('shows last seen when available', () => {
    mockData.presence = { isOnline: false, lastSeen: 'há 5 minutos', loading: false };
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Visto por último há 5 minutos')).toBeInTheDocument();
  });

  // ========== PRESENCE: LOADING ==========
  it('shows Verificando... when presence is loading', () => {
    mockData.presence = { isOnline: false, lastSeen: null, loading: true };
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });

  // ========== STATUS MESSAGES ==========
  it('renders image status correctly', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'img1' },
      message: { imageMessage: { caption: 'Minha foto de férias' } },
      messageTimestamp: Math.floor(Date.now() / 1000) - 3600,
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Minha foto de férias')).toBeInTheDocument();
  });

  it('renders video status correctly', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'vid1' },
      message: { videoMessage: { caption: 'Meu vídeo' } },
      messageTimestamp: Math.floor(Date.now() / 1000) - 1800,
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Meu vídeo')).toBeInTheDocument();
  });

  it('renders text status correctly', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'txt1' },
      message: { extendedTextMessage: { text: 'Bom dia!' } },
      messageTimestamp: Math.floor(Date.now() / 1000) - 600,
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Bom dia!')).toBeInTheDocument();
  });

  it('renders conversation type status', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'conv1' },
      message: { conversation: 'Status simples' },
      messageTimestamp: Math.floor(Date.now() / 1000) - 300,
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Status simples')).toBeInTheDocument();
  });

  it('shows fallback 📷 Foto for image without caption', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'img2' },
      message: { imageMessage: {} },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('📷 Foto')).toBeInTheDocument();
  });

  it('shows fallback 🎥 Vídeo for video without caption', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'vid2' },
      message: { videoMessage: {} },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('🎥 Vídeo')).toBeInTheDocument();
  });

  it('shows fallback Status for empty message', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'empty1' },
      message: {},
      messageTimestamp: Math.floor(Date.now() / 1000),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  // ========== STATUS COUNT BADGE ==========
  it('shows correct count for single status', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 's1' },
      message: { conversation: 'Test' },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('1 status')).toBeInTheDocument();
  });

  it('shows correct count for multiple statuses', () => {
    mockData.statusMessages = [
      { key: { id: 's1' }, message: { conversation: 'A' }, messageTimestamp: Math.floor(Date.now() / 1000) },
      { key: { id: 's2' }, message: { conversation: 'B' }, messageTimestamp: Math.floor(Date.now() / 1000) },
      { key: { id: 's3' }, message: { conversation: 'C' }, messageTimestamp: Math.floor(Date.now() / 1000) },
    ];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('3 status')).toBeInTheDocument();
  });

  // ========== REFRESH BUTTON ==========
  it('has refresh button in the presence section', () => {
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    // The refresh button in the normal (non-error) state
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // ========== CLICK TO SELECT STATUS ==========
  it('does not crash when clicking a status item', () => {
    mockData.statusMessages = [{
      key: { remoteJid: 'status@broadcast', fromMe: false, id: 'click1' },
      message: { conversation: 'Clickable' },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    const item = screen.getByText('Clickable');
    fireEvent.click(item);
    // No crash = success
  });

  // ========== TIMESTAMP EDGE CASES ==========
  it('handles string timestamp', () => {
    mockData.statusMessages = [{
      key: { id: 'ts1' },
      message: { conversation: 'String TS' },
      messageTimestamp: String(Math.floor(Date.now() / 1000) - 60),
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('String TS')).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    mockData.statusMessages = [{
      key: { id: 'nots' },
      message: { conversation: 'No Time' },
    }];
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('No Time')).toBeInTheDocument();
  });

  // ========== MANY STATUSES ==========
  it('renders 50 statuses without crashing', () => {
    mockData.statusMessages = Array.from({ length: 50 }, (_, i) => ({
      key: { id: `mass-${i}` },
      message: { conversation: `Status ${i}` },
      messageTimestamp: Math.floor(Date.now() / 1000) - i * 60,
    }));
    render(<WhatsAppStatusSection phone="+5511999999999" />);
    expect(screen.getByText('50 status')).toBeInTheDocument();
  });
});
