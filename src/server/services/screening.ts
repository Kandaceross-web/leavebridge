import "server-only";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Ctx } from "../db/actor";
import type { DbOrTx } from "../db/client";
import { jurisdictions, organizations, safetyEvents, screeningRulesets, screenings } from "../db/schema";
import { decryptJson, encryptJson, hmac, randomToken } from "../crypto";
import { audit } from "../audit";
import { env } from "../env";
import { getSetting } from "../settings";
import { activeJurisdictionCodes } from "./jurisdiction";
import {
  emergencyTriggered,
  evaluate,
  rulesetSchema,
  validateStep,
  type Answers,
  type EvalEnv,
  type RulesetDefinition,
} from "@/domain/screening/engine";
import { invalid } from "@/domain/errors";

export const SCREENING_COOKIE = "lb_screening";
export const REFERRAL_COOKIE = "lb_ref";

export interface LoadedRuleset {
  id: string;
  version: number;
  def: RulesetDefinition;
}

/** Published ruleset with state questions populated from the jurisdiction table. */
export async function publishedRuleset(tx: DbOrTx): Promise<LoadedRuleset> {
  const [row] = await tx.select().from(screeningRulesets).where(eq(screeningRulesets.status, "published")).orderBy(desc(screeningRulesets.version)).limit(1);
  if (!row) throw new Error("No published screening ruleset");
  const def = rulesetSchema.parse(row.definition);
  const states = await tx.select({ code: jurisdictions.code, name: jurisdictions.name }).from(jurisdictions).orderBy(jurisdictions.name);
  def.questions = def.questions.map((q) => (q.kind === "state" ? { ...q, options: states.map((s) => ({ value: s.code, label: s.name })) } : q));
  return { id: row.id, version: row.version, def };
}

async function rulesetById(tx: DbOrTx, id: string): Promise<LoadedRuleset> {
  const [row] = await tx.select().from(screeningRulesets).where(eq(screeningRulesets.id, id)).limit(1);
  if (!row) throw new Error("Ruleset missing");
  const def = rulesetSchema.parse(row.definition);
  const states = await tx.select({ code: jurisdictions.code, name: jurisdictions.name }).from(jurisdictions).orderBy(jurisdictions.name);
  def.questions = def.questions.map((q) => (q.kind === "state" ? { ...q, options: states.map((s) => ({ value: s.code, label: s.name })) } : q));
  return { id: row.id, version: row.version, def };
}

export async function evalEnv(tx: DbOrTx): Promise<EvalEnv> {
  return { activeStates: await activeJurisdictionCodes(tx), today: new Date() };
}

export type ScreeningRow = typeof screenings.$inferSelect;

export async function currentScreening(ctx: Ctx): Promise<ScreeningRow | null> {
  const jar = await cookies();
  const token = jar.get(SCREENING_COOKIE)?.value;
  if (!token) return null;
  const [row] = await ctx.tx.select().from(screenings).where(eq(screenings.tokenHash, hmac(`screening:${token}`))).limit(1);
  if (!row || row.expiresAt.getTime() < Date.now() || row.status === "expired") return null;
  return row;
}

/** Creates a screening row. Cookie handling stays in startScreening so this also runs outside a request. */
export async function createScreening(ctx: Ctx, refCode: string | null): Promise<{ row: ScreeningRow; token: string; maxAgeSeconds: number }> {
  const ruleset = await publishedRuleset(ctx.tx);
  const retention = await getSetting(ctx.tx, "retention");
  const token = randomToken(32);
  let referralOrganizationId: string | null = null;
  if (refCode && /^[a-z0-9-]{3,40}$/i.test(refCode)) {
    const [org] = await ctx.tx.select({ id: organizations.id }).from(organizations).where(and(sql`lower(${organizations.referralCode}) = lower(${refCode})`, eq(organizations.active, true))).limit(1);
    referralOrganizationId = org?.id ?? null;
  }
  const [row] = await ctx.tx
    .insert(screenings)
    .values({
      tokenHash: hmac(`screening:${token}`),
      rulesetId: ruleset.id,
      answers: encryptJson({}),
      referralOrganizationId,
      expiresAt: new Date(Date.now() + retention.abandonedScreeningDays * 86_400_000),
    })
    .returning();
  return { row: row!, token, maxAgeSeconds: retention.abandonedScreeningDays * 86400 };
}

