import "server-only";
import { eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { automatedScreenings, patients, users } from "../db/schema";
import { getSetting } from "../settings";
import type { CaseRow } from "./cases";
import { invalid } from "@/domain/errors";

/**
 * What must be true before a Same-Day Mental Health Assessment can be paid for. Kept apart from
 * same-day.ts so the payments service can call it without an import cycle.
 */
export async function sameDayCheckoutBlocker(ctx: Ctx, row: CaseRow, opts: { ignoreAcknowledgement?: boolean } = {}): Promise<string | null> {
  const setting = await getSetting(ctx.tx, "sameDayScreening");
  if (!setting.enabled) return "The Same-Day Mental Health Assessment is not available right now.";
  if (row.status !== "started") return "This screening has already been paid for.";
  if (row.screeningReview === "pending") return "A clinician is reviewing a few of your answers before payment opens. We will email you when you can continue.";
  if (row.screeningReview === "declined") return "This screening can't continue. Please check your portal messages.";
  const [p] = await ctx.tx.select({ userId: patients.userId }).from(patients).where(eq(patients.id, row.patientId)).limit(1);
  const [u] = p ? await ctx.tx.select({ verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, p.userId)).limit(1) : [];
  if (!u?.verifiedAt) return "Please confirm your email address first. We sent you a link.";
  const [s] = await ctx.tx.select().from(automatedScreenings).where(eq(automatedScreenings.caseId, row.id)).limit(1);
  if (!s) return "This screening could not be found.";
  if (!s.acknowledgedAt && !opts.ignoreAcknowledgement) return "Please confirm you understand what this screening is before paying.";
  return null;
}

export async function requireSameDayCheckout(ctx: Ctx, row: CaseRow) {
  const reason = await sameDayCheckoutBlocker(ctx, row);
  if (reason) throw invalid(reason);
}
