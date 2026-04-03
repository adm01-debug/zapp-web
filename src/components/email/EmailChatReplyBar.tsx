import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Send, Paperclip, X, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { useGmail, type EmailMessage } from '@/hooks/useGmail';

interface EmailChatReplyBarProps {
  threadId: string;
  lastMessage: EmailMessage | null;
  accountEmail?: string;
  mode: 'reply' | 'forward' | 'new';
  onModeChange: (mode: 'reply' | 'forward' | 'new') => void;
  onSent?: () => void;
}

export function EmailChatReplyBar({
  threadId,
  lastMessage,
  accountEmail,
  mode,
  onModeChange,
  onSent,
}: EmailChatReplyBarProps) {
  const { sendEmail, replyEmail } = useGmail();

  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSending = sendEmail.isPending || replyEmail.isPending;

  const resolvedTo = mode === 'forward'
    ? to
    : lastMessage
      ? (lastMessage.direction === 'inbound' ? lastMessage.from_address : lastMessage.to_addresses[0] || '')
      : '';

  const handleSend = async () => {
    if (!body.trim()) return;
    const target = resolvedTo || to;
    if (!target.trim()) return;

    if (mode === 'reply' && lastMessage) {
      await replyEmail.mutateAsync({
        thread_id: threadId,
        message_id: lastMessage.gmail_message_id,
        to: target,
        text_body: body,
      });
    } else if (mode === 'forward') {
      const fwdBody = lastMessage
        ? `${body}\n\n---------- Mensagem encaminhada ----------\nDe: ${lastMessage.from_name || lastMessage.from_address}\n\n${lastMessage.body_text || lastMessage.snippet}`
        : body;
      await sendEmail.mutateAsync({
        to: target,
        subject: lastMessage ? `Fwd: ${lastMessage.subject}` : '',
        text_body: fwdBody,
      });
    } else {
      await sendEmail.mutateAsync({
        to: target,
        subject: '',
        text_body: body,
      });
    }

    setBody('');
    setTo('');
    setAttachments([]);
    onSent?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card/50 p-3 space-y-2">
      {/* Forward: show destination input */}
      {mode === 'forward' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Para:</span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@destinatario.com"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Reply info */}
      {mode === 'reply' && resolvedTo && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Respondendo para</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{resolvedTo}</Badge>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'forward' ? 'Adicione uma mensagem...' : 'Digite sua resposta...'}
            className="min-h-[44px] max-h-[200px] text-sm resize-none pr-10"
            rows={1}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 bottom-1 h-7 w-7"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => {
            setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
          }} />
        </div>

        <Button
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={handleSend}
          disabled={!body.trim() || isSending || (!resolvedTo && !to.trim())}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1">
              <Paperclip className="w-2.5 h-2.5" />
              {f.name}
              <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
