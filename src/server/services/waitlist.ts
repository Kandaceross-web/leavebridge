import "server-only";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { jurisdictions, waitlist, waitlistNotices } from "../db/schema";
import { messageProvider } from "../providers/messaging";
import { audit } from "../audit";
import { env } from "../env";
import { log } from "../logger";
import { getSetting } from "../settings";
import { unservedDemand } from "./acquisition";
import { actorUserId } from "../db/actor";
import { invalid } from "@/domain/errors";
import { requireRole } from "@/domain/policy";
import type { Role } from "@/domain/constants";

/**
 * State waitlist for the owner: where people are asking for care (to decide where to get licensed
 * next), and one "we now serve your state" email per address once a state is active. Addresses
 * never leave this module except to the email provider: the page gets counts, the audit event
 * gets the state and a count, and the rows are deleted after the email is sent.
 */
export const WAITLIST_ROLES: readonly Role[] = ["admin", "clinical_director"];

export const WAITLIST_EMAIL_KEY = "waitlist_state_open";

export interface WaitlistRow {
  code: string;
  name: string;
  isActive: boolean;
  /** Sign-ups in the period. */
  joined: number;
  /** Completed screenings stopped because the state is not served, in the period (acquisition report). */
  screenings: number;
  /** Everyone still waiting for this state, whenever they joined: who the email would go to. */
  waiting: number;
  lastNotice: { count: number; sentAt: Date } | null;
}

/** Waitlist and unserved-screening counts by state, most demand first. Counts only, never addresses. */
export async function waitlistDemand(ctx: Ctx, days: number): Promise<WaitlistRow[]> {
  requireRole(ctx.actor, WAITLIST_ROLES);
  const since = new Date(Date.now() - days * 86_400_000);
  const states = await ctx.tx.select({ code: jurisdictions.code, name: jurisdictions.name, isActive: jurisdictions.isActive }).from(jurisdictions);
  const joined = await ctx.tx.select({ code: waitlist.stateCode, n: sql<number>`count(*)::int` }).from(waitlist).where(gte(waitlist.createdAt, since)).groupBy(waitlist.stateCode);
  const waiting = await ctx.tx.select({ code: waitlist.stateCode, n: sql<number>`count(*)::int` }).from(waitlist).groupBy(waitlist.stateCode);
  const unserved = await unservedDemand(ctx, days);
  const notices = await ctx.tx.select().from(waitlistNotices).orderBy(desc(waitlistNotices.sentAt));
  const count = (rows: { code: string | null; n: number }[]) => new Map(rows.map((r) => [r.code, Number(r.n)]));
  const j = count(joined);
  const w = count(waiting);
  const u = count(unserved.map((r) => ({ code: r.state, n: r.n })));
  const last = new Map<string, { count: number; sentAt: Date }>();
  for (const n of notices) if (!last.has(n.stateCode)) last.set(n.stateCode, { count: n.recipientCount, sentAt: n.sentAt });

  return states
    .map((s) => ({ ...s, joined: j.get(s.code) ?? 0, screenings: u.get(s.code) ?? 0, waiting: w.get(s.code) ?? 0, lastNotice: last.get(s.code) ?? null }))
    .filter((r) => r.joined || r.screenings || r.waiting || r.lastNotice)
    .sort((a, b) => b.joined + b.screenings - (a.joined + a.screenings) || b.waiting - a.waiting || a.name.localeCompare(b.name));
}

/** The one email each waitlisted person receives. Neutral: no health wording beyond the brand name. */
export function waitlistEmail(brandName: string, stateName: string): { subject: string; body: string } {
  return {
    subject: `${brandName} is now available in ${stateName}`,
    body: [
      `${brandName} now serves people located in ${stateName}. If you are still interested, you can start here: ${env.APP_ORIGIN}/start?entry=waitlist`,
      `You asked us to tell you when we opened in ${stateName}. This is the only email we'll send about it.`,
    ].join("\n\n"),
  };
}

/**
 * Emails everyone waiting for an active state once, then deletes their rows (purpose fulfilled)
 * and records the state and count. Addresses whose email fails stay listed for a later retry.
 */
export async function notifyWaitlist(ctx: Ctx, stateCode: string): Promise<{ sent: number; failed: number }> {
  requireRole(ctx.actor, WAITLIST_ROLES);
  const [j] = await ctx.tx.select().from(jurisdictions).where(eq(jurisdictions.code, stateCode)).limit(1);
  if (!j) throw invalid("Unknown state.");
  if (!j.isActive) throw invalid(`${j.name} is not active yet, so there is nothing to announce.`);
  // Lock the state's rows so two people pressing the button cannot email anyone twice.
  const rows = await ctx.tx.select({ id: waitlist.id, email: waitlist.email }).from(waitlist).where(eq(waitlist.stateCode, stateCode)).for("update");
  if (!rows.length) throw invalid(`No one is waiting for ${j.name}.`);

  const brand = await getSetting(ctx.tx, "brand");
  const { subject, body } = waitlistEmail(brand.name, j.name);
  const sent: string[] = [];
  for (const r of rows) {
    const ok = await messageProvider("email")
      .send({ channel: "email", to: r.email, subject, body, templateKey: WAITLIST_EMAIL_KEY })
      .then(() => true)
      .catch((err) => {
        log.error("waitlist email failed", err, { event: WAITLIST_EMAIL_KEY, provider: "email" });
        return false;
      });
    if (ok) sent.push(r.id);
  }
  if (sent.length) {
    await ctx.tx.delete(waitlist).where(inArray(waitlist.id, sent));
    await ctx.tx.insert(waitlistNotices).values({ stateCode, recipientCount: sent.length, sentBy: actorUserId(ctx.actor) });
    await audit(ctx, { action: "waitlist.notified", subjectType: "jurisdiction", subjectId: stateCode, metadata: { state: stateCode, count: sent.length } });
  }
  log.info("waitlist notified", { event: WAITLIST_EMAIL_KEY, count: sent.length });
  return { sent: sent.length, failed: rows.length - sent.length };
}
