import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type InstalledModuleState = {
  id?: string;
  moduleId: string;
  name: string;
  status: "installed" | "enabled" | "disabled" | "blocked";
  manifestVersion: string;
  repositoryUrl: string;
  ref: string;
  commit?: string;
  installPath?: string;
  manifestPath?: string;
  routes?: {
    path?: string;
    href?: string;
    label: string;
    detail?: string;
    icon?: string;
    sidebarSection?: string;
    requiredPermissions?: string[];
  }[];
  permissions?: string[];
  setupChecklist?: string[];
  setupCompleted?: string[];
  installedAt?: string;
  updatedAt?: string;
  enabledAt?: string;
  disabledAt?: string;
};

export type ShinNodeState = {
  nodeId: string;
  organization: {
    id: string;
    name: string;
    type: string;
  };
  platformVersion: string;
  installedModules: InstalledModuleState[];
};

export type ActiveUserContext = {
  userId: string;
  displayName: string;
  role: "administrator" | "clinician" | "lab-manager" | "front-desk" | "auditor";
  permissions: string[];
};

export const activeUserRoles = ["administrator", "clinician", "lab-manager", "front-desk", "auditor"] as const;

export const roleLabels: Record<ActiveUserContext["role"], string> = {
  administrator: "Administration",
  clinician: "Clinical Team",
  "lab-manager": "Lab Operations",
  "front-desk": "Front Desk",
  auditor: "Audit & Compliance",
};

export const roleProfiles: Record<ActiveUserContext["role"], Omit<ActiveUserContext, "role">> = {
  administrator: {
    userId: "user-local-admin",
    displayName: "Node Administrator",
    permissions: [
      "patient.read",
      "provider.read",
      "facility.read",
      "audit.read",
      "event.read",
      "module.manage",
    ],
  },
  clinician: {
    userId: "user-local-clinician",
    displayName: "Clinical Team",
    permissions: [
      "patient.read",
      "provider.read",
      "ehr.read",
      "lab.read",
      "scheduling.read",
      "event.read",
    ],
  },
  "lab-manager": {
    userId: "user-local-lab-manager",
    displayName: "Lab Manager",
    permissions: ["patient.read", "provider.read", "lab.read", "lab.review", "event.read"],
  },
  "front-desk": {
    userId: "user-local-front-desk",
    displayName: "Front Desk",
    permissions: ["patient.read", "provider.read", "scheduling.read"],
  },
  auditor: {
    userId: "user-local-auditor",
    displayName: "Compliance Auditor",
    permissions: ["audit.read", "event.read"],
  },
};

export function getWorkspaceRoot(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "frontend" && path.basename(path.resolve(cwd, "..")) === "shin") {
    return path.resolve(cwd, "..", "..");
  }
  if (path.basename(cwd) === "shin") {
    return path.resolve(cwd, "..");
  }
  let current = cwd;
  while (true) {
    if (existsSync(path.join(current, "shin")) && existsSync(path.join(current, "shin-ehr"))) {
      return current;
    }
    const parent = path.resolve(current, "..");
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return cwd;
}

export function getShinNodeStateDir(): string {
  if (process.env.VITEST) {
    return path.join(process.cwd(), ".shin-node");
  }
  const workspaceRoot = getWorkspaceRoot();
  return path.join(workspaceRoot, "shin", ".shin-node");
}

export function getShinDir(): string {
  if (process.env.VITEST) {
    return process.cwd();
  }
  const workspaceRoot = getWorkspaceRoot();
  return path.join(workspaceRoot, "shin");
}

export function isActiveUserRole(role: string): role is ActiveUserContext["role"] {
  return activeUserRoles.includes(role as ActiveUserContext["role"]);
}

function activeRoleFromLocalState(): ActiveUserContext["role"] | null {
  const rolePath = path.join(getShinNodeStateDir(), "active-role.json");

  if (!existsSync(rolePath)) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(rolePath, "utf8")) as { role?: string };

    return payload.role && isActiveUserRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}

function activeRoleFromEnvironment(): ActiveUserContext["role"] {
  const role = process.env.SHIN_ACTIVE_ROLE;

  if (role && isActiveUserRole(role)) {
    return role;
  }

  return "administrator";
}

const fallbackState: ShinNodeState = {
  nodeId: "shin-node-local",
  organization: {
    id: "org-local",
    name: "Healthcare Organization",
    type: "other",
  },
  platformVersion: "0.1.0",
  installedModules: [],
};

export function getShinNodeState(): ShinNodeState {
  const statePath = path.join(getShinNodeStateDir(), "state.json");

  if (!existsSync(statePath)) {
    return fallbackState;
  }

  try {
    return JSON.parse(readFileSync(statePath, "utf8")) as ShinNodeState;
  } catch {
    return fallbackState;
  }
}

export function getEnabledModules(): InstalledModuleState[] {
  return getShinNodeState().installedModules.filter((module) => module.status === "enabled");
}


export function getActiveUserContext(): ActiveUserContext {
  const role = activeRoleFromLocalState() ?? activeRoleFromEnvironment();
  const profile = roleProfiles[role];

  return { ...profile, role };
}

export function canAccess(user: ActiveUserContext, requiredPermissions: string[] = []): boolean {
  if (user.role === "administrator" && user.permissions.includes("module.manage")) {
    return true;
  }

  return requiredPermissions.every((permission) => user.permissions.includes(permission));
}
