import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export interface QuickReplyTemplate {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  is_global: boolean | null;
  use_count: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useQuickReplies() {
  const { user } = useAuth();

  const { data: templates, isLoading, error, refetch } = useQuery({
    queryKey: ['quick-replies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data as QuickReplyTemplate[];
    },
    enabled: !!user?.id,
  });

  // Convert to QuickReply format for compatibility
  const quickReplies = useMemo(() => {
    if (!templates) return [];
    
    return templates.map((t) => ({
      id: t.id,
      title: t.title,
      shortcut: t.shortcut || `/${t.title.toLowerCase().replace(/\s+/g, '-')}`,
      content: t.content,
      category: t.category || 'geral',
    }));
  }, [templates]);

  const incrementUseCount = async (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;

    await supabase
      .from('message_templates')
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq('id', templateId);
  };

  return {
    quickReplies,
    templates,
    isLoading,
    error,
    refetch,
    incrementUseCount,
  };
}
