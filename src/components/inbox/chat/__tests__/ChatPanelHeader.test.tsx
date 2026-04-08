import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanelHeader } from '../ChatPanelHeader';
import { Conversation } from '@/types/chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/popupManager', () => ({ openChatPopup: vi.fn() }));

const mockConversation = {
  id: 'conv-1',
  contact: {
    id: 'c-1',
    name: 'Maria Silva',
    phone: '+5511999999999',
    avatar: '',
  },
  lastMessage: { content: 'Olá', timestamp: new Date(), sender: 'contact' },
  unreadCount: 0,
  status: 'open',
  priority: 'medium',
  channel: 'whatsapp',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Conversation;

const baseProps = {
  conversation: mockConversation,
  isContactTyping: false,
  showAIAssistant: false,
  showDetails: false,
  voiceId: 'voice-1',
  speed: 1,
  onToggleAIAssistant: vi.fn(),
  onToggleDetails: vi.fn(),
  onStartCall: vi.fn(),
  onOpenSearch: vi.fn(),
  onOpenTransfer: vi.fn(),
  onOpenSchedule: vi.fn(),
  onVoiceChange: vi.fn(),
  onSpeedChange: vi.fn(),
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TooltipProvider>{children}</TooltipProvider>
  </BrowserRouter>
);

describe('ChatPanelHeader - Summary Button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does NOT render summary button when canGenerateSummary is false', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={false} onGenerateSummary={vi.fn()} />
      </Wrapper>
    );
    expect(screen.queryByLabelText(/resumo/i)).not.toBeInTheDocument();
  });

  it('does NOT render summary button when onGenerateSummary is undefined', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} />
      </Wrapper>
    );
    // FileText icon button should not exist without the handler
    const buttons = screen.getAllByRole('button');
    const summaryBtn = buttons.find(b => b.querySelector('.lucide-file-text'));
    expect(summaryBtn).toBeUndefined();
  });

  it('renders summary button when canGenerateSummary=true and handler is provided', () => {
    const onGenerate = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} onGenerateSummary={onGenerate} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const summaryBtn = buttons.find(b => b.querySelector('.lucide-file-text'));
    expect(summaryBtn).toBeDefined();
  });

  it('calls onGenerateSummary when clicked', () => {
    const onGenerate = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} canGenerateSummary={true} onGenerateSummary={onGenerate} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const summaryBtn = buttons.find(b => b.querySelector('.lucide-file-text'));
    fireEvent.click(summaryBtn!);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows loader and disables button when isSummaryLoading=true', () => {
    render(
      <Wrapper>
        <ChatPanelHeader
          {...baseProps}
          canGenerateSummary={true}
          onGenerateSummary={vi.fn()}
          isSummaryLoading={true}
        />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const summaryBtn = buttons.find(b => b.querySelector('.lucide-loader-2'));
    expect(summaryBtn).toBeDefined();
    expect((summaryBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('summary button is positioned between Brain and Info icons', () => {
    const onGenerate = vi.fn();
    render(
      <Wrapper>
        <ChatPanelHeader
          {...baseProps}
          canGenerateSummary={true}
          onGenerateSummary={onGenerate}
          onToggleDetails={vi.fn()}
        />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const brainIdx = buttons.findIndex(b => b.querySelector('.lucide-brain'));
    const summaryIdx = buttons.findIndex(b => b.querySelector('.lucide-file-text'));
    const infoIdx = buttons.findIndex(b => b.querySelector('.lucide-info'));

    expect(brainIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(infoIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(brainIdx);
    expect(summaryIdx).toBeLessThan(infoIdx);
  });

  // ── Header basics ──

  it('renders contact name and avatar', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} />
      </Wrapper>
    );
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('MS')).toBeInTheDocument(); // avatar fallback
  });

  it('shows typing indicator when contact is typing', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} isContactTyping={true} />
      </Wrapper>
    );
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('shows Online when contact is not typing', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} isContactTyping={false} />
      </Wrapper>
    );
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('calls onOpenSearch when search button is clicked', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const searchBtn = buttons.find(b => b.querySelector('.lucide-search'));
    fireEvent.click(searchBtn!);
    expect(baseProps.onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it('highlights Brain button when AI assistant is active', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} showAIAssistant={true} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const brainBtn = buttons.find(b => b.querySelector('.lucide-brain'));
    expect(brainBtn!.className).toContain('text-primary');
  });

  it('highlights Info button when details panel is active', () => {
    render(
      <Wrapper>
        <ChatPanelHeader {...baseProps} showDetails={true} onToggleDetails={vi.fn()} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const infoBtn = buttons.find(b => b.querySelector('.lucide-info'));
    expect(infoBtn!.className).toContain('text-primary');
  });
});
