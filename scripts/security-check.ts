/** Runs the automated security review on its own: `npm run security:check`. */
import { pool } from "@/server/db/client";
import { securityFindings } from "./security-findings";

async function main() {
  const findings = await securityFindings();
  for (const f of findings) console.log(`${f.severity.toUpperCase()} ${f.check}: ${f.detail}`);
  const blockers = findings.filter((f) => f.severity === "blocker").length;
  console.log(blockers ? `Security check FAILED: ${blockers} blocker(s).` : `Security check passed with ${findings.length} warning(s).`);
  if (blockers) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 2;
  })
  .finally(() => pool.end());
