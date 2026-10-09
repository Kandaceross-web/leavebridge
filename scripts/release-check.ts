/**
 * Production release gate. Exits non-zero while anything that must be decided or replaced before
 * real patients use the system is still open. Run in CI before a production deploy:
 *
 *   APP_ENV=production DATABASE_URL=... npm run release:check
 *
 * It checks six things:
 *  1. docs/OPEN-DECISIONS.md: every row marked "Blocks production: Yes" must have status "Closed".
 *     The owner waived outside legal and security review on 2026-10-08, so LEG, CLN, STR and most SEC
 *     rows close with the owner's recorded sign-off. Technical rows (TECHNICAL below) close only with
 *     evidence: their status must read "Closed (date, who, evidence: ...)".
 *  2. Environment: production providers and secrets (the env loader refuses dev values).
 *  3. Database: no review tags on published or enabled configuration, no fixture accounts,
 *     every active state has an approved compliance review within 12 months.
 *  4. Settings: every setting whose default carries a review tag has an admin override with the
 *     tag cleared (meaning someone decided it).
 *  5. Good Faith Estimate (LEG-08): the provider NPI, TIN and service code are filled in, even when
 *     the setting's review tag was cleared, because every estimate a patient receives prints them.
 *  6. Automated security review (scripts/security-findings.ts): dependency audit, database role
 *     and row-level security, console logging, hard-coded secrets and tracking hosts.
 */
import { readFileSync } from "node:fs";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, pool } from "@/server/db/client";
import { complianceReviews, consentVersions, contentEntries, jurisdictions, notificationTemplates, questionnaires, screeningRulesets, services, settings, users } from "@/server/db/schema";
import { SETTING_DEFS, SETTING_KEYS } from "@/config/settings";
import { getSetting } from "@/server/settings";
import { ESTIMATE_OWNER_FIELDS, missingEstimateFields } from "@/domain/payments/good-faith-estimate";
import { securityFindings } from "./security-findings";

/** Rows that an acknowledgement cannot close: they need proof that something was done. */
export const TECHNICAL = ["SEC-09", "SEC-10", "SEC-14"];

interface Finding {
  area: string;
  item: string;
  detail: string;
}

const accepted: string[] = [];

function openDecisions(): Finding[] {
  const text = readFileSync("docs/OPEN-DECISIONS.md", "utf8");
  const out: Finding[] = [];
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // | ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
    if (cells.length < 8 || !/^(OWN|LEG|CLN|STR|SEC)-\d+/.test(cells[1] ?? "")) continue;
    const [, id, decision, , blocks, , , status] = cells;
    const key = id!.replace(/\s.*$/, "");
    if (!/^yes/i.test(blocks ?? "")) continue;
    if (!/^closed/i.test(status ?? "")) out.push({ area: "Open decision", item: key, detail: decision!.slice(0, 110) });
    else if (TECHNICAL.includes(key) && !/evidence:/i.test(status ?? "")) out.push({ area: "Open decision", item: key, detail: "technical item closed without evidence" });
    else if (/owner sign-off/i.test(status ?? "")) accepted.push(key);
  }
  return out;
}

async function envFindings(): Promise<Finding[]> {
  if (process.env.APP_ENV !== "production") return [{ area: "Environment", item: "APP_ENV", detail: `is "${process.env.APP_ENV ?? "development"}", not production; provider and secret checks were not applied` }];
  try {
    await import("@/server/env");
    return [];
  } catch (err) {
    return [{ area: "Environment", item: "configuration", detail: (err as Error).message }];
  }
}

