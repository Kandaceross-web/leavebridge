import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_OWNER_URL ?? "postgres://lb_owner:lb_owner_dev@localhost:5432/leavebridge" },
  strict: true,
  verbose: false,
});
