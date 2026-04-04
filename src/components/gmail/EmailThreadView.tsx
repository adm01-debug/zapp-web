import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { getInitials, formatMessageDate, truncateAddresses, formatFileSize } from './utils';

/**
 * Sanitize HTML to prevent XSS attacks from email content.
 * Removes script tags, event handlers, javascript: URIs, and dangerous elements.
 */
function sanitizeHtml(html: string): string {
  let clean = html;
  // Remove script tags and their content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style blocks that could contain @import, url(), or expression()
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove event handlers (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove javascript:, data:, and vbscript: URIs in href/src/action
  clean = clean.replace(/(href|src|action)\s*=\s*(?:"(?:javascript|data|vbscript):[^"]*"|'(?:javascript|data|vbscript):[^']*')/gi, '$1=""');
  // Remove dangerous tags
  clean = clean.replace(/<\/?(script|object|embed|applet|form|iframe|link|meta|base|svg|math)\b[^>]*>/gi, '');
  // Remove style attributes containing expression(), url(), or @import
  clean = clean.replace(/style\s*=\s*"[^"]*(?:expression|url|@import)\s*\([^"]*"/gi, '');
  clean = clean.replace(/style\s*=\s*'[^']*(?:expression|url|@import)\s*\([^']*'/gi, '');
  // Remove background attributes (can leak data via url())
  clean = clean.replace(/\s+background\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  return clean;
}

interface EmailThreadViewProps {
  thread: EmailThread;
  onBack: () => void;
}

interface EmailAttachmentInfo {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
}

function EmailMessageCard({ message, isLast, onToggleStar, attachments }: {
  message: EmailMessage;
  isLast: boolean;
  onToggleStar: (msgId: string, isStarred: boolean) => void;
  attachments: EmailAttachmentInfo[];
}) {
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
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStar(message.gmail_message_id, message.is_starred); }}
                className="shrink-0 hover:scale-110 transition-transform"
                aria-label={message.is_starred ? 'Remover favorito' : 'Favoritar'}
              >
                <Star className={`w-3 h-3 ${message.is_starred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-400'}`} />
              </button>
              {message.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {formatMessageDate(message.internal_date)}
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
                    {truncateAddresses(message.to_addresses)}
                  </span></p>
                  {message.cc_addresses.length > 0 && (
                    <p>Cc: <span className="text-foreground truncate block max-w-full" title={message.cc_addresses.join(', ')}>
                      {truncateAddresses(message.cc_addresses)}
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

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {attachments.length} anexo{attachments.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/20 border border-secondary/30 text-[10px] hover:bg-secondary/30 transition-colors"
                          title={`${att.filename} (${formatFileSize(att.size_bytes)})`}
                        >
                          <Paperclip className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[150px]">{att.filename}</span>
                          <span className="text-muted-foreground shrink-0">{formatFileSize(att.size_bytes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {message.has_attachments && attachments.length === 0 && (
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
  const { threadMessages, messagesLoading, markAsRead, trashMessage, modifyLabels, toggleStar, updateThread, setSelectedThreadId, threadAttachments } = useGmailContext();
  const [composerMode, setComposerMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // MUST be before keyboard shortcuts useEffect that references it
  const lastMessage = useMemo(() => {
    return threadMessages[threadMessages.length - 1];
  }, [threadMessages]);

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

  // Focus management — focus back button on mount
  useEffect(() => {
    backButtonRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (composerMode) return;

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
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composerMode, lastMessage, modifyLabels, onBack]);

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
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50" tabIndex={-1}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                <div className="space-y-0.5">
                  <p><kbd className="bg-secondary px-1 rounded text-[9px]">R</kbd> Responder</p>
                  <p><kbd className="bg-secondary px-1 rounded text-[9px]">Shift+R</kbd> Responder a todos</p>
                  <p><kbd className="bg-secondary px-1 rounded text-[9px]">F</kbd> Encaminhar</p>
                  <p><kbd className="bg-secondary px-1 rounded text-[9px]">E</kbd> Arquivar</p>
                  <p><kbd className="bg-secondary px-1 rounded text-[9px]">Esc</kbd> Voltar</p>
                </div>
              </TooltipContent>
            </Tooltip>
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

      {/* Thread management bar */}
      <div className="px-3 py-1.5 border-b flex items-center gap-2 text-xs bg-secondary/5 overflow-x-auto">
        <Select
          value={thread.status}
          onValueChange={(v) => updateThread.mutate({ threadId: thread.id, updates: { status: v } })}
        >
          <SelectTrigger className="h-6 w-[100px] text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={thread.priority}
          onValueChange={(v) => updateThread.mutate({ threadId: thread.id, updates: { priority: v } })}
        >
          <SelectTrigger className="h-6 w-[90px] text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        {thread.tags.length > 0 && (
          <div className="flex items-center gap-1 ml-1">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {thread.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
            ))}
          </div>
        )}
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
                onToggleStar={(msgId, isStarred) => toggleStar.mutate({ messageId: msgId, isStarred })}
                attachments={threadAttachments.filter(a => a.email_message_id === msg.id)}
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
