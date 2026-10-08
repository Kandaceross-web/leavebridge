import { execSync } from "node:child_process";

export default function globalSetup() {
  if (process.env.E2E_SKIP_RESET) return;
  // Fictional data only; db:reset refuses to run in staging/production.
  execSync("npm run -s db:reset", { stdio: "inherit" });
}
