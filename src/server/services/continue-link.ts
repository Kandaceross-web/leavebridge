import "server-only";
import { eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import { screeningContinueLinks, screenings } from "../db/schema";
import { hmac, randomToken } from "../crypto";
import { env } from "../env";
import { log } from "../logger";
import { messageProvider } from "../providers/messaging";
import { rateLimit } from "../rate-limit";
import { getSetting } from "../settings";
import type { ScreeningRow } from "./screening";
import { DomainError, invalid } from "@/domain/errors";

/**
 * "Email me a link to continue" (OWN-25, owner answer Q48): someone who finished screening and can
 * continue, but is not ready to create an account, can ask for one email with a single-use link
 * that restores their screening in whatever browser opens it.
 *
 * The address is used for that one send and never stored: the table keeps only the token's HMAC,
 * the screening and the expiry. The email carries the brand, the link and the expiry; never an
 * answer, an outcome or health or leave wording. No reminders or marketing follow.
 */
export const CONTINUE_LINK_EMAIL_KEY = "screening_continue_link";

/** Links last at most this long, and never past the screening's own expiry (retention setting). */
export const CONTINUE_LINK_MAX_DAYS = 7;

/** Outcomes that lead on to sign-up (the same list the sign-up page accepts). */
const CONTINUING_OUTCOMES = ["AVAILABLE", "NEEDS_REVIEW"];

const DAY_MS = 86_400_000;

export const continueLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
});

const tokenHash = (token: string) => hmac(`continue:${token}`);

/** True when the screening can still lead to an account (and so is worth a link back to it). */
export function canContinue(row: ScreeningRow | null, now = Date.now()): row is ScreeningRow {
  return (
    !!row &&
    row.status === "completed" &&
    CONTINUING_OUTCOMES.includes(row.outcome ?? "") &&
    row.patientId === null &&
    row.expiresAt.getTime() > now
  );
}

/** "in 7 days" / "in 1 day" / "within a day": how the email and the page state the expiry. */
export function expiryPhrase(expiresAt: Date, now = Date.now()): string {
  const days = Math.floor((expiresAt.getTime() - now) / DAY_MS);
  return days >= 1 ? `in ${days} ${days === 1 ? "day" : "days"}` : "within a day";
}

const linkExpiry = (row: ScreeningRow, now: number) => new Date(Math.min(now + CONTINUE_LINK_MAX_DAYS * DAY_MS, row.expiresAt.getTime()));

/** For the result page: how long a link sent now would last, or null when no link is offered. */
export function continueLinkOffer(row: ScreeningRow | null): string | null {
  const now = Date.now();
  return canContinue(row, now) ? expiryPhrase(linkExpiry(row, now), now) : null;
}

/** The one email. Neutral: the brand, the link and its expiry; nothing about the person or their answers. */
export function continueLinkEmail(brandName: string, link: string, expires: string): { subject: string; body: string } {
  return {
    subject: `Your link to continue with ${brandName}`,
    body: [
      `Here is the link you asked for. It takes you back to where you left off, so you can create your account without answering the questions again:`,
      link,
      `The link works once and expires ${expires}. After that, you can start again at ${env.APP_ORIGIN}/start.`,
      `You are receiving this because this address was entered on our website to request the link. We did not keep the address, and this is the only email we will send about it.`,
    ].join("\n\n"),
  };
}

/**
 * Emails one continue link for the current screening, replacing any earlier unused link. Rate
 * limited per screening. If the email cannot be sent the transaction rolls back, so nothing is kept.
 */
export async function sendContinueLink(ctx: Ctx, row: ScreeningRow | null, input: unknown): Promise<{ expires: string }> {
  if (!canContinue(row)) throw invalid("Your answers have expired for your privacy. Please start again.");
  const { email } = continueLinkSchema.parse(input);
  await rateLimit("continueLink", row.id);

  const now = Date.now();
  const expiresAt = linkExpiry(row, now);
  const token = randomToken(32);
  // Only the newest link works: a second request (say, after a typo) cancels the first.
  await ctx.tx.delete(screeningContinueLinks).where(eq(screeningContinueLinks.screeningId, row.id));
  await ctx.tx.insert(screeningContinueLinks).values({ tokenHash: tokenHash(token), screeningId: row.id, expiresAt });

  const brand = await getSetting(ctx.tx, "brand");
  const expires = expiryPhrase(expiresAt, now);
  const { subject, body } = continueLinkEmail(brand.name, `${env.APP_ORIGIN}/start/continue/${token}`, expires);
  try {
    await messageProvider("email").send({ channel: "email", to: email, subject, body, templateKey: CONTINUE_LINK_EMAIL_KEY });
  } catch (err) {
    log.error("continue link email failed", err, { event: CONTINUE_LINK_EMAIL_KEY, provider: "email" });
    throw new DomainError("invalid", "We couldn't send the email just now, so nothing was saved. Please try again in a few minutes.");
  }
  log.info("continue link sent", { event: CONTINUE_LINK_EMAIL_KEY });
  return { expires };
}

const wellFormed = (token: string) => /^[A-Za-z0-9_-]{20,100}$/.test(token);

async function linkedScreening(ctx: Ctx, screeningId: string): Promise<ScreeningRow | null> {
  const [row] = await ctx.tx.select().from(screenings).where(eq(screenings.id, screeningId)).limit(1);
  return row ?? null;
}

/** Whether a link would still work, without using it (the page shows a button before redeeming). */
export async function continueLinkUsable(ctx: Ctx, token: string): Promise<boolean> {
  if (!wellFormed(token)) return false;
  const [link] = await ctx.tx.select().from(screeningContinueLinks).where(eq(screeningContinueLinks.tokenHash, tokenHash(token))).limit(1);
  if (!link || link.expiresAt.getTime() <= Date.now()) return false;
  return canContinue(await linkedScreening(ctx, link.screeningId));
}

/**
 * Uses a link once: deletes it, then gives the screening a fresh browser token (the screening's
 * cookie token is only stored as a hash, so the old one cannot be handed out). Returns null for an
 * unknown, used or expired link. The caller sets the cookie.
 */
export async function redeemContinueLink(ctx: Ctx, token: string): Promise<{ cookieToken: string; maxAgeSeconds: number } | null> {
  if (!wellFormed(token)) return null;
  // Delete-and-return is the single use: of two simultaneous clicks, only one gets the row.
  const [link] = await ctx.tx.delete(screeningContinueLinks).where(eq(screeningContinueLinks.tokenHash, tokenHash(token))).returning();
  if (!link) return null;
  const now = Date.now();
  if (link.expiresAt.getTime() <= now) return null;
  const row = await linkedScreening(ctx, link.screeningId);
  if (!canContinue(row, now)) return null;
  const cookieToken = randomToken(32);
  await ctx.tx.update(screenings).set({ tokenHash: hmac(`screening:${cookieToken}`) }).where(eq(screenings.id, row.id));
  log.info("continue link used", { event: CONTINUE_LINK_EMAIL_KEY });
  return { cookieToken, maxAgeSeconds: Math.floor((row.expiresAt.getTime() - now) / 1000) };
}

/** Deletes expired links (purge-screenings job). Used links are already gone. */
export async function purgeExpiredContinueLinks(ctx: Ctx): Promise<number> {
  const res = await ctx.tx.delete(screeningContinueLinks).where(lt(screeningContinueLinks.expiresAt, new Date())).returning({ id: screeningContinueLinks.id });
  return res.length;
}
