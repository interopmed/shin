import { getVisibleModuleContributions } from "./module-contributions";
import { canAccess, getActiveUserContext } from "./node-state";

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

export function getNavigationGroups(): NavigationGroup[] {
  const user = getActiveUserContext();
  const moduleContributions = getVisibleModuleContributions();
  const moduleItemsForSection = (section: string) =>
    moduleContributions.flatMap((contribution) =>
      contribution.navItems
        .filter((item) => item.sidebarSection === section)
        .map((item) => ({
          label: item.label,
          href: item.href,
          detail: item.detail ?? contribution.label,
          icon: item.icon ?? "module",
        }))
    );
  const installedGroups = moduleContributions
    .map((contribution) => ({
      ...contribution,
      navItems: contribution.navItems.filter((item) => !item.sidebarSection),
    }))
    .filter((contribution) => contribution.navItems.length > 0)
    .map((contribution) => ({
      label: contribution.label,
      items: contribution.navItems.map((item) => ({
        label: item.label,
        href: item.href,
        detail: item.detail ?? "Module route",
        icon: item.icon ?? "module",
      })),
    }));

  return [
    {
      label: "Institute",
      items: [
        { label: "Dashboard", href: "/dashboard", detail: "Command center", icon: "dashboard" },
        ...(canAccess(user, ["facility.read"]) ? [{ label: "Facilities", href: "/facilities", detail: "Sites and locations", icon: "building" }] : []),
      ],
    },
    ...(canAccess(user, ["patient.read"])
      ? [
          {
            label: "Patients",
            items: [
              { label: "MPI", href: "/patients/mpi", detail: "Master patient index", icon: "activity" },
              ...moduleItemsForSection("Patients"),
            ],
          },
        ]
      : []),
    {
      label: "Foundation",
      items: [
        { label: "Identity & Access", href: "/foundation/identitywork", detail: "RBAC and users", icon: "shield" },
        { label: "Master Provider Index", href: "/foundation/providers", detail: "Provider registry", icon: "users" },
        { label: "Terminology Mapping", href: "/foundation/terminology", detail: "Code translations", icon: "file" },
        { label: "Integration Gateway", href: "/foundation/integration", detail: "HL7/FHIR route monitor", icon: "activity" },
        ...(canAccess(user, ["audit.read"]) ? [{ label: "Audit Log", href: "/foundation/audit", detail: "Governance trail", icon: "activity" }] : []),
        ...(canAccess(user, ["event.read"]) ? [{ label: "Events", href: "/foundation/events", detail: "Event stream", icon: "bell" }] : []),
        ...moduleItemsForSection("Foundation"),
      ],
    },
    ...installedGroups,
    {
      label: "Administration",
      items: [
        ...(canAccess(user, ["module.manage"]) ? [{ label: "Module Registry", href: "/modules", detail: "Install and enable", badge: "Admin", icon: "module" }] : []),
        { label: "Settings", href: "/settings", detail: "Organization setup", icon: "settings" },
      ],
    },
  ];
}
