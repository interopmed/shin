import { canAccess, ActiveUserContext } from "./permissions";

export type NavigationGroup = {
  label: string;
  items: {
    label: string;
    href: string;
    detail?: string;
    badge?: string;
    icon?: string;
  }[];
};

/**
 * Returns navigation groups gated on the user's HIPAA/GDPR-scoped permissions.
 * Every section is individually gated — no role gets a superset.
 */
export function getNavigationGroups(user: ActiveUserContext): NavigationGroup[] {
  const groups: NavigationGroup[] = [];

  // ── Overview — always visible ─────────────────────────────────────────────
  groups.push({
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/", detail: "Command center", icon: "dashboard" },
    ],
  });

  // ── Patients ──────────────────────────────────────────────────────────────
  // patient.read required; phi.read unlocks MPI (full identity graph)
  if (canAccess(user, ["patient.read"])) {
    groups.push({
      label: "Patients",
      items: [
        { label: "Patient List", href: "/patients", detail: "Active patient records", icon: "users" },
        ...(canAccess(user, ["phi.read"])
          ? [{ label: "Master Patient Index", href: "/patients/mpi", detail: "Enterprise identity", icon: "activity" }]
          : []),
      ],
    });
  }

  // ── Clinical ──────────────────────────────────────────────────────────────
  // Only assembled if the user has at least one clinical permission
  const clinicalItems = [
    ...(canAccess(user, ["ward.read"])
      ? [{ label: "My Unit", href: "/unit", detail: "Assigned patients", icon: "users" }]
      : []),
    ...(canAccess(user, ["ward.read"])
      ? [{ label: "Admitted Patients", href: "/ward", detail: "Nursing station", icon: "activity" }]
      : []),
    ...(canAccess(user, ["scheduling.read"])
      ? [{ label: "Appointments", href: "/scheduling/appointment", detail: "Scheduling & visits", icon: "bell" }]
      : []),
    ...(canAccess(user, ["pharmacy.read"])
      ? [{ label: "Prescriptions", href: "/prescriptions", detail: "Medication orders", icon: "file" }]
      : []),
    ...(canAccess(user, ["phi.read"]) && canAccess(user, ["patient.read"])
      ? [{ label: "Care Teams", href: "/care-teams", detail: "Multidisciplinary teams", icon: "users" }]
      : []),
  ];
  if (clinicalItems.length > 0) {
    groups.push({ label: "Clinical", items: clinicalItems });
  }

  // ── Laboratory ────────────────────────────────────────────────────────────
  if (canAccess(user, ["lab.read"])) {
    const labItems = [];

    // Only those with lab.write (doctors, lab techs) see the Orders Queue
    if (canAccess(user, ["lab.write"])) {
      labItems.push({ label: "Orders Queue", href: "/lab/orders", detail: "Pending lab orders", icon: "file" });
    }

    // Everyone with lab.read sees Results
    labItems.push({ label: "Results", href: "/lab/reports", detail: "Reports & results", icon: "activity" });

    groups.push({
      label: "Laboratory",
      items: labItems,
    });
  }

  // ── Pharmacy / Stocks ─────────────────────────────────────────────────────
  if (canAccess(user, ["pharmacy.read"])) {
    groups.push({
      label: "Pharmacy",
      items: [
        { label: "Inventory", href: "/stocks", detail: "Medicines & supplies", icon: "activity" },
      ],
    });
  }

  // ── Finance ───────────────────────────────────────────────────────────────
  // billing-officer only
  if (canAccess(user, ["billing.read"])) {
    groups.push({
      label: "Finance",
      items: [
        { label: "Billing", href: "/billing/finance", detail: "Invoices & payments", icon: "activity" },
        { label: "Sales", href: "/billing/sales", detail: "Revenue reports", icon: "activity" },
      ],
    });
  }

  // ── Human Resources ───────────────────────────────────────────────────────
  // staff.read required; ward-manager and hr-officer only
  if (canAccess(user, ["staff.read"])) {
    groups.push({
      label: "Human Resources",
      items: [
        { label: "Staff Directory", href: "/human-resources/employees", detail: "All employees", icon: "users" },
        ...(canAccess(user, ["provider.read"])
          ? [{ label: "Providers", href: "/providers", detail: "Clinical staff & registry", icon: "users" }]
          : []),
      ],
    });
  }

  // ── Administration — system-admin ONLY ────────────────────────────────────
  // Deliberately no patient/PHI routes in this section.
  const adminItems = [
    ...(canAccess(user, ["settings.read"])
      ? [{ label: "Settings", href: "/settings", detail: "Organization setup", icon: "settings" }]
      : []),
    ...(canAccess(user, ["facility.read"]) && canAccess(user, ["settings.read"])
      ? [{ label: "Facilities", href: "/facilities", detail: "Sites & locations", icon: "building" }]
      : []),
    ...(canAccess(user, ["identity.manage"])
      ? [{ label: "Identity & Access", href: "/foundation/identitywork", detail: "RBAC and users", icon: "shield" }]
      : []),
    ...(canAccess(user, ["settings.read"])
      ? [
        { label: "Terminology", href: "/foundation/terminology", detail: "Code translations", icon: "file" },
        { label: "Integration Gateway", href: "/foundation/integration", detail: "HL7/FHIR routes", icon: "activity" },
      ]
      : []),
    ...(canAccess(user, ["audit.read"])
      ? [{ label: "Audit Log", href: "/foundation/audit", detail: "Governance trail", icon: "activity" }]
      : []),
    ...(canAccess(user, ["event.read"])
      ? [{ label: "Event Stream", href: "/foundation/events", detail: "System events", icon: "bell" }]
      : []),
  ];
  if (adminItems.length > 0) {
    groups.push({ label: "Administration", items: adminItems });
  }

  return groups;
}
