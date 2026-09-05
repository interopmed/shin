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

export * from "./permissions";
import { ActiveUserContext, EHRRole, isActiveUserRole, roleProfiles } from "./permissions";

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

// isActiveUserRole is now in permissions.ts

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

function activeRoleFromEnvironment(): EHRRole {
  const role = process.env.SHIN_ACTIVE_ROLE;

  if (role && isActiveUserRole(role)) {
    return role;
  }

  return "system-admin";
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
  const profile = roleProfiles[role] ?? roleProfiles["system-admin"];
  const safeRole: EHRRole = roleProfiles[role] ? role : "system-admin";

  return { ...profile, role: safeRole };
}

// canAccess is now in permissions.ts
