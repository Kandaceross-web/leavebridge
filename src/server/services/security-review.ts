import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import { auditEvents, complianceReviews, users } from "../db/schema";
import { audit, verifyAuditChain } from "../audit";
import { requireRole, requireStaffMfa } from "@/domain/policy";

/*
 * Monthly security review (SEC-13 safe default). The practice's Security Official looks over the
 * audit log and the access-grants page once a month and records that here. The record is an audit
 * event (`security_review.completed`) holding counts only; the optional note goes to
 * compliance_reviews, because audit metadata is references and short codes, never free text.
 */

export const SECURITY_REVIEW_ROLES = ["admin", "compliance", "clinical_director"] as const;
export const SECURITY_REVIEW_INTERVAL_DAYS = 30;
const DAY_MS = 86_400_000;

export interface SecurityReviewStatus {
  lastReviewAt: Date | null;
  /** True when no review has been recorded in the last 30 days (or ever). */
  due: boolean;
}

/** When the last monthly security review was recorded, and whether one is due. */
export async function securityReviewStatus(ctx: Ctx, now = new Date()): Promise<SecurityReviewStatus> {
  requireRole(ctx.actor, SECURITY_REVIEW_ROLES);
  const [last] = await ctx.tx
    .select({ at: auditEvents.occurredAt })
    .from(auditEvents)
    .where(eq(auditEvents.action, "security_review.completed"))
    .orderBy(desc(auditEvents.id))
    .limit(1);
  const lastReviewAt = last?.at ?? null;
  return { lastReviewAt, due: !lastReviewAt || now.getTime() - lastReviewAt.getTime() > SECURITY_REVIEW_INTERVAL_DAYS * DAY_MS };
}

export interface SecurityReviewSummary {
  since: Date;
  emergencyAccessApproved: number;
  emergencyAccessSelfApproved: number;
  emergencyAccessUses: number;
  failedSignIns: number;
  lockouts: number;
  /** Id of the first audit row that fails hash-chain verification, or null when the chain is intact. */
  chainBrokenAt: number | null;
}

/** Counts from the audit log for the last 30 days, plus the tamper check. No patient data. */
export async function securityReviewSummary(ctx: Ctx, now = new Date()): Promise<SecurityReviewSummary> {
  requireRole(ctx.actor, SECURITY_REVIEW_ROLES);
  requireStaffMfa(ctx.actor);
  const since = new Date(now.getTime() - SECURITY_REVIEW_INTERVAL_DAYS * DAY_MS);
  const n = (cond: ReturnType<typeof sql>) => sql<number>`count(*) filter (where ${cond})::int`;
  const [row] = await ctx.tx
    .select({
      approved: n(sql`${auditEvents.action} = 'access_grant.created' and ${auditEvents.metadata}->>'state' = 'approved'`),
      selfApproved: n(sql`${auditEvents.action} = 'access_grant.created' and ${auditEvents.metadata}->>'state' = 'approved' and ${auditEvents.metadata}->>'selfApproved' = 'true'`),
      uses: n(sql`${auditEvents.action} = 'access_grant.used'`),
      failed: n(sql`${auditEvents.action} = 'auth.sign_in_failed'`),
      locked: n(sql`${auditEvents.action} = 'auth.locked'`),
    })
    .from(auditEvents)
    .where(and(gte(auditEvents.occurredAt, since), inArray(auditEvents.action, ["access_grant.created", "access_grant.used", "auth.sign_in_failed", "auth.locked"])));
  return {
    since,
    emergencyAccessApproved: row?.approved ?? 0,
    emergencyAccessSelfApproved: row?.selfApproved ?? 0,
    emergencyAccessUses: row?.uses ?? 0,
    failedSignIns: row?.failed ?? 0,
    lockouts: row?.locked ?? 0,
    chainBrokenAt: await verifyAuditChain(ctx),
  };
}

export const securityReviewSchema = z.object({
  note: z.string().trim().max(500, "Keep the note under 500 characters."),
});

/** Records that the monthly review of the audit log and access grants was done. */
export async function recordSecurityReview(ctx: Ctx, input: z.input<typeof securityReviewSchema>) {
  requireRole(ctx.actor, SECURITY_REVIEW_ROLES);
  requireStaffMfa(ctx.actor);
  const { note } = securityReviewSchema.parse(input);
  const now = new Date();
  const summary = await securityReviewSummary(ctx, now);
  if (note) {
    const [u] = await ctx.tx.select({ email: users.email }).from(users).where(eq(users.id, ctx.actor.userId)).limit(1);
    const day = (d: Date) => d.toISOString().slice(0, 10);
    await ctx.tx.insert(complianceReviews).values({
      subjectType: "policy",
      subjectId: "monthly-security-review",
      reviewType: "security",
      reviewerName: u?.email ?? "Security Official",
      outcome: "approved",
      notes: note,
      reviewedOn: day(now),
      nextDueOn: day(new Date(now.getTime() + SECURITY_REVIEW_INTERVAL_DAYS * DAY_MS)),
      createdBy: ctx.actor.userId,
    });
  }
  await audit(ctx, {
    action: "security_review.completed",
    subjectType: "security_review",
    subjectId: "monthly",
    metadata: {
      days: SECURITY_REVIEW_INTERVAL_DAYS,
      emergencyAccessApproved: summary.emergencyAccessApproved,
      emergencyAccessSelfApproved: summary.emergencyAccessSelfApproved,
      emergencyAccessUses: summary.emergencyAccessUses,
      failedSignIns: summary.failedSignIns,
      lockouts: summary.lockouts,
      chainIntact: summary.chainBrokenAt === null,
      noteLength: note.length,
    },
  });
  return summary;
}
