/**
 * Applies database migrations as the schema owner (never as the runtime role).
 *
 *   npm run db:migrate                 # MIGRATION_DATABASE_URL or the local dev owner
 *   npm run db:migrate -- --test       # the local test database
 *
 * The runtime role "lb_app" is created NOLOGIN by the migration; giving it a login and password is
 * an infrastructure step (see docs/DATABASE.md), so credentials never live in migrations.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const DEV_OWNER = "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge";

export async function runMigrations(url: string) {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
}

async function main() {
  const test = process.argv.includes("--test");
  const appEnv = process.env.APP_ENV ?? "development";
  const url = test ? DEV_OWNER.replace(/\/leavebridge$/, "/leavebridge_test") : (process.env.MIGRATION_DATABASE_URL ?? DEV_OWNER);
  if (appEnv !== "development" && appEnv !== "test" && !process.env.MIGRATION_DATABASE_URL) {
    throw new Error("MIGRATION_DATABASE_URL is required outside development.");
  }
  await runMigrations(url);
  console.log(`Migrations applied (${test ? "test" : appEnv}).`);
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