async function dbFindings(): Promise<Finding[]> {
  const out: Finding[] = [];
  const tagged = async (label: string, rows: { name: string; tag: string | null }[]) => {
    for (const r of rows) if (r.tag) out.push({ area: label, item: r.name, detail: r.tag });
  };
  await tagged("Enabled service", (await db.select({ name: services.name, tag: services.reviewTag }).from(services).where(eq(services.enabled, true))));
  await tagged("Published consent", (await db.select({ name: sql<string>`'version ' || ${consentVersions.version} || ' of ' || ${consentVersions.documentId}`, tag: consentVersions.reviewTag }).from(consentVersions).where(eq(consentVersions.status, "published"))));
  await tagged("Published content", (await db.select({ name: contentEntries.key, tag: contentEntries.reviewTag }).from(contentEntries).where(eq(contentEntries.status, "published"))));
  await tagged("Active template", (await db.select({ name: sql<string>`${notificationTemplates.key} || ' (' || ${notificationTemplates.channel} || ')'`, tag: notificationTemplates.reviewTag }).from(notificationTemplates).where(eq(notificationTemplates.active, true))));
  await tagged("Published questionnaire", (await db.select({ name: questionnaires.key, tag: questionnaires.reviewTag }).from(questionnaires).where(and(eq(questionnaires.status, "published"), eq(questionnaires.enabled, true)))));
  await tagged("Published screening ruleset", (await db.select({ name: sql<string>`'v' || ${screeningRulesets.version}`, tag: screeningRulesets.reviewTag }).from(screeningRulesets).where(eq(screeningRulesets.status, "published"))));

  const fixtures = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.isFixture, true));
  if (Number(fixtures[0]?.n ?? 0) > 0) out.push({ area: "Data", item: "fixture accounts", detail: `${fixtures[0]!.n} fictional fixture users exist` });

  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const active = await db.select({ code: jurisdictions.code }).from(jurisdictions).where(eq(jurisdictions.isActive, true));
  for (const j of active) {
    const [r] = await db
      .select({ id: complianceReviews.id, notes: complianceReviews.notes })
      .from(complianceReviews)
      .where(and(eq(complianceReviews.subjectType, "jurisdiction"), eq(complianceReviews.subjectId, j.code), eq(complianceReviews.outcome, "approved"), gte(complianceReviews.reviewedOn, yearAgo)))
      .limit(1);
    if (!r) out.push({ area: "Active state", item: j.code, detail: "no approved compliance review in the last 12 months" });
    else if (/fixture/i.test(r.notes ?? "")) out.push({ area: "Active state", item: j.code, detail: "only a development fixture review exists" });
  }

  const overrides = await db.select().from(settings).where(isNotNull(settings.key));
  for (const key of SETTING_KEYS) {
    const def = SETTING_DEFS[key];
    if (!def.reviewTag) continue;
    const o = overrides.find((s) => s.key === key);
    if (!o || o.reviewTag) out.push({ area: "Setting", item: key, detail: `${o?.reviewTag ?? def.reviewTag}: ${def.reviewNote}` });
  }

  const gfe = await getSetting(db, "goodFaithEstimate");
  for (const field of missingEstimateFields(gfe)) out.push({ area: "Good Faith Estimate", item: field, detail: `${ESTIMATE_FIELD_LABEL[field]} is empty; every patient's written estimate must show it (LEG-08)` });
  return out;
}

const ESTIMATE_FIELD_LABEL: Record<(typeof ESTIMATE_OWNER_FIELDS)[number], string> = {
  providerNpi: "provider NPI",
  providerTin: "provider TIN",
  serviceCode: "service (CPT) code",
};

async function main() {
  const security = await securityFindings();
  const findings = [
    ...openDecisions(),
    ...(await envFindings()),
    ...(await dbFindings()),
    ...security.filter((f) => f.severity === "blocker").map((f) => ({ area: "Security", item: f.check, detail: f.detail })),
  ];
  for (const w of security.filter((f) => f.severity === "warning")) console.log(`Security warning (${w.check}): ${w.detail}`);
  if (accepted.length) console.log(`Closed by owner sign-off with outside review waived: ${accepted.join(", ")}. This records the owner's decision; it is not a legal or security review.`);
  if (!findings.length) {
    console.log("Release check passed: no open production blockers.");
    return;
  }
  console.log(`Release check FAILED: ${findings.length} open production blocker(s).\n`);
  const byArea = new Map<string, Finding[]>();
  for (const f of findings) byArea.set(f.area, [...(byArea.get(f.area) ?? []), f]);
  for (const [area, items] of byArea) {
    console.log(`${area} (${items.length})`);
    for (const f of items) console.log(`  - ${f.item}: ${f.detail}`);
  }
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 2;
  })
  .finally(() => pool.end());
