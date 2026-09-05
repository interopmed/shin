import { useAuth } from './useAuth';
import { hasRole, hasAnyRole, hasPermission, canView, canAdd, canEdit, canDelete, UserRole } from '@/lib/roles';
import type { RolePermissions } from '@/lib/roles';

export const usePermissions = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    // Role checking
    hasRole: (requiredRole: UserRole) => hasRole(userRole, requiredRole),
    hasAnyRole: (requiredRoles: UserRole[]) => hasAnyRole(userRole, requiredRoles),
    
    // Permission checking
    hasPermission: (
      module: string,
      action?: 'view' | 'add' | 'edit' | 'delete'
    ) => hasPermission(userRole, module, action),
    
    // Convenience methods
    canView: (module: string) => canView(userRole, module),
    canAdd: (module: string) => canAdd(userRole, module),
    canEdit: (module: string) => canEdit(userRole, module),
    canDelete: (module: string) => canDelete(userRole, module),
    
    // Current user role
    role: userRole,
    isAdmin: hasRole(userRole, UserRole.ADMIN),
    isDoctor: hasRole(userRole, UserRole.DOCTOR),
    isNurse: hasRole(userRole, UserRole.NURSE),
    isAccountant: hasRole(userRole, UserRole.ACCOUNTANT),
    isStaff: hasRole(userRole, UserRole.STAFF),
    isPharmacist: hasRole(userRole, UserRole.PHARMACIST),
    isReceptionist: hasRole(userRole, UserRole.RECEPTIONIST),
    isLabTechnician: hasRole(userRole, UserRole.LAB_TECHNICIAN),
  };
};
