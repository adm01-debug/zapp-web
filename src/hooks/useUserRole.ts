import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'supervisor' | 'agent';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRoles();
    } else {
      setRoles([]);
      setIsAdmin(false);
      setIsSupervisor(false);
      setLoading(false);
    }
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      const userRoles = data.map(r => r.role as AppRole);
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsSupervisor(userRoles.includes('supervisor') || userRoles.includes('admin'));
    }
    setLoading(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, isAdmin, isSupervisor, hasRole, loading, refetch: fetchRoles };
}
