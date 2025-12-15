import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'message_sent'
  | 'message_received'
  | 'contact_created'
  | 'contact_updated'
  | 'connection_created'
  | 'connection_deleted'
  | 'call_started'
  | 'call_ended'
  | 'transfer'
  | 'settings_changed';

interface AuditLogParams {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function logAudit({ action, entityType, entityId, details }: AuditLogParams) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase.from('audit_logs').insert([{
    user_id: user.id,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: JSON.parse(JSON.stringify(details || {})),
    user_agent: navigator.userAgent,
  }]);
}
