import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import registry from "../config/approved-modules.json";
import { applyModuleMigrations, type ModuleDatabaseManifest } from "./module-db";
import type { InstalledModuleState, ShinNodeState } from "./node-state";

type ApprovedSource = {
  moduleId: string;
  repositoryUrl: string;
  allowedRefs: string[];
  defaultRef?: string;
  status: string;
};

type ModuleManifest = {
  moduleId: string;
  name: string;
  version: string;
  repositoryUrl: string;
  dependencies?: string[];
  routes?: InstalledModuleState["routes"];
  permissions?: string[];
  setupChecklist?: string[];
} & ModuleDatabaseManifest;

function getWorkspaceRoot(): string {
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

const workspaceRoot = getWorkspaceRoot();
const stateDir = path.join(workspaceRoot, "shin", ".shin-node");
const statePath = path.join(stateDir, "state.json");
const modulesDir = path.join(stateDir, "modules");

const actor = {
  actorId: "shin-node-ui",
  actorType: "system",
  display: "SHIN Node UI",
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToApp(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function assertPathInside(parentDir: string, childPath: string) {
  const relative = path.relative(parentDir, childPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${relativeToApp(parentDir)}: ${childPath}`);
  }
}

function defaultState(): ShinNodeState & { audit: unknown[]; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();

  return {
    nodeId: "shin-node-local",
    organization: {
      id: "org-local",
      name: "Local Healthcare Organization",
      type: "other",
    },
    platformVersion: registry.platformVersion,
    installedModules: [],
    audit: [],
    createdAt: now,
    updatedAt: now,
  };
}

function loadState() {
  if (!existsSync(statePath)) {
    return defaultState();
  }

  return readJson<ReturnType<typeof defaultState>>(statePath);
}

function saveState(state: ReturnType<typeof defaultState>) {
  mkdirSync(stateDir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
}

function addAudit(state: ReturnType<typeof defaultState>, action: string, details = {}) {
  state.audit.push({
    id: `audit-${state.audit.length + 1}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
  });
}

function moduleInstallPaths(moduleId: string) {
  const moduleDir = path.join(modulesDir, moduleId);
  const repoDir = path.join(moduleDir, "repo");
  const manifestPath = path.join(moduleDir, "interopmed.module.json");

  assertPathInside(modulesDir, moduleDir);
  assertPathInside(modulesDir, repoDir);
  assertPathInside(modulesDir, manifestPath);

  return { moduleDir, repoDir, manifestPath };
}

function findApprovedSource(manifest: ModuleManifest) {
  return (registry.approvedSources as ApprovedSource[]).find(
    (source) =>
      source.moduleId === manifest.moduleId &&
      source.repositoryUrl === manifest.repositoryUrl &&
      source.status === "approved"
  );
}

function resolveRef(source: ApprovedSource, requestedRef?: string) {
  const ref = requestedRef ?? source.defaultRef ?? source.allowedRefs.find((allowedRef) => !allowedRef.startsWith("v")) ?? source.allowedRefs[0];

  if (!ref || (!source.allowedRefs.includes(ref) && !source.allowedRefs.includes("*"))) {
    throw new Error(`Ref ${ref ?? "(none)"} is not approved for ${source.moduleId}`);
  }

  return ref;
}

function missingDependencies(state: ReturnType<typeof defaultState>, manifest: ModuleManifest) {
  const installedIds = new Set(
    state.installedModules
      .filter((installed) => ["installed", "enabled"].includes(installed.status))
      .map((installed) => installed.moduleId)
  );

  return (manifest.dependencies ?? []).filter((moduleId) => !installedIds.has(moduleId));
}

export async function installModule(moduleId: string, requestedRef?: string) {
  const manifest = (registry.manifests as ModuleManifest[]).find((candidate) => candidate.moduleId === moduleId);
  if (!manifest) {
    throw new Error(`No approved manifest found for module: ${moduleId}`);
  }

  const source = findApprovedSource(manifest);
  if (!source) {
    throw new Error(`Repository is not approved for module ${moduleId}: ${manifest.repositoryUrl}`);
  }

  const state = loadState();
  const missing = missingDependencies(state, manifest);
  if (missing.length > 0) {
    throw new Error(`Missing module dependencies for ${moduleId}: ${missing.join(", ")}`);
  }

  const ref = resolveRef(source, requestedRef);
  const { moduleDir, repoDir, manifestPath } = moduleInstallPaths(moduleId);
  mkdirSync(moduleDir, { recursive: true });
  if (existsSync(repoDir)) {
    const oldDir = `${repoDir}_old_${Date.now()}`;
    try {
      renameSync(repoDir, oldDir);
      try {
        rmSync(oldDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore background cleanup failures if files are locked by the dev server watchpack
      }
    } catch (e) {
      // Fallback if renaming is blocked
      rmSync(repoDir, { recursive: true, force: true });
    }
  }

  let cloneUrl = manifest.repositoryUrl;
  if (cloneUrl.startsWith("..")) {
    cloneUrl = path.resolve(workspaceRoot, cloneUrl.replace(/^\.\.\//, ""));
  }

  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, cloneUrl, repoDir], {
    cwd: process.cwd(),
    stdio: "ignore",
  });

  const installedManifest = readJson<ModuleManifest>(path.join(repoDir, "interopmed.module.json"));
  if (installedManifest.moduleId !== manifest.moduleId || installedManifest.repositoryUrl !== manifest.repositoryUrl) {
    throw new Error(`Installed manifest does not match approved module ${moduleId}`);
  }

  writeJson(manifestPath, installedManifest);
  await applyModuleMigrations({ moduleId, moduleRoot: repoDir, manifest: installedManifest });
  const commit = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
  const now = new Date().toISOString();
  const existing = state.installedModules.find((installed) => installed.moduleId === moduleId);
  const moduleState: InstalledModuleState = {
    id: existing?.id ?? `module-${moduleId}`,
    moduleId,
    name: installedManifest.name,
    manifestVersion: installedManifest.version,
    repositoryUrl: manifest.repositoryUrl,
    ref,
    commit,
    installPath: relativeToApp(repoDir),
    manifestPath: relativeToApp(manifestPath),
    status: "installed",
    routes: installedManifest.routes ?? [],
    permissions: installedManifest.permissions ?? [],
    setupChecklist: installedManifest.setupChecklist ?? [],
    setupCompleted: existing?.setupCompleted ?? [],
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    Object.assign(existing, moduleState);
  } else {
    state.installedModules.push(moduleState);
  }

  addAudit(state, "module-install", { moduleId, repositoryUrl: manifest.repositoryUrl, ref, commit });
  saveState(state);
}

export async function setModuleStatus(moduleId: string, status: "enabled" | "disabled") {
  const state = loadState();
  const moduleState = state.installedModules.find((installed) => installed.moduleId === moduleId);
  if (!moduleState) {
    throw new Error(`Module is not installed: ${moduleId}`);
  }

  if (status === "enabled" && moduleState.installPath && moduleState.manifestPath) {
    const repoDir = path.join(process.cwd(), moduleState.installPath);
    const manifest = readJson<ModuleManifest>(path.join(process.cwd(), moduleState.manifestPath));
    await applyModuleMigrations({ moduleId, moduleRoot: repoDir, manifest });
  }

  moduleState.status = status;
  moduleState.updatedAt = new Date().toISOString();
  if (status === "enabled") {
    moduleState.enabledAt = moduleState.updatedAt;
  } else {
    moduleState.disabledAt = moduleState.updatedAt;
  }

  addAudit(state, `module-${status}`, { moduleId });
  saveState(state);
}

export function uninstallModule(moduleId: string) {
  const state = loadState();
  const existing = state.installedModules.find((installed) => installed.moduleId === moduleId);
  if (!existing) {
    return;
  }

  const { moduleDir } = moduleInstallPaths(moduleId);
  if (existsSync(moduleDir)) {
    rmSync(moduleDir, { recursive: true, force: true });
  }

  state.installedModules = state.installedModules.filter((installed) => installed.moduleId !== moduleId);
  addAudit(state, "module-uninstall", { moduleId, installPath: existing.installPath });
  saveState(state);
}
