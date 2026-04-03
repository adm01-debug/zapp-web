import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Reply, ReplyAll, Forward, Star, Trash2, Archive,
  Paperclip, ChevronDown, ChevronUp, MoreHorizontal,
  Mail, MailOpen, Tag, Clock, Loader2, ArrowLeft
} from 'lucide-react';
import { type EmailThread, type EmailMessage } from '@/hooks/useGmail';
import { useGmailContext } from './GmailProvider';
import { EmailComposer } from './EmailComposer';

/**
 * Sanitize HTML to prevent XSS attacks from email content.
 * Removes script tags, event handlers, javascript: URIs, and dangerous elements.
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove javascript: and data: URIs in href/src/action attributes
  clean = clean.replace(/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
  clean = clean.replace(/(href|src|action)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""');
  // Remove <object>, <embed>, <applet>, <form>, <iframe>, <link>, <meta>, <base> tags
  clean = clean.replace(/<\/?(object|embed|applet|form|iframe|link|meta|base|svg)\b[^>]*>/gi, '');
  // Remove style attributes that could contain expressions
  clean = clean.replace(/style\s*=\s*"[^"]*expression\s*\([^"]*"/gi, '');
  clean = clean.replace(/style\s*=\s*'[^']*expression\s*\([^']*'/gi, '');
  return clean;
}

interface EmailThreadViewProps {
  thread: EmailThread;
  onBack: () => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  return email[0]?.toUpperCase() || '?';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EmailMessageCard({ message, isLast }: { message: EmailMessage; isLast: boolean }) {
  const [expanded, setExpanded] = useState(isLast);
  const [showHtml, setShowHtml] = useState(false);

  const isInbound = message.direction === 'inbound';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={`border-secondary/30 ${!message.is_read ? 'border-l-2 border-l-primary' : ''}`}>
        {/* Message Header - Always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-start gap-3 text-left hover:bg-secondary/5 transition-colors"
        >
          <Avatar className="h-8 w-8 shrink-0 mt-0.5">
            <AvatarFallback className={`text-xs ${isInbound ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
              {getInitials(message.from_name, message.from_address)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {message.from_name || message.from_address}
              </span>
              {message.is_starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
              {message.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {formatDate(message.internal_date)}
              </span>
            </div>
            {!expanded && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {message.snippet}
              </p>
            )}
          </div>

          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
        </button>

        {/* Message Body - Expandable */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pl-14">
                {/* Addresses */}
                <div className="text-[10px] text-muted-foreground space-y-0.5 mb-3">
                  <p>De: <span className="text-foreground">{message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address}</span></p>
                  <p>Para: <span className="text-foreground truncate block max-w-full" title={message.to_addresses.join(', ')}>
                    {message.to_addresses.length > 3
                      ? `${message.to_addresses.slice(0, 3).join(', ')} e mais ${message.to_addresses.length - 3}`
                      : message.to_addresses.join(', ')}
                  </span></p>
                  {message.cc_addresses.length > 0 && (
                    <p>Cc: <span className="text-foreground truncate block max-w-full" title={message.cc_addresses.join(', ')}>
                      {message.cc_addresses.length > 3
                        ? `${message.cc_addresses.slice(0, 3).join(', ')} e mais ${message.cc_addresses.length - 3}`
                        : message.cc_addresses.join(', ')}
                    </span></p>
                  )}
                </div>

                {/* Body */}
                {message.body_html && showHtml ? (
                  <iframe
                    sandbox=""
                    srcDoc={sanitizeHtml(message.body_html)}
                    className="w-full min-h-[200px] max-h-[400px] rounded border bg-background"
                    title={`Email: ${message.subject || 'sem assunto'}`}
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.body_text || message.snippet}
                  </div>
                )}

                {message.body_html && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] mt-2 h-6 px-2"
                    onClick={() => setShowHtml(!showHtml)}
                  >
                    {showHtml ? 'Ver texto simples' : 'Ver HTML'}
                  </Button>
                )}

                {/* Attachment indicators */}
                {message.has_attachments && (
                  <div className="mt-2 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Este email possui anexos</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function EmailThreadView({ thread, onBack }: EmailThreadViewProps) {
  const { threadMessages, messagesLoading, markAsRead, trashMessage, modifyLabels, setSelectedThreadId } = useGmailContext();
  const [composerMode, setComposerMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (composerMode) return; // Don't intercept while composing

      switch (e.key) {
        case 'Escape':
          onBack();
          break;
        case 'r':
          e.preventDefault();
          setComposerMode(e.shiftKey ? 'reply-all' : 'reply');
          break;
        case 'f':
          e.preventDefault();
          setComposerMode('forward');
          break;
        case 'e':
          if (lastMessage) {
            e.preventDefault();
            modifyLabels.mutate({ message_id: lastMessage.gmail_message_id, remove_labels: ['INBOX'] });
            onBack();
          }
          break;
        case '#':
          // Trash with # (Gmail convention)
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composerMode, lastMessage, modifyLabels, onBack]);

  // Focus management — focus back button on mount
  useEffect(() => {
    backButtonRef.current?.focus();
  }, []);

  // Set selected thread to load messages
  useEffect(() => {
    setSelectedThreadId(thread.id);
    return () => setSelectedThreadId(null);
  }, [thread.id, setSelectedThreadId]);

  // Mark as read — only once when thread first opens with unread messages
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (hasMarkedRead.current || !thread.is_unread || threadMessages.length === 0) return;
    const unreadIds = threadMessages
      .filter(m => !m.is_read)
      .map(m => m.gmail_message_id);
    if (unreadIds.length > 0) {
      hasMarkedRead.current = true;
      markAsRead.mutate(unreadIds);
    }
  }, [threadMessages, thread.is_unread, markAsRead]);

  const lastMessage = useMemo(() => {
    return threadMessages[threadMessages.length - 1];
  }, [threadMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-3">
        <Button ref={backButtonRef} variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack} aria-label="Voltar para inbox">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{thread.subject || '(Sem assunto)'}</h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{thread.message_count} mensage{thread.message_count !== 1 ? 'ns' : 'm'}</span>
            {thread.contact && (
              <>
                <span>-</span>
                <span>{thread.contact.name}</span>
              </>
            )}
            {thread.tags.length > 0 && thread.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Thread Actions */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (lastMessage) {
                      modifyLabels.mutate({
                        message_id: lastMessage.gmail_message_id,
                        remove_labels: ['INBOX'],
                      });
                      onBack();
                    }
                  }}
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Arquivar</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta conversa sera movida para a lixeira do Gmail. Voce pode recupera-la dentro de 30 dias.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => lastMessage && trashMessage.mutate(lastMessage.gmail_message_id)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            threadMessages.map((msg, i) => (
              <EmailMessageCard
                key={msg.id}
                message={msg}
                isLast={i === threadMessages.length - 1}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Actions */}
      <div className="p-3 border-t flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setComposerMode('reply')}
        >
          <Reply className="w-4 h-4 mr-1" />
          Responder
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setComposerMode('reply-all')}
        >
          <ReplyAll className="w-4 h-4 mr-1" />
          Responder a todos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setComposerMode('forward')}
        >
          <Forward className="w-4 h-4 mr-1" />
          Encaminhar
        </Button>
      </div>

      {/* Composer */}
      <AnimatePresence>
        {composerMode && lastMessage && (
          <EmailComposer
            mode={composerMode}
            replyTo={lastMessage}
            threadId={thread.gmail_thread_id}
            onClose={() => setComposerMode(null)}
            onSent={() => setComposerMode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
