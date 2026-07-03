import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import registry from "../config/approved-modules.json";
import { applyModuleMigrations, type ModuleDatabaseManifest } from "./module-db";
import { getWorkspaceRoot, getShinNodeStateDir, type InstalledModuleState, type ShinNodeState } from "./node-state";

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

const workspaceRoot = getWorkspaceRoot();
const stateDir = getShinNodeStateDir();
const statePath = path.join(stateDir, "state.json");
const modulesDir = path.join(stateDir, "modules");
const shinDir = path.join(workspaceRoot, "shin");

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

function safeRenameSync(oldPath: string, newPath: string) {
  const maxRetries = 10;
  const delayMs = 100;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      renameSync(oldPath, newPath);
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const buf = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(buf, 0, 0, delayMs);
    }
  }
}

function safeRmSync(targetPath: string) {
  if (!existsSync(targetPath)) {
    return;
  }

  const maxRetries = 10;
  const delayMs = 100;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const makeWriteable = (p: string) => {
        try {
          const stats = lstatSync(p);
          if (stats.isDirectory()) {
            try {
              chmodSync(p, 0o777);
            } catch {}
            const children = readdirSync(p);
            for (const child of children) {
              makeWriteable(path.join(p, child));
            }
          } else {
            try {
              chmodSync(p, 0o666);
            } catch {}
          }
        } catch {}
      };
      makeWriteable(targetPath);

      rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const buf = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(buf, 0, 0, delayMs);
    }
  }
}

function relativeToApp(filePath: string) {
  return path.relative(shinDir, filePath).split(path.sep).join("/");
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
  const repoDir = path.join(moduleDir, `repo_${Date.now()}`);
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
  const existing = state.installedModules.find((installed) => installed.moduleId === moduleId);
  if (existing && existing.installPath) {
    const oldRepoDir = path.join(shinDir, existing.installPath);
    if (existsSync(oldRepoDir)) {
      const oldDir = `${oldRepoDir}_old_${Date.now()}`;
      try {
        safeRenameSync(oldRepoDir, oldDir);
        try {
          safeRmSync(oldDir);
        } catch (err) {
          // Ignore background cleanup failures
        }
      } catch (e) {
        try {
          safeRmSync(oldRepoDir);
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  let cloneUrl = manifest.repositoryUrl;
  if (cloneUrl.startsWith("..")) {
    cloneUrl = path.resolve(workspaceRoot, cloneUrl.replace(/^\.\.\//, ""));
  }

  try {
    execFileSync("git", ["clone", "--depth", "1", "--branch", ref, cloneUrl, repoDir], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.message;
    console.error(`Git clone failed for ${moduleId}: ${stderr}`);
    throw new Error(`Failed to clone repository for module ${moduleId}: ${stderr}`);
  }

  const installedManifest = readJson<ModuleManifest>(path.join(repoDir, "interopmed.module.json"));
  const getRepoName = (url: string) => url.split("/").pop()?.replace(/\.git$/, "").toLowerCase();
  if (installedManifest.moduleId !== manifest.moduleId || getRepoName(installedManifest.repositoryUrl) !== getRepoName(manifest.repositoryUrl)) {
    throw new Error(`Installed manifest does not match approved module ${moduleId}`);
  }

  writeJson(manifestPath, installedManifest);
  await applyModuleMigrations({ moduleId, moduleRoot: repoDir, manifest: installedManifest });
  const commit = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

  // Remove the .git directory to prevent file locking and nested git issues on Windows
  const gitDir = path.join(repoDir, ".git");
  safeRmSync(gitDir);

  const now = new Date().toISOString();
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
    const repoDir = path.join(shinDir, moduleState.installPath);
    const manifest = readJson<ModuleManifest>(path.join(shinDir, moduleState.manifestPath));
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
    try {
      safeRmSync(moduleDir);
    } catch (err) {
      // Ignore background cleanup failures on Windows if files are locked or permissions are restricted
    }
  }

  state.installedModules = state.installedModules.filter((installed) => installed.moduleId !== moduleId);
  addAudit(state, "module-uninstall", { moduleId, installPath: existing.installPath });
  saveState(state);
}
