#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const appDir = path.resolve(path.dirname(__filename), "..");
const stateDir = path.join(appDir, ".shin-node");
const statePath = path.join(stateDir, "state.json");
const modulesDir = path.join(stateDir, "modules");
const registryPath = path.join(appDir, "config", "approved-modules.json");
const { Client } = pg;

const actor = {
  actorId: "shin-node-cli",
  actorType: "system",
  display: "SHIN Node CLI",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function loadEnvFile(fileName) {
  const filePath = path.join(appDir, fileName);

  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[key.trim()] ??= value;
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToApp(filePath) {
  return path.relative(appDir, filePath).split(path.sep).join("/");
}

function assertPathInside(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${relativeToApp(parentDir)}: ${childPath}`);
  }
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function withDbClient(task) {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const connectionString = process.env.SHIN_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Set SHIN_DATABASE_URL before installing modules with database migrations.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await task(client);
  } finally {
    await client.end();
  }
}

async function applyModuleMigrations(moduleId, moduleRoot, manifest) {
  const migrations = manifest.database?.migrations ?? [];
  if (migrations.length === 0) {
    return [];
  }

  const applied = [];

  await withDbClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS shin_module_migrations (
        module_id TEXT NOT NULL,
        migration_path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (module_id, migration_path)
      )
    `);

    for (const migrationPath of migrations) {
      const fullPath = path.resolve(moduleRoot, migrationPath);
      assertPathInside(moduleRoot, fullPath);

      if (!existsSync(fullPath)) {
        throw new Error(`Module migration not found for ${moduleId}: ${migrationPath}`);
      }

      const sql = readFileSync(fullPath, "utf8");
      const sqlChecksum = checksum(sql);
      const existing = await client.query("SELECT checksum FROM shin_module_migrations WHERE module_id = $1 AND migration_path = $2", [
        moduleId,
        migrationPath,
      ]);

      if (existing.rowCount && existing.rows[0]?.checksum !== sqlChecksum) {
        throw new Error(`Module migration changed after being applied: ${moduleId}:${migrationPath}`);
      }

      if (existing.rowCount) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO shin_module_migrations (module_id, migration_path, checksum) VALUES ($1, $2, $3)", [
          moduleId,
          migrationPath,
          sqlChecksum,
        ]);
        await client.query("COMMIT");
        applied.push(migrationPath);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  });

  return applied;
}

function loadRegistry() {
  return readJson(registryPath);
}

function defaultState(registry) {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function loadState() {
  const registry = loadRegistry();
  if (!existsSync(statePath)) {
    return defaultState(registry);
  }

  return readJson(statePath);
}

function saveState(state) {
  mkdirSync(stateDir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
}

function parseArgs(argv) {
  const values = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item.startsWith("--")) {
      const key = item.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      values.push(item);
    }
  }

  return { values, flags };
}

