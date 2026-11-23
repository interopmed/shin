import { Pool } from "pg";

type PgGlobal = typeof globalThis & {
  shinPgPool?: Pool;
};

const DEFAULT_PROD_DB = 'postgresql://neondb_owner:npg_EOFUQmuan7q4@ep-empty-pine-be6stdlp-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export function getDatabaseUrl(): string | null {
  return process.env.SHIN_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.NODE_ENV === 'production' ? DEFAULT_PROD_DB : null);
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
