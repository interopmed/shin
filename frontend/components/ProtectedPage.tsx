'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/roles';
import type { RolePermissions } from '@/lib/roles';

interface ProtectedPageProps {
  children: React.ReactNode;
  requireRoles?: UserRole[];
  requirePermission?: {
    module: keyof typeof RolePermissions[UserRole.ADMIN];
    action?: 'view' | 'add' | 'edit' | 'delete';
  };
  fallbackPath?: string;
}

export const ProtectedPage: React.FC<ProtectedPageProps> = ({
  children,
  requireRoles,
  requirePermission,
  fallbackPath = '/dashboard',
}) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasAnyRole, hasPermission } = usePermissions();

  useEffect(() => {
    if (!authLoading) {
      // Check if user is authenticated
      if (!user) {
        router.push('/login');
        return;
      }

      // Check role requirement
      if (requireRoles && !hasAnyRole(requireRoles)) {
        router.push(fallbackPath);
        return;
      }

      // Check permission requirement
      if (requirePermission && !hasPermission(requirePermission.module, requirePermission.action)) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [user, authLoading, requireRoles, requirePermission, fallbackPath, router, hasAnyRole, hasPermission]);

  // Show loading state
  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Show nothing while checking permissions (before redirect)
  if (!user) {
    return null;
  }

  // Check authorization
  if (requireRoles && !hasAnyRole(requireRoles)) {
    return null;
  }

  if (requirePermission && !hasPermission(requirePermission.module, requirePermission.action)) {
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
};
