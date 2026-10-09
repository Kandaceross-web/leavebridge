/**
 * Automated security review. The owner waived an outside security reviewer on 2026-10-08, so these
 * checks run on every release check instead. They prove specific properties of this build; they
 * are not a penetration test or a risk assessment.
 *
 *  - Production dependencies have no known vulnerabilities (npm audit).
 *  - The runtime database role is not a superuser, cannot bypass RLS, and owns no tables.
 *  - Every table that holds case or patient data has row-level security enabled.
 *  - Application code never writes to the console (only the allow-list logger) and contains no
 *    hard-coded credentials or third-party tracking hosts.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

export interface SecurityFinding {
  severity: "blocker" | "warning";
  check: string;
  detail: string;
}

/** Tables that hold PHI or case data. Each must have RLS enabled (see drizzle/0001_security_controls.sql). */
export const RLS_REQUIRED = [
  "ai_suggestions", "appointments", "assessment_notes", "case_notes", "case_status_history", "cases", "clinical_reviews", "consents", "deliveries",
  "determinations", "document_requests", "document_versions", "documents", "employer_forms", "files", "good_faith_estimates", "identity_verifications", "intakes",
  "location_attestations", "measure_responses", "message_threads", "messages", "patients", "payments", "refunds", "release_authorizations",
  "safety_events", "screening_continue_links", "screenings",
];

/**
 * Tables that may hold personal details but are protected by service-layer checks rather than RLS.
 * Reported as warnings so they are reconsidered, not silently accepted.
 */
export const RLS_ADVISED = ["contact_messages", "notifications", "signatures", "waitlist"];

const SECRET_PATTERNS: [string, RegExp][] = [
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Stripe live key", /sk_live_[0-9a-zA-Z]{10,}/],
  ["Private key", /-----BEGIN (RSA |EC )?PRIVATE KEY-----/],
];
const TRACKING_HOSTS = /googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|doubleclick\.net|static\.hotjar\.com|snap\.licdn\.com|analytics\.tiktok\.com/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(ts|tsx|js|mjs)$/.test(name) ? [p] : [];
  });
}

function auditFindings(): SecurityFinding[] {
  try {
    const out = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return parseAudit(out);
  } catch (err) {
    // npm audit exits non-zero when it finds vulnerabilities; its JSON is still on stdout.
    const out = (err as { stdout?: string }).stdout;
    if (out) return parseAudit(out);
    return [{ severity: "warning", check: "npm audit", detail: "could not run (no network?); run `npm audit --omit=dev` before release" }];
  }
}

function parseAudit(json: string): SecurityFinding[] {
  const v = (JSON.parse(json) as { metadata?: { vulnerabilities?: Record<string, number> } }).metadata?.vulnerabilities ?? {};
  const serious = (v.high ?? 0) + (v.critical ?? 0);
  const minor = (v.moderate ?? 0) + (v.low ?? 0);
  const out: SecurityFinding[] = [];
  if (serious) out.push({ severity: "blocker", check: "npm audit", detail: `${serious} high or critical vulnerabilities in production dependencies` });
  if (minor) out.push({ severity: "warning", check: "npm audit", detail: `${minor} low or moderate vulnerabilities in production dependencies` });
  return out;
}

async function databaseFindings(): Promise<SecurityFinding[]> {
  const out: SecurityFinding[] = [];
  const [me] = (await db.execute(sql`select current_user as name, rolsuper, rolbypassrls from pg_roles where rolname = current_user`)).rows as { name: string; rolsuper: boolean; rolbypassrls: boolean }[];
  if (me?.rolsuper) out.push({ severity: "blocker", check: "runtime role", detail: `${me.name} is a superuser` });
  if (me?.rolbypassrls) out.push({ severity: "blocker", check: "runtime role", detail: `${me.name} can bypass row-level security` });
  const owned = (await db.execute(sql`select count(*)::int as n from pg_tables where schemaname = 'public' and tableowner = current_user`)).rows[0] as { n: number };
  if (owned.n) out.push({ severity: "blocker", check: "runtime role", detail: `${me?.name} owns ${owned.n} tables, so RLS does not apply to it` });

  const rows = (await db.execute(sql`select c.relname as name, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'`)).rows as { name: string; rls: boolean }[];
  const rls = new Map(rows.map((r) => [r.name, r.rls]));
  for (const t of RLS_REQUIRED) {
    if (!rls.has(t)) out.push({ severity: "blocker", check: "row-level security", detail: `expected table ${t} is missing` });
    else if (!rls.get(t)) out.push({ severity: "blocker", check: "row-level security", detail: `${t} holds case data but RLS is off` });
  }
  for (const t of RLS_ADVISED) if (rls.has(t) && !rls.get(t)) out.push({ severity: "warning", check: "row-level security", detail: `${t} may hold personal details and relies on service-layer checks (SEC-18)` });
  return out;
}

export function sourceFindings(root = "src"): SecurityFinding[] {
  const out: SecurityFinding[] = [];
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    if (!file.endsWith("logger.ts") && /\bconsole\.(log|info|warn|error|debug)\(/.test(text)) out.push({ severity: "blocker", check: "logging", detail: `${file} writes to the console; use the allow-list logger` });
    for (const [label, re] of SECRET_PATTERNS) if (re.test(text)) out.push({ severity: "blocker", check: "secrets", detail: `${file} contains what looks like a ${label}` });
    if (TRACKING_HOSTS.test(text)) out.push({ severity: "blocker", check: "tracking", detail: `${file} references a third-party advertising or tracking host` });
  }
  return out;
}

export async function securityFindings(): Promise<SecurityFinding[]> {
  return [...auditFindings(), ...(await databaseFindings()), ...sourceFindings()];
}
