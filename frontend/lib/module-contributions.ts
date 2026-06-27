import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { canAccess, getActiveUserContext, getEnabledModules, getShinNodeState } from "./node-state";
import type { ActiveUserContext, InstalledModuleState } from "./node-state";

export type ModuleNavItem = {
  label: string;
  path?: string;
  href: string;
  detail?: string;
  icon?: string;
  sidebarSection?: string;
  requiredPermissions?: string[];
};

export type ModuleContribution = {
  moduleId: string;
  label: string;
  navItems: ModuleNavItem[];
  dashboardSections: {
    title: string;
    description?: string;
    href?: string;
    requiredPermissions?: string[];
    widgets: {
      label: string;
      value: string;
      detail: string;
      tone?: "default" | "success" | "warning" | "critical";
      href?: string;
      requiredPermissions?: string[];
    }[];
  }[];
  dashboardCards: {
    label: string;
    value: string;
    detail: string;
    tone?: "default" | "success" | "warning" | "critical";
    href?: string;
    requiredPermissions?: string[];
  }[];
  alerts: {
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    href?: string;
    requiredPermissions?: string[];
  }[];
  notifications: {
    title: string;
    body: string;
    href?: string;
    requiredPermissions?: string[];
  }[];
  quickActions: {
    label: string;
    href: string;
    requiredPermissions?: string[];
  }[];
};

type ModuleManifest = {
  moduleId: string;
  name: string;
  version?: string;
  description?: string;
  permissions?: string[];
  routes?: {
    path?: string;
    href?: string;
    label: string;
    detail?: string;
    icon?: string;
    sidebarSection?: string;
    requiredPermissions?: string[];
  }[];
  dashboard?: {
    cards?: {
      label: string;
      value: string;
      detail: string;
      tone?: "default" | "success" | "warning" | "critical";
      href?: string;
      requiredPermissions?: string[];
    }[];
    sections?: {
      title: string;
      description?: string;
      href?: string;
      requiredPermissions?: string[];
      widgets?: {
        label: string;
        value: string;
        detail: string;
        tone?: "default" | "success" | "warning" | "critical";
        href?: string;
        requiredPermissions?: string[];
      }[];
    }[];
    alerts?: {
      severity: "info" | "warning" | "critical";
      title: string;
      body: string;
      href?: string;
      requiredPermissions?: string[];
    }[];
    notifications?: {
      title: string;
      body: string;
      href?: string;
      requiredPermissions?: string[];
    }[];
    quickActions?: {
      label: string;
      href: string;
      requiredPermissions?: string[];
    }[];
  };
  setupChecklist?: string[];
};

function readManifest(module: InstalledModuleState): ModuleManifest {
  if (!module.manifestPath) {
    return module;
  }

  const manifestPath = path.join(process.cwd(), module.manifestPath);
  if (!existsSync(manifestPath)) {
    return module;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as ModuleManifest;
  } catch {
    return module;
  }
}

function moduleReadPermissions(module: InstalledModuleState, manifest: ModuleManifest): string[] {
  const permissions = manifest.permissions ?? module.permissions ?? [];
  const readPermissions = permissions.filter((permission) => permission.endsWith(".read"));

  return readPermissions.length > 0 ? readPermissions : [];
}

function contributionFromModule(module: InstalledModuleState): ModuleContribution {
  const manifest = readManifest(module);
  const moduleHref = manifest.routes?.[0]?.href ?? manifest.routes?.[0]?.path ?? `/modules/${module.moduleId}`;
  const readPermissions = moduleReadPermissions(module, manifest);
  const navItems = (manifest.routes ?? module.routes ?? []).map((route) => ({
    label: route.label,
    href: route.href ?? route.path ?? moduleHref,
    detail: route.detail,
    icon: route.icon,
    sidebarSection: route.sidebarSection,
    requiredPermissions: route.requiredPermissions ?? readPermissions,
  }));

  const setupNotifications =
    (manifest.setupChecklist ?? module.setupChecklist ?? []).length > (module.setupCompleted ?? []).length
      ? [
          {
            title: `${manifest.name ?? module.name} setup pending`,
            body: "Complete the module setup checklist before using it in production.",
            href: moduleHref,
            requiredPermissions: readPermissions,
          },
        ]
      : [];

  return {
    moduleId: module.moduleId,
    label: manifest.name ?? module.name,
    navItems,
    dashboardSections:
      manifest.dashboard?.sections?.map((section) => ({
        ...section,
        widgets: section.widgets ?? [],
      })) ?? [],
    dashboardCards:
      manifest.dashboard?.cards?.map((card) => ({
        requiredPermissions: readPermissions,
        href: moduleHref,
        ...card,
      })) ?? [
        {
          label: manifest.name ?? module.name,
          value: module.status,
          detail: manifest.description ?? `Installed from ${module.repositoryUrl}`,
          href: moduleHref,
          requiredPermissions: readPermissions,
        },
      ],
    alerts:
      manifest.dashboard?.alerts?.map((alert) => ({
        requiredPermissions: readPermissions,
        href: moduleHref,
        ...alert,
      })) ?? [],
    notifications: [
      ...setupNotifications,
      ...(manifest.dashboard?.notifications?.map((notification) => ({
        requiredPermissions: readPermissions,
        href: moduleHref,
        ...notification,
      })) ?? []),
    ],
    quickActions:
      manifest.dashboard?.quickActions?.map((action) => ({
        requiredPermissions: readPermissions,
        ...action,
      })) ?? [{ label: `Open ${manifest.name ?? module.name}`, href: moduleHref, requiredPermissions: readPermissions }],
  };
}

function filterContribution(contribution: ModuleContribution, user: ActiveUserContext): ModuleContribution {
  return {
    ...contribution,
    navItems: contribution.navItems.filter((item) => canAccess(user, item.requiredPermissions)),
    dashboardSections: contribution.dashboardSections
      .filter((section) => canAccess(user, section.requiredPermissions))
      .map((section) => ({
        ...section,
        widgets: section.widgets.filter((widget) => canAccess(user, widget.requiredPermissions)),
      }))
      .filter((section) => section.widgets.length > 0),
    dashboardCards: contribution.dashboardCards.filter((card) => canAccess(user, card.requiredPermissions)),
    alerts: contribution.alerts.filter((alert) => canAccess(user, alert.requiredPermissions)),
    notifications: contribution.notifications.filter((notification) => canAccess(user, notification.requiredPermissions)),
    quickActions: contribution.quickActions.filter((action) => canAccess(user, action.requiredPermissions)),
  };
}

export function getVisibleModuleContributions(options: { includeInstalled?: boolean } = {}): ModuleContribution[] {
  const user = getActiveUserContext();
  const modules = options.includeInstalled
    ? getShinNodeState().installedModules.filter((module) => module.status === "installed" || module.status === "enabled" || module.status === "disabled")
    : getEnabledModules();

  return modules
    .map(contributionFromModule)
    .map((contribution) => filterContribution(contribution, user))
    .filter(
      (contribution) =>
        contribution.navItems.length > 0 ||
        contribution.dashboardSections.length > 0 ||
        contribution.dashboardCards.length > 0 ||
        contribution.alerts.length > 0 ||
        contribution.notifications.length > 0 ||
        contribution.quickActions.length > 0
    );
}
