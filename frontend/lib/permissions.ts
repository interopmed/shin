// ─────────────────────────────────────────────────────────────────────────────
// permissions.ts — HIPAA / GDPR Compliant Role-Based Access Control
//
// HIPAA §164.502(b) Minimum Necessary: each role has only the permissions
// required for their specific clinical or administrative function.
//
// GDPR Art. 5(1)(c) Data Minimisation: Front Desk and Billing receive
// demographics only (patient.read without phi.read).
// ─────────────────────────────────────────────────────────────────────────────

export type EHRRole =
  | "system-admin"
  | "doctor"
  | "nurse"
  | "lab-technician"
  | "pharmacist"
  | "radiologist"
  | "front-desk"
  | "billing-officer"
  | "auditor"
  | "medical-records"
  | "ward-manager"
  | "hr-officer";

export type ActiveUserContext = {
  userId: string;
  displayName: string;
  role: EHRRole;
  permissions: string[];
};

export const activeUserRoles: EHRRole[] = [
  "system-admin", "doctor", "nurse", "lab-technician", "pharmacist",
  "radiologist", "front-desk", "billing-officer", "auditor",
  "medical-records", "ward-manager", "hr-officer",
];

export const roleLabels: Record<EHRRole, string> = {
  "system-admin": "System Administrator",
  "doctor": "Doctor",
  "nurse": "Nurse",
  "lab-technician": "Lab Technician",
  "pharmacist": "Pharmacist",
  "radiologist": "Radiologist",
  "front-desk": "Front Desk",
  "billing-officer": "Billing Officer",
  "auditor": "Auditor",
  "medical-records": "Medical Records",
  "ward-manager": "Ward Manager",
  "hr-officer": "HR Officer",
};

/** Accent colour for role badge chips in the UI */
export const roleBadgeColor: Record<EHRRole, string> = {
  "system-admin": "#6366f1",
  "doctor": "#0ea5e9",
  "nurse": "#10b981",
  "lab-technician": "#f59e0b",
  "pharmacist": "#8b5cf6",
  "radiologist": "#3b82f6",
  "front-desk": "#06b6d4",
  "billing-officer": "#f97316",
  "auditor": "#64748b",
  "medical-records": "#84cc16",
  "ward-manager": "#14b8a6",
  "hr-officer": "#ec4899",
};

// ─── Permission Sets ─────────────────────────────────────────────────────────
//
// phi.read            — Full patient PHI (notes, diagnoses, history)
// patient.read        — Patient record (demographics + assigned data)
// patient.write       — Create/update patient records
// lab.read/write/review — Lab orders and results
// pharmacy.read/write — Prescriptions and dispensing
// imaging.read        — Radiology orders and reports
// scheduling.read/write — Appointments
// billing.read/write  — Invoices, claims, finance
// audit.read          — Audit log (read-only)
// event.read          — Event stream
// records.read/write  — Medical record management
// staff.read/write    — HR/employee records
// ward.read/manage    — Ward and bed management
// provider.read       — Clinical staff directory
// facility.read       — Facility and department info
// module.manage       — Install/configure platform modules
// identity.manage     — User and role management (IAM)
// settings.read/write — System-wide configuration
//
// ─────────────────────────────────────────────────────────────────────────────

