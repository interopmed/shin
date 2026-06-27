import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const rootDir = process.cwd();
const statePath = path.join(rootDir, ".shin-node", "state.json");
const registryPath = path.join(rootDir, "config", "approved-modules.json");

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);

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

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function withClient(connectionString, task) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await task(client);
  } finally {
    await client.end();
  }
}

async function ensureDatabase(databaseUrl, adminUrl) {
  if (!adminUrl) {
    return;
  }

  const target = new URL(databaseUrl);
  const databaseName = target.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("SHIN_DATABASE_URL must include a database name.");
  }

  await withClient(adminUrl, async (client) => {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
      console.log(`Created PostgreSQL database ${databaseName}`);
    } else {
      console.log(`PostgreSQL database ${databaseName} already exists`);
    }
  });
}

async function runSqlFile(databaseUrl, fileName) {
  const sql = readFileSync(path.join(rootDir, "db", fileName), "utf8");

  await withClient(databaseUrl, async (client) => {
    await client.query(sql);
  });

  console.log(`Applied ${fileName}`);
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPathInside(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to read module migration outside module root: ${childPath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function localModuleRoot(moduleId) {
  const candidate = path.resolve(rootDir, "..", `shin-${moduleId}`);
  return existsSync(candidate) ? candidate : null;
}

async function applyModuleMigrations(databaseUrl) {
  if (!existsSync(statePath)) {
    console.log("No SHIN state file found; no installed modules to migrate.");
    return;
  }

  const state = readJson(statePath);
  const registry = readJson(registryPath);

  await withClient(databaseUrl, async (client) => {
    await client.query(readFileSync(path.join(rootDir, "db", "schema.sql"), "utf8"));

    for (const installed of state.installedModules ?? []) {
      const installedManifestPath = installed.manifestPath ? path.join(rootDir, installed.manifestPath) : null;
      const installedManifest = installedManifestPath && existsSync(installedManifestPath) ? readJson(installedManifestPath) : {};
      const approvedManifest = (registry.manifests ?? []).find((manifest) => manifest.moduleId === installed.moduleId) ?? {};
      const manifest = { ...approvedManifest, ...installedManifest, database: installedManifest.database ?? approvedManifest.database };
      const migrations = manifest.database?.migrations ?? [];

      if (migrations.length === 0) {
        continue;
      }

      const installedRoot = installed.installPath ? path.join(rootDir, installed.installPath) : null;
      const fallbackRoot = localModuleRoot(installed.moduleId);
      const moduleRoot =
        installedRoot && migrations.every((migration) => existsSync(path.resolve(installedRoot, migration)))
          ? installedRoot
          : fallbackRoot;

      if (!moduleRoot) {
        throw new Error(`Cannot locate migration files for installed module ${installed.moduleId}`);
      }

      for (const migrationPath of migrations) {
        const fullPath = path.resolve(moduleRoot, migrationPath);
        assertPathInside(moduleRoot, fullPath);

        if (!existsSync(fullPath)) {
          throw new Error(`Module migration not found for ${installed.moduleId}: ${migrationPath}`);
        }

        const sql = readFileSync(fullPath, "utf8");
        const sqlChecksum = checksum(sql);
        const existing = await client.query("SELECT checksum FROM shin_module_migrations WHERE module_id = $1 AND migration_path = $2", [
          installed.moduleId,
          migrationPath,
        ]);

        if (existing.rowCount && existing.rows[0]?.checksum !== sqlChecksum) {
          throw new Error(`Module migration changed after being applied: ${installed.moduleId}:${migrationPath}`);
        }

        if (existing.rowCount) {
          console.log(`Skipped ${installed.moduleId}:${migrationPath}`);
          continue;
        }

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO shin_module_migrations (module_id, migration_path, checksum) VALUES ($1, $2, $3)", [
            installed.moduleId,
            migrationPath,
            sqlChecksum,
          ]);
          await client.query("COMMIT");
          console.log(`Applied ${installed.moduleId}:${migrationPath}`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    }
  });
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const databaseUrl = process.env.SHIN_DATABASE_URL ?? process.env.DATABASE_URL;
  const adminUrl = process.env.SHIN_DATABASE_ADMIN_URL;

  if (!databaseUrl) {
    throw new Error("Set SHIN_DATABASE_URL in shin/.env.local before running database setup.");
  }

  const command = process.argv[2] ?? "setup";

  if (command === "setup") {
    await ensureDatabase(databaseUrl, adminUrl);
    await runSqlFile(databaseUrl, "schema.sql");
    await runSqlFile(databaseUrl, "seed-patients.sql");
    console.log("SHIN PostgreSQL setup complete");
    return;
  }

  if (command === "modules") {
    await applyModuleMigrations(databaseUrl);
    console.log("SHIN module database migrations complete");
    return;
  }

  throw new Error("Usage: node scripts/shin-db.mjs [setup|modules]");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
