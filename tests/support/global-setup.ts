import { Pool } from "pg";
import { runMigrations } from "../../scripts/migrate";

const OWNER = "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge_test";

/** Rebuilds the test database from migrations, then seeds reference data and fixture staff. */
export default async function setup() {
  process.env.APP_ENV = "test";
  process.env.DATABASE_URL = "postgres://lb_app:lb_app_dev@localhost:5432/leavebridge_test";
  const pool = new Pool({ connectionString: OWNER, max: 1 });
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.end();
  await runMigrations(OWNER);
  const { withActor } = await import("@/server/db/actor");
  const { seedReference, seedStaff } = await import("@/server/fixtures/reference");
  const { pool: appPool } = await import("@/server/db/client");
  await withActor({ kind: "system", reason: "test-setup" }, async (ctx) => {
    await seedReference(ctx);
    await seedStaff(ctx);
  });
  await appPool.end();
}
