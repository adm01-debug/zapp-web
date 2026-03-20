import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'supervisor' | 'agent')[];
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles,
  requiredPermission,
  fallback 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading, hasRole } = useUserRole();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const loading = authLoading || rolesLoading;

  useEffect(() => {
    if (!loading && user && requiredPermission) {
      let cancelled = false;
      const timeoutId = setTimeout(() => {
        if (!cancelled && hasPermission === null) {
          console.error('ProtectedRoute: permission check timed out after 10s');
          setHasPermission(false);
        }
      }, 10000);

      // Check permission via database function
      import('@/integrations/supabase/client').then(({ supabase }) => {
        return supabase.rpc('user_has_permission', {
          _user_id: user.id,
          _permission_name: requiredPermission
        }).then(({ data }) => {
          if (!cancelled) {
            setHasPermission(data === true);
          }
        });
      }).catch((err) => {
        console.error('ProtectedRoute: permission check failed:', err);
        if (!cancelled) {
          setHasPermission(false);
        }
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    } else if (!requiredPermission) {
      setHasPermission(true);
    }
  }, [loading, user, requiredPermission]);

  if (loading || (requiredPermission && hasPermission === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to="/" replace />;
    }
  }

  // Check required permission
  if (requiredPermission && !hasPermission) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string
) {
  return function PermissionWrapper(props: P) {
    return (
      <ProtectedRoute requiredPermission={permission}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
