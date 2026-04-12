import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getLogger } from '@/lib/logger';
import { toast } from 'sonner';

const DRAFT_KEY_PREFIX = 'team_draft_';
export const CHAR_LIMIT = 10000;

export function useTeamChatDraft(conversationId: string, text: string, setText: (t: string) => void) {
  // Auto-save drafts
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(`${DRAFT_KEY_PREFIX}${conversationId}`, text);
        else localStorage.removeItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
      } catch { /* quota exceeded */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [text, conversationId]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
      if (draft && !text) setText(draft);
    } catch { /* private mode */ }
  }, [conversationId]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`${DRAFT_KEY_PREFIX}${conversationId}`); } catch { /* ignore */ }
  }, [conversationId]);

  return { clearDraft };
}

export function useTeamPasteUpload(conversationId: string, onFileSent: (url: string, type: string, name: string) => void) {
  const { profile } = useAuth();
  const log = useMemo(() => getLogger('TeamPasteUpload'), []);
  const [pasteUploading, setPasteUploading] = useState(false);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !profile || pasteUploading) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;
        setPasteUploading(true);
        try {
          const ext = file.type.split('/')[1] || 'png';
          const path = `${profile.id}/${conversationId}/${Date.now()}_paste.${ext}`;
          const { error: uploadError } = await supabase.storage.from('team-chat-files').upload(path, file, { contentType: file.type });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('team-chat-files').getPublicUrl(path);
          onFileSent(urlData.publicUrl, 'image', '📋 Imagem colada');
        } catch (err) {
          log.error('Paste image upload error:', err);
          toast.error('Erro ao enviar imagem colada');
        } finally {
          setPasteUploading(false);
        }
        return;
      }
    }
  }, [profile, conversationId, pasteUploading, onFileSent, log]);

  return { handlePaste, pasteUploading };
}