export const roleProfiles: Record<EHRRole, Omit<ActiveUserContext, "role">> = {

  // System admin manages platform infra ONLY — zero PHI (HIPAA separation of duty)
  "system-admin": {
    userId: "user-system-admin",
    displayName: "System Administrator",
    permissions: [
      "audit.read", "event.read",
      "staff.read", "staff.write",
      "provider.read",
      "facility.read",
      "module.manage",
      "identity.manage",
      "settings.read", "settings.write",
    ],
  },

  // Doctor — full clinical access, primary PHI custodian
  "doctor": {
    userId: "user-doctor",
    displayName: "Doctor",
    permissions: [
      "phi.read",
      "ward.read",
    ],
  },

  // Nurse — PHI scoped to patient care delivery for assigned ward/unit patients
  "nurse": {
    userId: "user-nurse",
    displayName: "Nurse",
    permissions: [
      "phi.read",
      "ward.read",
      "provider.read",
    ],
  },

  // Lab Tech — patient.read without phi.read = name+DOB only (GDPR data minimisation)
  "lab-technician": {
    userId: "user-lab",
    displayName: "Lab Technician",
    permissions: [
      "patient.read",
      "lab.read", "lab.write", "lab.review",
    ],
  },

  // Pharmacist — prescription dispensing and stock management
  "pharmacist": {
    userId: "user-pharmacist",
    displayName: "Pharmacist",
    permissions: [
      "pharmacy.read", "pharmacy.write",
      "provider.read",
    ],
  },

  // Radiologist — imaging orders, reports, and diagnostic studies
  "radiologist": {
    userId: "user-radiologist",
    displayName: "Radiologist",
    permissions: [
      "imaging.read",
      "imaging.write",
      "imaging.review",
      "provider.read",
    ],
  },

  // Front Desk — registration + scheduling ONLY, no clinical data (GDPR purpose limitation)
  "front-desk": {
    userId: "user-frontdesk",
    displayName: "Front Desk",
    permissions: [
      "patient.read",
      "patient.write",
      "scheduling.read", "scheduling.write",
      "provider.read",
    ],
  },

  // Billing — demographics + ICD codes, no narrative notes (GDPR data minimisation)
  "billing-officer": {
    userId: "user-billing",
    displayName: "Billing Officer",
    permissions: [
      "patient.read",
      "billing.read", "billing.write",
    ],
  },

  // Auditor — read-only governance access, zero patient data (HIPAA compliance monitoring)
  "auditor": {
    userId: "user-auditor",
    displayName: "Auditor",
    permissions: [
      "audit.read",
      "event.read",
    ],
  },

  // Medical Records — manages full health record lifecycle, full PHI access
  "medical-records": {
    userId: "user-records",
    displayName: "Medical Records Officer",
    permissions: [
      "phi.read",
      "patient.read",
      "records.read", "records.write",
      "lab.read",
      "imaging.read",
      "provider.read",
    ],
  },

  // Ward Manager — operational oversight, PHI for care coordination
  "ward-manager": {
    userId: "user-ward",
    displayName: "Ward Manager",
    permissions: [
      "phi.read",
      "patient.read",
      "ward.read", "ward.manage",
      "staff.read",
      "provider.read",
      "facility.read",
    ],
  },

  // HR Officer — staff data ONLY, zero patient access
  "hr-officer": {
    userId: "user-hr",
    displayName: "HR Officer",
    permissions: [
      "staff.read", "staff.write",
    ],
  },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

export function isActiveUserRole(role: string): role is EHRRole {
  return activeUserRoles.includes(role as EHRRole);
}

/**
 * HIPAA-aware access check.
 * System admin's module.manage does NOT bypass clinical access —
 * admin is explicitly locked out of PHI by design.
 */
export function canAccess(user: ActiveUserContext, requiredPermissions: string[] = []): boolean {
  if (requiredPermissions.length === 0) return true;
  const perms = user?.permissions ?? [];
  return requiredPermissions.every((p) => perms.includes(p));
}

/**
 * Data-scope check for Service Unit assignments.
 * Validates if the user is assigned to the patient's unit or care team.
 */
export function canAccessPatient(
  userScope: { unit_ids?: number[]; employee_id?: number | null } | undefined,
  patientUnitId: number,
  patientCareEmployeeIds: number[] = []
): boolean {
  if (!userScope) return false;
  if (userScope.unit_ids && userScope.unit_ids.includes(patientUnitId)) return true;
  if (userScope.employee_id && patientCareEmployeeIds.includes(userScope.employee_id)) return true;
  return false;
}

/**
 * Maps identity_role.name (from Django backend) to EHRRole key.
 */
export function mapRoleToProfile(backendRole?: string): EHRRole {
  switch (backendRole) {
    case "System Administrator": return "system-admin";
    case "Administrator": return "system-admin";
    case "Admin": return "system-admin";
    case "Doctor": return "doctor";
    case "Nurse": return "nurse";
    case "Lab Technician": return "lab-technician";
    case "Laboratorist": return "lab-technician";
    case "Pharmacist": return "pharmacist";
    case "Radiologist": return "radiologist";
    case "Front Desk": return "front-desk";
    case "Billing Officer": return "billing-officer";
    case "Auditor": return "auditor";
    case "Medical Records Officer": return "medical-records";
    case "Ward Manager": return "ward-manager";
    case "HR Officer": return "hr-officer";
    default: return "front-desk"; // safe minimum fallback
  }
}

/**
 * Builds a full ActiveUserContext from the JWT token payload.
 * This drives all frontend RBAC decisions.
 */
export function createActiveUserFromToken(
  backendUser?: { username?: string; role?: string }
): ActiveUserContext {
  const mappedRole = mapRoleToProfile(backendUser?.role);
  return {
    ...roleProfiles[mappedRole],
    role: mappedRole,
    displayName: backendUser?.username || "Guest",
    userId: backendUser?.username || "guest",
  };
}