function addAudit(state, action, details = {}) {
  state.audit.push({
    id: `audit-${state.audit.length + 1}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
  });
}

function findManifestByRepo(registry, repositoryUrl) {
  return registry.manifests.find((manifest) => manifest.repositoryUrl === repositoryUrl);
}

function findManifestById(registry, moduleId) {
  return registry.manifests.find((manifest) => manifest.moduleId === moduleId);
}

function findApprovedSource(registry, manifest) {
  return registry.approvedSources.find(
    (source) =>
      source.moduleId === manifest.moduleId &&
      source.repositoryUrl === manifest.repositoryUrl &&
      source.status === "approved"
  );
}

function findInstallState(state, moduleId) {
  return state.installedModules.find((installed) => installed.moduleId === moduleId);
}

function moduleInstallPaths(moduleId) {
  const moduleDir = path.join(modulesDir, moduleId);
  const repoDir = path.join(moduleDir, "repo");
  const manifestPath = path.join(moduleDir, "interopmed.module.json");

  assertPathInside(modulesDir, moduleDir);
  assertPathInside(modulesDir, repoDir);
  assertPathInside(modulesDir, manifestPath);

  return { moduleDir, repoDir, manifestPath };
}

function assertRefAllowed(source, ref) {
  if (!source.allowedRefs.includes(ref) && !source.allowedRefs.includes("*")) {
    throw new Error(`Ref ${ref} is not approved for ${source.moduleId}`);
  }
}

function missingDependencies(state, manifest) {
  const installedIds = new Set(
    state.installedModules
      .filter((installed) => ["installed", "enabled"].includes(installed.status))
      .map((installed) => installed.moduleId)
  );

  return (manifest.dependencies ?? []).filter((moduleId) => !installedIds.has(moduleId));
}

function cloneRepository(repositoryUrl, ref, repoDir) {
  assertPathInside(modulesDir, repoDir);

  if (existsSync(repoDir)) {
    rmSync(repoDir, { recursive: true, force: true });
  }

  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, repositoryUrl, repoDir], {
    cwd: appDir,
    stdio: "inherit",
  });
}

function getInstalledCommit(repoDir) {
  return execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], {
    cwd: appDir,
    encoding: "utf8",
  }).trim();
}

function readInstalledManifest(repoDir, approvedManifest) {
  const repoManifestPath = path.join(repoDir, "interopmed.module.json");

  if (!existsSync(repoManifestPath)) {
    throw new Error(`Installed repo is missing interopmed.module.json: ${relativeToApp(repoManifestPath)}`);
  }

  const installedManifest = readJson(repoManifestPath);
  if (installedManifest.moduleId !== approvedManifest.moduleId) {
    throw new Error(
      `Installed manifest moduleId mismatch: expected ${approvedManifest.moduleId}, got ${installedManifest.moduleId}`
    );
  }
  if (installedManifest.repositoryUrl !== approvedManifest.repositoryUrl) {
    throw new Error(
      `Installed manifest repositoryUrl mismatch: expected ${approvedManifest.repositoryUrl}, got ${installedManifest.repositoryUrl}`
    );
  }

  return installedManifest;
}

function setup() {
  const registry = loadRegistry();
  const state = loadState();
  saveState(state);
  console.log(`SHIN Node ready: ${state.nodeId}`);
  console.log(`Organization: ${state.organization.name}`);
  console.log(`Approved modules: ${registry.manifests.length}`);
  console.log(`State: ${path.relative(appDir, statePath)}`);
}

function listInstalled() {
  const state = loadState();
  if (state.installedModules.length === 0) {
    console.log("No modules installed.");
    return;
  }

  for (const moduleState of state.installedModules) {
    const installPath = moduleState.installPath ? ` path=${moduleState.installPath}` : "";
    console.log(`${moduleState.moduleId} ${moduleState.manifestVersion} ${moduleState.status} ${moduleState.ref}${installPath}`);
  }
}

function listAvailable() {
  const registry = loadRegistry();
  const state = loadState();

  for (const manifest of registry.manifests) {
    const installState = findInstallState(state, manifest.moduleId);
    const dependencies = manifest.dependencies?.length ? manifest.dependencies.join(",") : "none";
    console.log(`${manifest.moduleId} ${manifest.version} ${installState?.status ?? "available"} deps=${dependencies}`);
  }
}

async function installModule(args) {
  const { values, flags } = parseArgs(args);
  const repositoryUrl = values[0];
  const requestedRef = flags.ref ?? values[1];

  if (!repositoryUrl) {
    throw new Error("Usage: npm run modules:install -- <repositoryUrl> --ref <ref>");
  }

  const registry = loadRegistry();
  const state = loadState();
  const manifest = findManifestByRepo(registry, repositoryUrl);
  if (!manifest) {
    throw new Error(`No approved manifest found for repository: ${repositoryUrl}`);
  }

  const source = findApprovedSource(registry, manifest);
  if (!source) {
    throw new Error(`Repository is not approved for module ${manifest.moduleId}: ${repositoryUrl}`);
  }

  const ref = requestedRef ?? source.defaultRef ?? source.allowedRefs.find((allowedRef) => !allowedRef.startsWith("v")) ?? source.allowedRefs[0] ?? "main";
  assertRefAllowed(source, ref);
  const missing = missingDependencies(state, manifest);
  if (missing.length > 0) {
    throw new Error(`Missing module dependencies for ${manifest.moduleId}: ${missing.join(", ")}`);
  }

  const { moduleDir, repoDir, manifestPath } = moduleInstallPaths(manifest.moduleId);
  mkdirSync(moduleDir, { recursive: true });
  cloneRepository(repositoryUrl, ref, repoDir);

  const installedManifest = readInstalledManifest(repoDir, manifest);
  writeJson(manifestPath, installedManifest);
  const appliedMigrations = await applyModuleMigrations(installedManifest.moduleId, repoDir, installedManifest);
  const commit = getInstalledCommit(repoDir);
  const now = new Date().toISOString();
  const existing = findInstallState(state, manifest.moduleId);
  const moduleState = {
    id: existing?.id ?? `module-${manifest.moduleId}`,
    moduleId: installedManifest.moduleId,
    name: installedManifest.name,
    manifestVersion: installedManifest.version,
    repositoryUrl,
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

  addAudit(state, "module-install", {
    moduleId: installedManifest.moduleId,
    repositoryUrl,
    ref,
    commit,
    installPath: moduleState.installPath,
    manifestPath: moduleState.manifestPath,
  });
  saveState(state);
  console.log(`Installed ${installedManifest.name} from ${repositoryUrl} @ ${ref}`);
  console.log(`Repo: ${moduleState.installPath}`);
  console.log(`Manifest: ${moduleState.manifestPath}`);
  if (appliedMigrations.length > 0) {
    console.log(`Database migrations: ${appliedMigrations.join(", ")}`);
  }
  console.log("Next: npm run modules:enable --", installedManifest.moduleId);
}

async function setModuleStatus(moduleId, status) {
  const state = loadState();
  const moduleState = findInstallState(state, moduleId);

  if (!moduleState) {
    throw new Error(`Module is not installed: ${moduleId}`);
  }

  if (status === "enabled" && moduleState.installPath && moduleState.manifestPath) {
    const repoDir = path.join(appDir, moduleState.installPath);
    const installedManifest = readJson(path.join(appDir, moduleState.manifestPath));
    const appliedMigrations = await applyModuleMigrations(moduleId, repoDir, installedManifest);
    if (appliedMigrations.length > 0) {
      console.log(`Database migrations: ${appliedMigrations.join(", ")}`);
    }
  }

  moduleState.status = status;
  moduleState.updatedAt = new Date().toISOString();
  if (status === "enabled") {
    moduleState.enabledAt = moduleState.updatedAt;
  }
  if (status === "disabled") {
    moduleState.disabledAt = moduleState.updatedAt;
  }

  addAudit(state, `module-${status}`, { moduleId });
  saveState(state);
  console.log(`${moduleId} is now ${status}`);
}

function uninstallModule(moduleId) {
  const state = loadState();
  const moduleState = findInstallState(state, moduleId);

  if (!moduleState) {
    throw new Error(`Module is not installed: ${moduleId}`);
  }

  const { moduleDir } = moduleInstallPaths(moduleId);
  if (existsSync(moduleDir)) {
    rmSync(moduleDir, { recursive: true, force: true });
  }

  state.installedModules = state.installedModules.filter((installed) => installed.moduleId !== moduleId);
  addAudit(state, "module-uninstall", { moduleId, installPath: moduleState.installPath });
  saveState(state);
  console.log(`${moduleId} is now uninstalled`);
}

function health() {
  const registry = loadRegistry();
  const state = loadState();
  const installedIds = new Set(state.installedModules.map((installed) => installed.moduleId));
  const enabled = state.installedModules.filter((installed) => installed.status === "enabled").length;

  console.log(`Node: ${state.nodeId}`);
  console.log(`Organization: ${state.organization.name}`);
  console.log(`Platform version: ${state.platformVersion}`);
  console.log(`Approved modules: ${registry.manifests.length}`);
  console.log(`Installed modules: ${state.installedModules.length}`);
  console.log(`Enabled modules: ${enabled}`);

  for (const manifest of registry.manifests) {
    const missing = (manifest.dependencies ?? []).filter((moduleId) => !installedIds.has(moduleId));
    if (missing.length > 0 && installedIds.has(manifest.moduleId)) {
      console.log(`WARN ${manifest.moduleId} missing dependencies: ${missing.join(", ")}`);
    }
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "setup":
      setup();
      break;
    case "modules:list":
      listInstalled();
      break;
    case "modules:available":
      listAvailable();
      break;
    case "modules:install":
      await installModule(args);
      break;
    case "modules:enable":
      await setModuleStatus(args[0], "enabled");
      break;
    case "modules:disable":
      await setModuleStatus(args[0], "disabled");
      break;
    case "modules:uninstall":
      uninstallModule(args[0]);
      break;
    case "modules:health":
      health();
      break;
    default:
      console.log("Usage: node scripts/shin-node.mjs <setup|modules:list|modules:available|modules:install|modules:enable|modules:disable|modules:uninstall|modules:health>");
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