export async function startScreening(ctx: Ctx): Promise<ScreeningRow> {
  const jar = await cookies();
  const { row, token, maxAgeSeconds } = await createScreening(ctx, jar.get(REFERRAL_COOKIE)?.value ?? null);
  jar.set(SCREENING_COOKIE, token, { httpOnly: true, secure: env.APP_ORIGIN.startsWith("https://"), sameSite: "lax", path: "/", maxAge: maxAgeSeconds });
  return row;
}

/** Re-reads a screening row (used after saving steps). */
export async function screeningById(ctx: Ctx, id: string): Promise<ScreeningRow> {
  const [row] = await ctx.tx.select().from(screenings).where(eq(screenings.id, id)).limit(1);
  if (!row) throw new Error("Screening not found");
  return row;
}

export async function clearScreeningCookie() {
  const jar = await cookies();
  jar.delete(SCREENING_COOKIE);
}

export async function screeningState(ctx: Ctx, row: ScreeningRow) {
  const ruleset = await rulesetById(ctx.tx, row.rulesetId);
  const answers = decryptJson<Answers>(row.answers, {});
  return { ruleset, answers };
}

/**
 * Saves one step. Emergency rules are checked immediately; if triggered, the screening ends and
 * the caller must show crisis content. Ordinary flow never continues past an emergency.
 */
export async function saveScreeningStep(ctx: Ctx, row: ScreeningRow, stepKey: string, raw: Record<string, string | string[]>) {
  if (row.status !== "in_progress") throw invalid("This screening is already complete.");
  const { ruleset, answers } = await screeningState(ctx, row);
  const stepIdx = ruleset.def.steps.findIndex((s) => s.key === stepKey);
  if (stepIdx < 0 || stepIdx > row.stepIndex) throw invalid("Please complete the earlier questions first.");
  const env = await evalEnv(ctx.tx);
  const { answers: merged, errors } = validateStep(ruleset.def, stepKey, raw, answers, env);
  if (Object.keys(errors).length) return { errors, done: false as const };

  const emergency = emergencyTriggered(ruleset.def, merged, env);
  const isLast = stepIdx === ruleset.def.steps.length - 1;
  if (emergency || isLast) {
    const result = emergency ? { outcome: "EMERGENCY" as const, reasonCodes: [emergency.reasonCode] } : evaluate(ruleset.def, merged, env);
    await ctx.tx
      .update(screenings)
      .set({
        answers: encryptJson(merged),
        outcome: result.outcome,
        reasonCodes: result.reasonCodes,
        status: "completed",
        completedAt: new Date(),
        stateCode: typeof merged["appointment_state"] === "string" ? merged["appointment_state"] : null,
        stepIndex: stepIdx,
      })
      .where(eq(screenings.id, row.id));
    await audit(ctx, { action: "screening.completed", subjectType: "screening", subjectId: row.id, metadata: { outcome: result.outcome, rulesetVersion: ruleset.version } });
    if (result.outcome === "EMERGENCY") {
      await ctx.tx.insert(safetyEvents).values({ source: "screening", screeningId: row.id, rule: emergency?.id ?? "emergency" });
      await audit(ctx, { action: "screening.emergency_routed", subjectType: "screening", subjectId: row.id });
    }
    return { errors: {}, done: true as const, outcome: result.outcome };
  }
  await ctx.tx.update(screenings).set({ answers: encryptJson(merged), stepIndex: Math.max(row.stepIndex, stepIdx + 1) }).where(eq(screenings.id, row.id));
  return { errors: {}, done: false as const, nextStep: ruleset.def.steps[stepIdx + 1]!.key };
}

/** Deletes answers from screenings that expired without becoming a case (retention: LEG-10). */
export async function purgeExpiredScreenings(ctx: Ctx): Promise<number> {
  const res = await ctx.tx
    .update(screenings)
    .set({ answers: null, status: "expired" })
    .where(and(lt(screenings.expiresAt, new Date()), sql`${screenings.status} in ('in_progress','completed')`, sql`${screenings.patientId} is null`))
    .returning({ id: screenings.id });
  return res.length;
}
