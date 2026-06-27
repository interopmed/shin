import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import { getPgPool } from "./postgres";

export type ModuleDatabaseManifest = {
  database?: {
    schema?: string;
    migrations?: string[];
  };
};

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertPathInside(parentDir: string, childPath: string) {
  const relative = path.relative(parentDir, childPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to read module migration outside installed module: ${childPath}`);
  }
}

async function ensureMigrationLedger(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS shin_module_migrations (
      module_id TEXT NOT NULL,
      migration_path TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (module_id, migration_path)
    )
  `);
}

export async function applyModuleMigrations(options: {
  moduleId: string;
  moduleRoot: string;
  manifest: ModuleDatabaseManifest;
}) {
  const migrations = options.manifest.database?.migrations ?? [];
  if (migrations.length === 0) {
    return [];
  }

  const pool = getPgPool();
  if (!pool) {
    throw new Error(`Module ${options.moduleId} declares database migrations, but SHIN_DATABASE_URL is not configured.`);
  }

  const applied: string[] = [];
  const client = await pool.connect();

  try {
    await ensureMigrationLedger(client);

    for (const migrationPath of migrations) {
      const fullPath = path.resolve(options.moduleRoot, migrationPath);
      assertPathInside(options.moduleRoot, fullPath);

      if (!existsSync(fullPath)) {
        throw new Error(`Module migration not found for ${options.moduleId}: ${migrationPath}`);
      }

      const sql = readFileSync(fullPath, "utf8");
      const sqlChecksum = checksum(sql);
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM shin_module_migrations WHERE module_id = $1 AND migration_path = $2",
        [options.moduleId, migrationPath]
      );

      if (existing.rowCount && existing.rows[0]?.checksum !== sqlChecksum) {
        throw new Error(`Module migration changed after being applied: ${options.moduleId}:${migrationPath}`);
      }

      if (existing.rowCount) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO shin_module_migrations (module_id, migration_path, checksum) VALUES ($1, $2, $3)",
          [options.moduleId, migrationPath, sqlChecksum]
        );
        await client.query("COMMIT");
        applied.push(migrationPath);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }

  return applied;
}
