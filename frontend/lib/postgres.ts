import { Pool } from "pg";

type PgGlobal = typeof globalThis & {
  shinPgPool?: Pool;
};

export function getDatabaseUrl(): string | null {
  return process.env.SHIN_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
}

export function getPgPool(): Pool | null {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    return null;
  }

  const globalForPg = globalThis as PgGlobal;
  globalForPg.shinPgPool ??= new Pool({ connectionString });

  return globalForPg.shinPgPool;
}
