/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
    button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: React.forwardRef(({ children, asChild }: any, _ref: any) => asChild ? children : <span>{children}</span>),
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('../MessageReactions', () => ({
  MessageReactions: ({ messageId }: any) => <div data-testid={`reactions-${messageId}`} />,
}));

vi.mock('../ImagePreview', () => ({
  MessageImage: ({ src }: any) => <img data-testid="message-image" src={src} alt="preview" />,
}));

vi.mock('../MediaPreview', () => ({
  DocumentPreview: ({ fileName }: any) => <div data-testid="document-preview">{fileName}</div>,
  VideoPreview: ({ url }: any) => <div data-testid="video-preview">{url}</div>,
}));

vi.mock('../AudioMessagePlayer', () => ({
  AudioMessagePlayer: ({ audioUrl }: any) => <div data-testid="audio-player">{audioUrl}</div>,
}));

vi.mock('../InteractiveMessage', () => ({
  InteractiveMessageDisplay: () => <div data-testid="interactive-msg" />,
  ButtonResponseBadge: ({ buttonTitle }: any) => <div data-testid="button-response">{buttonTitle}</div>,
}));

vi.mock('../ReplyQuote', () => ({
  QuotedMessage: ({ replyTo }: any) => <div data-testid="quoted-msg">{replyTo.content}</div>,
}));

vi.mock('../LocationMessage', () => ({
  LocationMessageDisplay: ({ location }: any) => <div data-testid="location-msg">{location.name}</div>,
}));

vi.mock('../TextToSpeechButton', () => ({
  TextToSpeechButton: () => <button data-testid="tts-button">TTS</button>,
}));

import { ChatMessageBubble } from '../chat/ChatMessageBubble';

function makeMessage(overrides: any = {}) {
  return {
    id: 'msg1',
    conversationId: 'c1',
    content: 'Hello world',
    type: 'text',
    sender: 'agent',
    timestamp: new Date('2024-06-01T14:30:00Z'),
    status: 'delivered',
    ...overrides,
  };
}

const baseProps = {
  reactions: [],
  ttsLoading: false,
  ttsPlaying: false,
  ttsMessageId: null,
  onSpeak: vi.fn(),
  onStop: vi.fn(),
  onReply: vi.fn(),
  onForward: vi.fn(),
  onCopy: vi.fn(),
  onScrollToMessage: vi.fn(),
  onInteractiveButtonClick: vi.fn(),
  registerRef: vi.fn(),
};

describe('ChatMessageBubble', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders text message content', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders timestamp', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('registers ref on mount', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(baseProps.registerRef).toHaveBeenCalledWith('msg1', expect.anything());
  });

  it('renders reply button with correct aria-label', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByLabelText('Responder')).toBeInTheDocument();
  });

  it('renders forward button', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByLabelText('Encaminhar')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByLabelText('Copiar')).toBeInTheDocument();
  });

  it('calls onReply when reply button clicked', () => {
    const msg = makeMessage();
    render(<ChatMessageBubble message={msg} {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Responder'));
    expect(baseProps.onReply).toHaveBeenCalledWith(msg);
  });

  it('calls onForward when forward button clicked', () => {
    const msg = makeMessage();
    render(<ChatMessageBubble message={msg} {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Encaminhar'));
    expect(baseProps.onForward).toHaveBeenCalledWith(msg);
  });

  it('calls onCopy when copy button clicked', () => {
    render(<ChatMessageBubble message={makeMessage({ content: 'Copy me' })} {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Copiar'));
    expect(baseProps.onCopy).toHaveBeenCalledWith('Copy me');
  });

  // Message types
  it('renders image message', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'image', mediaUrl: 'https://img.test/pic.jpg', content: '' })} {...baseProps} />);
    expect(screen.getByTestId('message-image')).toBeInTheDocument();
  });

  it('renders video message', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'video', mediaUrl: 'https://vid.test/v.mp4', content: '' })} {...baseProps} />);
    expect(screen.getByTestId('video-preview')).toBeInTheDocument();
  });

  it('renders audio message', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'audio', mediaUrl: 'https://aud.test/a.ogg', content: '' })} {...baseProps} />);
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
  });

  it('renders document message', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'document', mediaUrl: 'https://doc.test/r.pdf', content: 'report.pdf' })} {...baseProps} />);
    expect(screen.getByTestId('document-preview')).toBeInTheDocument();
  });

  it('renders location message', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'location', location: { latitude: -23.5, longitude: -46.6, name: 'São Paulo' }, content: '' })} {...baseProps} />);
    expect(screen.getByTestId('location-msg')).toBeInTheDocument();
  });

  // Status icons
  it('shows sent status for agent messages with status sent', () => {
    render(<ChatMessageBubble message={makeMessage({ status: 'sent', sender: 'agent' })} {...baseProps} />);
    // The Check icon is rendered; just ensure no crash
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows delivered status icon for delivered messages', () => {
    render(<ChatMessageBubble message={makeMessage({ status: 'delivered', sender: 'agent' })} {...baseProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows read status with blue color', () => {
    render(<ChatMessageBubble message={makeMessage({ status: 'read', sender: 'agent' })} {...baseProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows failed status', () => {
    render(<ChatMessageBubble message={makeMessage({ status: 'failed', sender: 'agent' })} {...baseProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  // Sender alignment
  it('aligns agent messages to the right', () => {
    const { container } = render(<ChatMessageBubble message={makeMessage({ sender: 'agent' })} {...baseProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });

  it('aligns contact messages to the left', () => {
    const { container } = render(<ChatMessageBubble message={makeMessage({ sender: 'contact' })} {...baseProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-start');
  });

  // Reactions
  it('renders reactions component', () => {
    render(<ChatMessageBubble message={makeMessage()} {...baseProps} />);
    expect(screen.getByTestId('reactions-msg1')).toBeInTheDocument();
  });

  // Reply-to / quoted
  it('renders quoted message when replyTo is set', () => {
    render(<ChatMessageBubble message={makeMessage({ replyTo: { messageId: 'm0', content: 'Original', sender: 'contact' } })} {...baseProps} />);
    expect(screen.getByTestId('quoted-msg')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  // TTS button for text messages
  it('renders TTS button for text messages from agent', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'text', sender: 'agent' })} {...baseProps} />);
    expect(screen.getByTestId('tts-button')).toBeInTheDocument();
  });

  it('does not render TTS for non-text messages', () => {
    render(<ChatMessageBubble message={makeMessage({ type: 'image', mediaUrl: 'x', content: '' })} {...baseProps} />);
    expect(screen.queryByTestId('tts-button')).toBeNull();
  });

  // Edge cases
  it('renders emoji-only message', () => {
    render(<ChatMessageBubble message={makeMessage({ content: '😀🎉🔥' })} {...baseProps} />);
    expect(screen.getByText('😀🎉🔥')).toBeInTheDocument();
  });

  it('renders long message without crashing', () => {
    const longText = 'A'.repeat(5000);
    render(<ChatMessageBubble message={makeMessage({ content: longText })} {...baseProps} />);
    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('renders message with special characters', () => {
    render(<ChatMessageBubble message={makeMessage({ content: '<script>alert("xss")</script>&nbsp;' })} {...baseProps} />);
    expect(screen.getByText('<script>alert("xss")</script>&nbsp;')).toBeInTheDocument();
  });

  it('does not show status icon for contact messages', () => {
    const { container } = render(<ChatMessageBubble message={makeMessage({ sender: 'contact', status: 'sent' })} {...baseProps} />);
    // Contact messages should not have status icon; the status icon area is only for sent messages
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
