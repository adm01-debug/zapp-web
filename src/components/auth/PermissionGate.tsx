import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRole } from '@/hooks/useUserRole';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  roles?: ('admin' | 'supervisor' | 'agent')[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback = null,
  showLoading = false
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading: permLoading } = usePermissions();
  const { hasRole, loading: roleLoading } = useUserRole();

  const loading = permLoading || roleLoading;

  if (loading && showLoading) {
    return (
      <div className="animate-pulse bg-muted rounded h-8 w-full" />
    );
  }

  if (loading) {
    return null;
  }

  // Check roles first if specified
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      if (!hasAllPermissions(permissions)) {
        return <>{fallback}</>;
      }
    } else {
      if (!hasAnyPermission(permissions)) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
}

// HOC version
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate 
        permission={permission} 
        fallback={FallbackComponent ? <FallbackComponent /> : null}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}
