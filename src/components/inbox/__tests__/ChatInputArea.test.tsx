/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock all heavy sub-components
vi.mock('../AdvancedMessageMenu', () => ({
  AdvancedMessageMenu: () => <div data-testid="advanced-menu" />,
}));
vi.mock('../ReplyQuote', () => ({
  ReplyPreview: ({ message, onCancel }: any) => (
    <div data-testid="reply-preview">
      <span>{message.content}</span>
      <button data-testid="cancel-reply" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));
vi.mock('../SlashCommands', () => ({
  SlashCommands: ({ isOpen }: any) => isOpen ? <div data-testid="slash-commands" /> : null,
}));
vi.mock('../AudioRecorder', () => ({
  AudioRecorder: ({ onSend, onCancel }: any) => (
    <div data-testid="audio-recorder">
      <button data-testid="audio-send" onClick={() => onSend(new Blob())}>SendAudio</button>
      <button data-testid="audio-cancel" onClick={onCancel}>CancelAudio</button>
    </div>
  ),
}));
vi.mock('../FileUploader', () => ({
  FileUploader: React.forwardRef((_props: any, _ref: any) => <div data-testid="file-uploader" />),
}));
vi.mock('../AISuggestions', () => ({
  AISuggestions: () => <div data-testid="ai-suggestions" />,
}));
vi.mock('../MessageTemplates', () => ({
  MessageTemplates: () => <div data-testid="message-templates" />,
}));
vi.mock('@/components/catalog/ProductCatalog', () => ({
  ProductCatalog: () => <div data-testid="product-catalog" />,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <>{children}</>,
  PopoverTrigger: React.forwardRef(({ children, asChild }: any, _ref: any) => asChild ? children : <span>{children}</span>),
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: { div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />) },
}));

import { ChatInputArea } from '../chat/ChatInputArea';

const baseProps = {
  inputValue: '',
  replyToMessage: null,
  isRecordingAudio: false,
  showSlashCommands: false,
  contactId: 'c1',
  contactPhone: '+5511999',
  contactName: 'Alice',
  instanceName: 'wpp2',
  messages: [],
  quickReplies: [],
  onInputChange: vi.fn(),
  onKeyDown: vi.fn(),
  onBlur: vi.fn(),
  onSend: vi.fn(),
  onCancelReply: vi.fn(),
  onSlashCommand: vi.fn(),
  onCloseSlashCommands: vi.fn(),
  onQuickReply: vi.fn(),
  onRecordToggle: vi.fn(),
  onAudioSend: vi.fn(),
  onAudioCancel: vi.fn(),
  onOpenInteractiveBuilder: vi.fn(),
  onOpenSchedule: vi.fn(),
  onOpenLocationPicker: vi.fn(),
  onSendProduct: vi.fn(),
  onSelectSuggestion: vi.fn(),
  onSelectTemplate: vi.fn(),
  fileUploaderRef: { current: null },
  inputRef: { current: null },
};

describe('ChatInputArea', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the text input with default placeholder', () => {
    render(<ChatInputArea {...baseProps} />);
    expect(screen.getByPlaceholderText('Type Your Message')).toBeInTheDocument();
  });

  it('renders reply placeholder when replying', () => {
    render(<ChatInputArea {...baseProps} replyToMessage={{ id: 'm1', content: 'Hi', type: 'text', sender: 'contact', conversationId: 'c1', timestamp: new Date(), status: 'read' } as any} />);
    expect(screen.getByPlaceholderText('Digite sua resposta...')).toBeInTheDocument();
  });

  it('renders the send button', () => {
    render(<ChatInputArea {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('rounded-full') && b.className.includes('bg-primary'));
    expect(sendBtn).toBeDefined();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatInputArea {...baseProps} inputValue="" />);
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('rounded-full') && b.className.includes('bg-primary'));
    expect(sendBtn).toBeDisabled();
  });

  it('send button is enabled when input has text', () => {
    render(<ChatInputArea {...baseProps} inputValue="Hello" />);
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('rounded-full') && b.className.includes('bg-primary'));
    expect(sendBtn).not.toBeDisabled();
  });

  it('calls onSend when send button is clicked', () => {
    render(<ChatInputArea {...baseProps} inputValue="Hello" />);
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find(b => b.className.includes('rounded-full') && b.className.includes('bg-primary'));
    fireEvent.click(sendBtn!);
    expect(baseProps.onSend).toHaveBeenCalledTimes(1);
  });

  it('calls onInputChange when typing', () => {
    render(<ChatInputArea {...baseProps} />);
    const input = screen.getByPlaceholderText('Type Your Message');
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(baseProps.onInputChange).toHaveBeenCalled();
  });

  it('calls onKeyDown when pressing a key', () => {
    render(<ChatInputArea {...baseProps} />);
    const input = screen.getByPlaceholderText('Type Your Message');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(baseProps.onKeyDown).toHaveBeenCalled();
  });

  it('renders reply preview when replyToMessage is set', () => {
    render(<ChatInputArea {...baseProps} replyToMessage={{ id: 'm1', content: 'Test msg', type: 'text', sender: 'contact', conversationId: 'c1', timestamp: new Date(), status: 'read' } as any} />);
    expect(screen.getByTestId('reply-preview')).toBeInTheDocument();
    expect(screen.getByText('Test msg')).toBeInTheDocument();
  });

  it('calls onCancelReply when cancel reply is clicked', () => {
    render(<ChatInputArea {...baseProps} replyToMessage={{ id: 'm1', content: 'Test msg', type: 'text', sender: 'contact', conversationId: 'c1', timestamp: new Date(), status: 'read' } as any} />);
    fireEvent.click(screen.getByTestId('cancel-reply'));
    expect(baseProps.onCancelReply).toHaveBeenCalled();
  });

  it('shows audio recorder when isRecordingAudio is true', () => {
    render(<ChatInputArea {...baseProps} isRecordingAudio={true} />);
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
  });

  it('does not show audio recorder when isRecordingAudio is false', () => {
    render(<ChatInputArea {...baseProps} isRecordingAudio={false} />);
    expect(screen.queryByTestId('audio-recorder')).toBeNull();
  });

  it('shows slash commands when showSlashCommands is true', () => {
    render(<ChatInputArea {...baseProps} showSlashCommands={true} />);
    expect(screen.getByTestId('slash-commands')).toBeInTheDocument();
  });

  it('does not show slash commands when showSlashCommands is false', () => {
    render(<ChatInputArea {...baseProps} showSlashCommands={false} />);
    expect(screen.queryByTestId('slash-commands')).toBeNull();
  });

  it('renders emoji button', () => {
    render(<ChatInputArea {...baseProps} />);
    const emojiBtn = screen.getByLabelText('Emoji');
    expect(emojiBtn).toBeInTheDocument();
  });

  it('renders mic button', () => {
    render(<ChatInputArea {...baseProps} />);
    const micBtn = screen.getByLabelText('Gravar áudio');
    expect(micBtn).toBeInTheDocument();
  });

  it('calls onRecordToggle when mic button clicked', () => {
    render(<ChatInputArea {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Gravar áudio'));
    expect(baseProps.onRecordToggle).toHaveBeenCalled();
  });

  it('renders settings/options button', () => {
    render(<ChatInputArea {...baseProps} />);
    const settingsBtn = screen.getByLabelText('Opções');
    expect(settingsBtn).toBeInTheDocument();
  });

  it('renders file uploader component', () => {
    render(<ChatInputArea {...baseProps} />);
    const uploaders = screen.getAllByTestId('file-uploader');
    expect(uploaders.length).toBeGreaterThan(0);
  });

  it('calls onBlur when input loses focus', () => {
    render(<ChatInputArea {...baseProps} />);
    const input = screen.getByPlaceholderText('Type Your Message');
    fireEvent.blur(input);
    expect(baseProps.onBlur).toHaveBeenCalled();
  });
});
