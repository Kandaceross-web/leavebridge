import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "../env";

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;
/** A transaction handle; domain functions accept either. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const globalForDb = globalThis as unknown as { __lbPool?: Pool; __lbDb?: Db };

function createPool() {
  return new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: env.APP_ENV === "production" || env.APP_ENV === "staging" ? { rejectUnauthorized: true } : undefined,
  });
}

export const pool: Pool = globalForDb.__lbPool ?? createPool();
export const db: Db = globalForDb.__lbDb ?? drizzle(pool, { schema });

if (env.APP_ENV !== "production") {
  globalForDb.__lbPool = pool;
  globalForDb.__lbDb = db;
}

export { schema };
