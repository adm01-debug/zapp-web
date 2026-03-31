import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNATURE_ENABLED_KEY = 'chat_signature_enabled';

export function useMessageSignature() {
  const [signatureEnabled, setSignatureEnabled] = useState(() => {
    try {
      return localStorage.getItem(SIGNATURE_ENABLED_KEY) !== 'false'; // default ON
    } catch {
      return true;
    }
  });
  const [agentName, setAgentName] = useState('');

  // Fetch agent name from profile
  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.name) {
        setAgentName(profile.name);
      }
    };
    fetchName();
  }, []);

  const toggleSignature = useCallback(() => {
    setSignatureEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(SIGNATURE_ENABLED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const applySignature = useCallback((content: string): string => {
    if (!signatureEnabled || !agentName) return content;
    return `*${agentName}:*\n${content}`;
  }, [signatureEnabled, agentName]);

  return { signatureEnabled, agentName, toggleSignature, applySignature };
}
