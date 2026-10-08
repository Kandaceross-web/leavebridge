/**
 * Development only: drops every table, re-applies migrations and re-seeds.
 *
 *   npm run db:reset            # development database
 *   npm run db:reset -- --test  # test database (no seed)
 */
import { rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { Pool } from "pg";
import { runMigrations } from "./migrate";

const DEV_OWNER = "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge";

async function main() {
  const appEnv = process.env.APP_ENV ?? "development";
  if (appEnv !== "development" && appEnv !== "test") throw new Error("db:reset is for development only.");
  const test = process.argv.includes("--test");
  const url = test ? DEV_OWNER.replace(/\/leavebridge$/, "/leavebridge_test") : DEV_OWNER;
  const pool = new Pool({ connectionString: url, max: 1 });
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.end();
  await runMigrations(url);
  if (!test) {
    await rm(process.env.STORAGE_LOCAL_DIR ?? "./storage", { recursive: true, force: true });
    execFileSync("npx", ["tsx", "--conditions=react-server", "scripts/seed.ts"], { stdio: "inherit" });
  }
  console.log(`Reset complete (${test ? "test" : "development"}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
