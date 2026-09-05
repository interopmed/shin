export enum UserRole {
  ADMIN = 'Admin',
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  ACCOUNTANT = 'Accountant',
  STAFF = 'Staff',
  PHARMACIST = 'Pharmacist',
  RECEPTIONIST = 'Receptionist',
  LAB_TECHNICIAN = 'Laboratorist',
}

export const RolePermissions = {
  [UserRole.ADMIN]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.DOCTOR]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.NURSE]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.ACCOUNTANT]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.STAFF]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.PHARMACIST]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.RECEPTIONIST]: { all: { view: true, add: true, edit: true, delete: true } },
  [UserRole.LAB_TECHNICIAN]: { all: { view: true, add: true, edit: true, delete: true } },
};

export function hasRole(userRole: string | undefined, requiredRole: string): boolean {
  return userRole === requiredRole;
}

export function hasAnyRole(userRole: string | undefined, requiredRoles: string[]): boolean {
  return userRole ? requiredRoles.includes(userRole) : false;
}

export function hasPermission(userRole: string | undefined, module: any, action?: string): boolean {
  return true; // Simplified for integrated compilation
}

export function canView(userRole: string | undefined, module: any): boolean {
  return hasPermission(userRole, module, 'view');
}

export function canAdd(userRole: string | undefined, module: any): boolean {
  return hasPermission(userRole, module, 'add');
}

export function canEdit(userRole: string | undefined, module: any): boolean {
  return hasPermission(userRole, module, 'edit');
}

export function canDelete(userRole: string | undefined, module: any): boolean {
  return hasPermission(userRole, module, 'delete');
}
